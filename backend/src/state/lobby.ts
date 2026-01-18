/**
 * LOBBY STATE MANAGEMENT
 * 
 * Server-side state for lobbies and players.
 * This is the single source of truth.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Lobby, Player, GameState, Song } from '../types/state.js';

const gameState: GameState = {
  lobbies: new Map(),
  userLobbies: new Map(),
};

/**
 * Generate 6-char alphanumeric room code (not guaranteed unique, but 17M combinations)
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createLobby(hostId: string, hostName: string, roomName: string): Lobby {
  const lobbyId = uuidv4();
  const roomCode = generateRoomCode();

  const lobby: Lobby = {
    id: lobbyId,
    code: roomCode,
    name: roomName,
    hostId,
    maxPlayers: 4,
    players: new Map(),
    createdAt: Date.now(),
    battle: {
      phase: 'LOBBY',
      battleStartTime: null,
      song: null,
      currentAudioChunks: new Map(),
    },
  };

  // Add host as first player
  const hostPlayer: Player = {
    id: hostId,
    name: hostName,
    ready: false,
    score: 0,
    combo: 0,
    accuracy: 0,
    connected: true,
    isHost: true,
    isLoaded: false
  };

  lobby.players.set(hostId, hostPlayer);

  // Store in game state
  gameState.lobbies.set(lobbyId, lobby);
  gameState.userLobbies.set(hostId, lobbyId);

  return lobby;
}

export function joinLobby(lobbyId: string, userId: string, userName: string): Lobby | null {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return null;

  // Already in lobby
  if (lobby.players.has(userId)) {
    return lobby;
  }

  // Lobby full
  if (lobby.players.size >= lobby.maxPlayers) {
    return null;
  }

  // Add player
  const player: Player = {
    id: userId,
    name: userName,
    ready: false,
    score: 0,
    combo: 0,
    accuracy: 0,
    connected: true,
    isHost: false,
    isLoaded: false
  };

  lobby.players.set(userId, player);
  gameState.userLobbies.set(userId, lobbyId);

  return lobby;
}

export function leaveLobby(lobbyId: string, userId: string): void {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return;

  lobby.players.delete(userId);
  gameState.userLobbies.delete(userId);

  // If host left, reassign to first remaining player
  if (lobby.hostId === userId && lobby.players.size > 0) {
    const newHost = lobby.players.values().next().value;
    if (newHost) {
      lobby.hostId = newHost.id;
      newHost.isHost = true;
    }
  }

  // Delete empty lobby
  if (lobby.players.size === 0) {
    gameState.lobbies.delete(lobbyId);
  }
}

export function setPlayerReady(lobbyId: string, userId: string, isReady: boolean): Lobby | null {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return null;

  const player = lobby.players.get(userId);
  if (!player) return null;

  player.ready = isReady;
  return lobby;
}

export function setPlayerLoaded(lobbyId: string, userId: string): { lobby: Lobby, allLoaded: boolean } | null {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return null;

  const player = lobby.players.get(userId);
  if (!player) return null;

  player.isLoaded = true;
  console.log(`[Lobby] Player ${userId} loaded song.`);

  // Check if ALL connected players are loaded
  let allLoaded = true;
  for (const p of lobby.players.values()) {
    if (p.connected && !p.isLoaded) {
      allLoaded = false;
      break;
    }
  }

  if (allLoaded) {
    // Transition to IN_BATTLE
    console.log(`[Lobby] All players loaded! Starting battle in 3s...`);
    lobby.battle.phase = 'IN_BATTLE';
    lobby.battle.battleStartTime = Date.now() + 3000; // 3 sec countdown
  }

  return { lobby, allLoaded };
}

export function updatePlayerScore(lobbyId: string, userId: string, batchScore: number, batchCombo: number, batchAccuracy: number): Lobby | null {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return null;

  const player = lobby.players.get(userId);
  if (!player) return null;

  // Accumulate score
  player.score += batchScore;

  // Rolling Average for Accuracy
  // (Simplified: decays old accuracy slightly less than 50/50 to be more stable, or count batches? 
  // For now: weighted average towards new if existing is 0, else 90/10)
  if (batchAccuracy > 0) {
    if (player.accuracy === 0) player.accuracy = batchAccuracy;
    else player.accuracy = (player.accuracy * 0.9) + (batchAccuracy * 0.1);
  }

  // Combo Logic:
  // If batch had hits (batchCombo > 0), increment player combo.
  // If batch had NO hits (and we expected some?), reset?
  // For now, let's just add the valid chunks count to combo for a "total hits" metric, 
  // OR treat it as a streak. 
  // Let's treat 'combo' in player state as 'current streak'.
  if (batchCombo > 0) {
    player.combo += batchCombo;
  } else {
    // If we processed chunks but got 0 valid ones... reset combo? 
    // Maybe not harsh for now. Let's just accumulate hits.
  }

  return lobby;
}

export function startBattle(lobbyId: string, song: Song): Lobby | null {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return null;

  // All players must be ready
  for (const player of lobby.players.values()) {
    if (!player.ready) return null;
  }

  // Set up battle state
  lobby.battle.phase = 'LOADING';
  lobby.battle.battleStartTime = null; // Waits for players to load
  lobby.battle.song = song; // Song includes metadata now

  // Reset player scores for new battle
  for (const player of lobby.players.values()) {
    player.score = 0;
    player.combo = 0;
    player.accuracy = 0;
  }

  return lobby;
}

export function setSong(lobbyId: string, song: Song): Lobby | null {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return null;

  lobby.battle.song = song;
  return lobby;
}

export function endBattle(lobbyId: string): Lobby | null {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return null;

  lobby.battle.phase = 'RESULTS';
  return lobby;
}

export function resetToLobby(lobbyId: string): Lobby | null {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return null;

  lobby.battle.phase = 'LOBBY';
  lobby.battle.battleStartTime = null;
  lobby.battle.song = null;
  lobby.battle.currentAudioChunks.clear();

  // Reset ready status for next round
  for (const player of lobby.players.values()) {
    player.ready = false;
    player.score = 0;
    player.combo = 0;
    player.accuracy = 0;
  }

  return lobby;
}

export function getLobby(lobbyId: string): Lobby | null {
  return gameState.lobbies.get(lobbyId) || null;
}

export function getLobbyByCode(code: string): Lobby | null {
  for (const lobby of gameState.lobbies.values()) {
    if (lobby.code === code) return lobby;
  }
  return null;
}

export function getUserLobby(userId: string): Lobby | null {
  const lobbyId = gameState.userLobbies.get(userId);
  if (!lobbyId) return null;
  return gameState.lobbies.get(lobbyId) || null;
}

export function addAudioChunk(lobbyId: string, userId: string, timestamp: number, audioData: string): void {
  const lobby = gameState.lobbies.get(lobbyId);
  if (!lobby) return;

  let buffer = lobby.battle.currentAudioChunks.get(userId);
  if (!buffer) {
    buffer = { chunks: [], scoreCalculated: false };
    lobby.battle.currentAudioChunks.set(userId, buffer);
  }

  buffer.chunks.push({ timestamp, audioData });
  buffer.scoreCalculated = false; // Mark for re-calculation

  // Update last audio time (for timeout detection)
  const player = lobby.players.get(userId);
  if (player) {
    player.lastAudioChunkTimestamp = Date.now();
  }
}

export function getGameState(): GameState {
  return gameState;
}

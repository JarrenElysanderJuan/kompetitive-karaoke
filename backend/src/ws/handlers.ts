/**
 * MESSAGE HANDLERS
 * 
 * Business logic for each message type.
 * Handlers are pure functions (no side effects on connections).
 */

import type { ServerMessage, CreateLobbyMessage, JoinLobbyMessage, JoinByCodeMessage, SetReadyMessage, StartBattleMessage, AudioChunkMessage, FinishBattleMessage, LeaveLobbyMessage, PlayerLoadedMessage } from '../types/messages.js';
import * as lobbyState from '../state/lobby.js';
import type { ClientConnection } from './connection.js';
import { sendMessage, broadcastToLobby, sendError } from './connection.js';
import fs from 'fs';
import path from 'path';
import { parseUltraStar } from '../services/ultraStarParser.js';

const SONGS_DIR = path.join(process.cwd(), 'songs');
export let LOADED_SONGS: any[] = [];

export function loadSongs() {
  try {
    if (!fs.existsSync(SONGS_DIR)) {
      console.log('[SongLoader] Creating songs directory...');
      fs.mkdirSync(SONGS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.txt'));
    LOADED_SONGS = files.map(f => {
      try {
        return parseUltraStar(path.join(SONGS_DIR, f));
      } catch (e) {
        console.error(`[SongLoader] Failed to parse ${f}:`, e);
        return null;
      }
    }).filter(s => s !== null);

    console.log(`[SongLoader] Loaded ${LOADED_SONGS.length} songs: ${LOADED_SONGS.map(s => s.name).join(', ')}`);

    // Fallback if no songs found (keep Twinkle as backup)
    if (LOADED_SONGS.length === 0) {
      console.log('[SongLoader] No songs found. Using default Twinkle Twinkle.');
      LOADED_SONGS.push({
        id: '1',
        name: 'Twinkle Twinkle (Default)',
        lyrics: ["Twinkle, twinkle, little star"],
        lineDurations: [4000],
        lineTimings: [0],
        duration: 16000,
        notes: [
          { pitch: 261.63, start: 0, duration: 500, lyric: 'Twin' },
          { pitch: 261.63, start: 570, duration: 500, lyric: 'kle' },
          { pitch: 392.00, start: 1140, duration: 500, lyric: 'Twin' },
          { pitch: 392.00, start: 1710, duration: 500, lyric: 'kle' },
          { pitch: 440.00, start: 2280, duration: 500, lyric: 'Lit' },
          { pitch: 440.00, start: 2850, duration: 500, lyric: 'tle' },
          { pitch: 392.00, start: 3420, duration: 1000, lyric: 'Star' },

          { pitch: 349.23, start: 4000, duration: 500, lyric: 'How' },
          { pitch: 349.23, start: 4570, duration: 500, lyric: 'I' },
          { pitch: 329.63, start: 5140, duration: 500, lyric: 'Won' },
          { pitch: 329.63, start: 5710, duration: 500, lyric: 'der' },
          { pitch: 293.66, start: 6280, duration: 500, lyric: 'What' },
          { pitch: 293.66, start: 6850, duration: 500, lyric: 'You' },
          { pitch: 261.63, start: 7420, duration: 1000, lyric: 'Are' },
        ]
      });
    }
  } catch (err) {
    console.error('[SongLoader] Error loading songs:', err);
  }
}

// Initial load
loadSongs();

// Watch for changes to hot-reload songs
let watchTimeout: NodeJS.Timeout | null = null;
try {
  fs.watch(SONGS_DIR, (eventType, filename) => {
    if (filename?.endsWith('.txt')) {
      // Debounce to avoid multiple triggers during save
      if (watchTimeout) clearTimeout(watchTimeout);
      watchTimeout = setTimeout(() => {
        console.log(`[SongLoader] File changed: ${filename}, reloading songs...`);
        loadSongs();
      }, 500);
    }
  });
} catch (e) {
  console.error('[SongLoader] Hot-reload watch failed:', e);
}

/**
 * Create lobby response
 */
function lobbyToMessage(lobby: ReturnType<typeof lobbyState.createLobby>): ServerMessage {
  const players = Array.from(lobby.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    ready: p.ready,
    score: p.score,
    combo: p.combo,
    accuracy: p.accuracy,
    isHost: p.isHost,
    connected: p.connected,
  }));

  return {
    type: 'LOBBY_SNAPSHOT' as const,
    roomId: lobby.id,
    roomCode: lobby.code,
    roomName: lobby.name,
    phase: lobby.battle.phase,
    hostId: lobby.hostId,
    maxPlayers: lobby.maxPlayers,
    players,
    song: lobby.battle.song ? {
      id: lobby.battle.song.id,
      name: lobby.battle.song.name,
      lyrics: lobby.battle.song.lyrics,
      lineDurations: lobby.battle.song.lineDurations,
      lineTimings: lobby.battle.song.lineTimings,
      mp3: lobby.battle.song.mp3,
    } : undefined,
    availableSongs: LOADED_SONGS.map(s => ({ id: s.id, name: s.name })),
    ...(lobby.battle.phase === 'IN_BATTLE' && lobby.battle.battleStartTime && {
      battleStartTime: lobby.battle.battleStartTime,
    }),
  } as any;
}

/**
 * Handle CREATE_LOBBY
 */
export function handleCreateLobby(
  msg: CreateLobbyMessage,
  conn: ClientConnection
): ServerMessage[] {
  try {
    const lobby = lobbyState.createLobby(msg.userId, msg.userName, msg.roomName);
    conn.userId = msg.userId;
    conn.lobbyId = lobby.id;

    const snapshot = lobbyToMessage(lobby);

    return [{ ...snapshot, type: 'LOBBY_SNAPSHOT' } as any];
  } catch (err) {
    sendError(conn, 'CREATE_LOBBY_ERROR', 'Failed to create lobby');
    return [];
  }
}

/**
 * Handle JOIN_LOBBY
 */
export function handleJoinLobby(
  msg: JoinLobbyMessage,
  conn: ClientConnection,
  allConnections: Map<string, ClientConnection>
): ServerMessage[] {
  try {
    const lobby = lobbyState.joinLobby(msg.roomId, msg.userId, msg.userName);
    if (!lobby) {
      sendError(conn, 'JOIN_FAILED', 'Lobby not found or full');
      return [];
    }

    conn.userId = msg.userId;
    conn.lobbyId = msg.roomId;

    // Send snapshot to joining user
    const snapshot = lobbyToMessage(lobby);

    // Broadcast player joined to all in lobby
    const playerJoined: ServerMessage = {
      type: 'PLAYER_JOINED',
      roomId: msg.roomId,
      player: {
        id: msg.userId,
        name: msg.userName,
        ready: false,
        score: 0,
      },
    };

    const messages: ServerMessage[] = [snapshot];

    // Broadcast to all in lobby (except the new player, they already got snapshot)
    for (const otherConn of allConnections.values()) {
      if (otherConn.lobbyId === msg.roomId && otherConn.userId !== msg.userId) {
        sendMessage(otherConn, playerJoined);
      }
    }

    return messages;
  } catch (err) {
    sendError(conn, 'JOIN_ERROR', 'Failed to join lobby');
    return [];
  }
}

/**
 * Handle JOIN_BY_CODE
 * Looks up lobby by room code instead of room ID
 */
export function handleJoinByCode(
  msg: JoinByCodeMessage,
  conn: ClientConnection,
  allConnections: Map<string, ClientConnection>
): ServerMessage[] {
  try {
    // Look up lobby by code
    const lobby = lobbyState.getLobbyByCode(msg.roomCode);
    if (!lobby) {
      sendError(conn, 'ROOM_NOT_FOUND', 'Room code not found');
      return [];
    }

    // Delegate to regular join logic
    const joinMsg: JoinLobbyMessage = {
      type: 'JOIN_LOBBY',
      roomId: lobby.id,
      userId: msg.userId,
      userName: msg.userName,
    };

    return handleJoinLobby(joinMsg, conn, allConnections);
  } catch (err) {
    sendError(conn, 'JOIN_ERROR', 'Failed to join lobby by code');
    return [];
  }
}

/**
 * Handle SET_READY
 */
export function handleSetReady(
  msg: SetReadyMessage,
  conn: ClientConnection,
  allConnections: Map<string, ClientConnection>
): ServerMessage[] {
  try {
    const lobby = lobbyState.setPlayerReady(msg.roomId, msg.userId, msg.isReady);
    if (!lobby) {
      sendError(conn, 'SET_READY_ERROR', 'Lobby or player not found');
      return [];
    }

    const update: ServerMessage = {
      type: 'PLAYER_READY_UPDATE',
      roomId: msg.roomId,
      playerId: msg.userId,
      isReady: msg.isReady,
    };

    // Broadcast to all in lobby
    broadcastToLobby(allConnections, msg.roomId, update);

    return [];
  } catch (err) {
    sendError(conn, 'SET_READY_ERROR', 'Failed to set ready');
    return [];
  }
}

/**
 * Handle SELECT_SONG
 */
export function handleSelectSong(
  msg: any, // SelectSongMessage
  conn: ClientConnection,
  allConnections: Map<string, ClientConnection>
): void {
  try {
    const lobby = lobbyState.getLobby(msg.roomId);
    if (!lobby) return;

    // Only host can pick song
    if (lobby.hostId !== msg.userId) {
      sendError(conn, 'SELECT_SONG_ERROR', 'Only host can select song');
      return;
    }

    const song = LOADED_SONGS.find(s => s.id === msg.songId);
    if (!song) {
      sendError(conn, 'SELECT_SONG_ERROR', 'Song not found');
      return;
    }

    lobbyState.setSong(msg.roomId, song);

    // Broadcast update (snapshot)
    const snapshot = lobbyToMessage(lobby);
    broadcastToLobby(allConnections, msg.roomId, snapshot);
  } catch (err) {
    sendError(conn, 'SELECT_SONG_ERROR', 'Failed to select song');
  }
}

/**
 * Handle START_BATTLE
 */
export function handleStartBattle(
  msg: StartBattleMessage,
  conn: ClientConnection,
  allConnections: Map<string, ClientConnection>
): ServerMessage[] {
  try {
    const lobby = lobbyState.getLobby(msg.roomId);
    if (!lobby) {
      sendError(conn, 'START_BATTLE_ERROR', 'Lobby not found');
      return [];
    }

    // Only host can start
    if (lobby.hostId !== msg.userId) {
      sendError(conn, 'START_BATTLE_ERROR', 'Only host can start battle');
      return [];
    }

    // All players must be ready
    for (const player of lobby.players.values()) {
      if (!player.ready) {
        sendError(conn, 'START_BATTLE_ERROR', 'Not all players ready');
        return [];
      }
    }

    // Use current lobby song, or 'My Way', or fallback
    const song = lobby.battle.song || LOADED_SONGS.find(s => s.name.toLowerCase().includes('my way')) || LOADED_SONGS[0];
    const updatedLobby = lobbyState.startBattle(msg.roomId, song);

    if (!updatedLobby) {
      sendError(conn, 'START_BATTLE_ERROR', 'Failed to start battle');
      return [];
    }

    // Transition to LOADING phase
    const phaseChange: ServerMessage = {
      type: 'PHASE_CHANGE',
      roomId: msg.roomId,
      newPhase: 'LOADING',
      song: {
        id: song.id,
        name: song.name,
        lyrics: song.lyrics,
        lineDurations: song.lineDurations,
        lineTimings: song.lineTimings,
        notes: song.notes,
        mp3: song.mp3,
        cover: song.cover
      } as any
    };

    // Broadcast to all in lobby
    broadcastToLobby(allConnections, msg.roomId, phaseChange);

    return [];
  } catch (err) {
    sendError(conn, 'START_BATTLE_ERROR', 'Failed to start battle');
    return [];
  }
}

/**
 * Handle PLAYER_LOADED
 */
export function handlePlayerLoaded(
  msg: PlayerLoadedMessage,
  conn: ClientConnection,
  connections: Map<string, ClientConnection>
): void {
  const result = lobbyState.setPlayerLoaded(msg.roomId, msg.userId);

  if (result && result.allLoaded) {
    // Broadcast START with future timestamp
    const phaseMsg: ServerMessage = {
      type: 'PHASE_CHANGE',
      roomId: msg.roomId,
      newPhase: 'IN_BATTLE',
      battleStartTime: result.lobby.battle.battleStartTime!
    };

    console.log(`[Battle] Starting synced battle in lobby ${msg.roomId}`);
    broadcastToLobby(connections, msg.roomId, phaseMsg);
  }
}

/**
 * Handle AUDIO_CHUNK
 * 
 * Validate and queue for scoring
 */
export function handleAudioChunk(msg: AudioChunkMessage): void {
  try {
    const lobby = lobbyState.getLobby(msg.roomId);
    if (!lobby) return;

    // Validate timestamp is within battle window
    if (!lobby.battle.battleStartTime) return;
    const elapsedMs = Date.now() - lobby.battle.battleStartTime;

    // Allow up to 1 second latency
    if (msg.timestamp < -1000 || msg.timestamp > elapsedMs + 1000) {
      return; // Discard out-of-window chunks
    }

    // Add to buffer for scoring
    lobbyState.addAudioChunk(msg.roomId, msg.userId, msg.timestamp, msg.audioData);
  } catch (err) {
    // Silently discard invalid audio chunks
    return;
  }
}

/**
 * Handle FINISH_BATTLE
 * 
 * Player explicitly finished singing
 */
export function handleFinishBattle(
  msg: FinishBattleMessage,
  _allConnections: Map<string, ClientConnection>
): ServerMessage[] {
  try {
    const lobby = lobbyState.getLobby(msg.roomId);
    if (!lobby) return [];

    // Mark player as finished (for battle end detection)
    // TODO: PRODUCTION - Track who finished, end when all finish or timeout

    return [];
  } catch (err) {
    return [];
  }
}

/**
 * Handle LEAVE_LOBBY
 */
export function handleLeaveLobby(
  msg: LeaveLobbyMessage,
  conn: ClientConnection,
  allConnections: Map<string, ClientConnection>
): ServerMessage[] {
  try {
    lobbyState.leaveLobby(msg.roomId, msg.userId);
    conn.userId = null;
    conn.lobbyId = null;

    // Broadcast player left
    const playerLeft: ServerMessage = {
      type: 'PLAYER_LEFT',
      roomId: msg.roomId,
      playerId: msg.userId,
      reason: 'manual',
    };

    broadcastToLobby(allConnections, msg.roomId, playerLeft);

    return [];
  } catch (err) {
    return [];
  }
}

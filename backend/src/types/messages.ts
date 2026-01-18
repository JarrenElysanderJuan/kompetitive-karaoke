/**
 * MESSAGE TYPE DEFINITIONS
 * 
 * Single source of truth for all WebSocket messages.
 * Frontend and backend must match these contracts exactly.
 */

// ============================================================================
// CLIENT → SERVER MESSAGES
// ============================================================================

export interface CreateLobbyMessage {
  type: 'CREATE_LOBBY';
  roomName: string;
  maxPlayers?: number; // default 4
  userId: string;
  userName: string;
}

export interface JoinLobbyMessage {
  type: 'JOIN_LOBBY';
  roomId: string;
  userId: string;
  userName: string;
}

export interface JoinByCodeMessage {
  type: 'JOIN_BY_CODE';
  roomCode: string;  // 6-char code
  userId: string;
  userName: string;
}

export interface SetReadyMessage {
  type: 'SET_READY';
  roomId: string;
  userId: string;
  isReady: boolean;
}

export interface StartBattleMessage {
  type: 'START_BATTLE';
  roomId: string;
  userId: string; // only host can start
}

export interface PlayerLoadedMessage {
  type: 'PLAYER_LOADED';
  roomId: string;
  userId: string;
}

export interface AudioChunkMessage {
  type: 'AUDIO_CHUNK';
  roomId: string;
  userId: string;
  timestamp: number; // ms since battleStartTime (RELATIVE, not absolute!)
  audioData: string; // Base64 encoded frequency data
  sampleRate: number; // should be 44100
  channelCount: number; // should be 1
}

export interface FinishBattleMessage {
  type: 'FINISH_BATTLE';
  roomId: string;
  userId: string;
}

export interface SelectSongMessage {
  type: 'SELECT_SONG';
  roomId: string;
  userId: string;
  songId: string;
}

export interface LeaveLobbyMessage {
  type: 'LEAVE_LOBBY';
  roomId: string;
  userId: string;
}

// ============================================================================
// SERVER → CLIENT MESSAGES
// ============================================================================

export interface LobbySnapshot {
  type: 'LOBBY_SNAPSHOT';
  roomId: string;
  roomCode: string;
  roomName: string;
  phase: 'LOBBY' | 'IN_BATTLE' | 'RESULTS';
  hostId: string;
  maxPlayers: number;
  players: Array<{
    id: string;
    name: string;
    ready: boolean;
    score: number;
    combo: number;
    accuracy: number;
    isHost: boolean;
    connected: boolean;
  }>;
  battleStartTime?: number; // only in IN_BATTLE phase
  song?: {
    id: string;
    name: string;
    lyrics: string[];
    lineDurations: number[];
  };
  availableSongs?: Array<{
    id: string;
    name: string;
  }>;
}

export interface PlayerJoinedMessage {
  type: 'PLAYER_JOINED';
  roomId: string;
  player: {
    id: string;
    name: string;
    ready: boolean;
    score: number;
  };
}

export interface PlayerLeftMessage {
  type: 'PLAYER_LEFT';
  roomId: string;
  playerId: string;
  reason: 'disconnect' | 'manual';
}

export interface PlayerReadyUpdateMessage {
  type: 'PLAYER_READY_UPDATE';
  roomId: string;
  playerId: string;
  isReady: boolean;
}

export interface PhaseChangeMessage {
  type: 'PHASE_CHANGE';
  roomId: string;
  newPhase: 'LOBBY' | 'LOADING' | 'IN_BATTLE' | 'RESULTS';
  battleStartTime?: number; // unix ms when battle started (CRITICAL!)
  song?: {
    id: string;
    name: string;
    lyrics: string[];
    lineDurations: number[];
    lineTimings: number[];
  };
}

export interface PlayerScoreUpdateMessage {
  type: 'PLAYER_SCORE_UPDATE';
  roomId: string;
  playerId: string;
  newScore: number;
  accuracy: number;
  combo: number;
}

export interface BattleResultsMessage {
  type: 'BATTLE_RESULTS';
  roomId: string;
  players: Array<{
    id: string;
    name: string;
    score: number;
    accuracy: number;
    combo: number;
    position: number;
  }>;
  endedAt: number;
}

export interface ErrorMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

// Union type for all messages
export type ServerMessage =
  | LobbySnapshot
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerReadyUpdateMessage
  | PhaseChangeMessage
  | PlayerScoreUpdateMessage
  | BattleResultsMessage
  | ErrorMessage;

export type ClientMessage =
  | CreateLobbyMessage
  | JoinLobbyMessage
  | JoinByCodeMessage
  | SetReadyMessage
  | StartBattleMessage
  | SelectSongMessage
  | PlayerLoadedMessage
  | AudioChunkMessage
  | FinishBattleMessage
  | LeaveLobbyMessage;

// ============================================================================
// MESSAGE VALIDATORS
// ============================================================================

export function validateClientMessage(msg: unknown): msg is ClientMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as any;
  if (!m.type) return false;

  switch (m.type) {
    case 'CREATE_LOBBY': {
      const isValid = typeof m.roomName === 'string' &&
        typeof m.userId === 'string' &&
        typeof m.userName === 'string';
      if (!isValid) {
        console.log('[Validation] CREATE_LOBBY failed:', {
          roomName: typeof m.roomName,
          userId: typeof m.userId,
          userName: typeof m.userName,
          received: m
        });
      }
      return isValid;
    }

    case 'JOIN_LOBBY':
      return typeof m.roomId === 'string' &&
        typeof m.userId === 'string' &&
        typeof m.userName === 'string';

    case 'JOIN_BY_CODE':
      return typeof m.roomCode === 'string' &&
        typeof m.userId === 'string' &&
        typeof m.userName === 'string';

    case 'SET_READY':
      return typeof m.roomId === 'string' &&
        typeof m.userId === 'string' &&
        typeof m.isReady === 'boolean';

    case 'START_BATTLE':
      return typeof m.roomId === 'string' &&
        typeof m.userId === 'string';

    case 'SELECT_SONG':
      return typeof m.roomId === 'string' &&
        typeof m.userId === 'string' &&
        typeof m.songId === 'string';

    case 'PLAYER_LOADED':
      return typeof m.roomId === 'string' &&
        typeof m.userId === 'string';

    case 'AUDIO_CHUNK':
      return typeof m.roomId === 'string' &&
        typeof m.userId === 'string' &&
        typeof m.timestamp === 'number' &&
        typeof m.audioData === 'string' &&
        typeof m.sampleRate === 'number' &&
        typeof m.channelCount === 'number';

    case 'FINISH_BATTLE':
      return typeof m.roomId === 'string' &&
        typeof m.userId === 'string';

    case 'LEAVE_LOBBY':
      return typeof m.roomId === 'string' &&
        typeof m.userId === 'string';

    default:
      return false;
  }
}

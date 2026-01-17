/**
 * WEBSOCKET MESSAGE CONTRACTS
 * 
 * All valid WebSocket message types and payloads between client and server.
 * This is the single source of truth for message format.
 * 
 * USAGE:
 *   import { CLIENT_MESSAGES, SERVER_MESSAGES } from '@/constants/wsMessages';
 *   
 *   // Validate incoming message
 *   if (message.type === CLIENT_MESSAGES.JOIN_LOBBY.type) { ... }
 *   
 *   // Send with payload
 *   ws.send(JSON.stringify({
 *     type: CLIENT_MESSAGES.SCORE_UPDATE.type,
 *     payload: { score: 1000, combo: 5, accuracy: 95.5 }
 *   }));
 * 
 * Source: Karaoke Multiplayer Design Document (v1)
 * Last Updated: January 17, 2026
 */

// ============================================================================
// MESSAGE TYPE CONSTANTS
// ============================================================================

export const MESSAGE_TYPES = {
  // Client → Server
  JOIN_LOBBY: "JOIN_LOBBY",
  LEAVE_LOBBY: "LEAVE_LOBBY",
  SET_READY: "SET_READY",
  START_BATTLE: "START_BATTLE",
  SELECT_SONG: "SELECT_SONG",
  SCORE_UPDATE: "SCORE_UPDATE",
  FINISH_BATTLE: "FINISH_BATTLE",
  AUDIO_CHUNK: "AUDIO_CHUNK",

  // Server → Client
  LOBBY_SNAPSHOT: "LOBBY_SNAPSHOT",
  PLAYER_READY_UPDATE: "PLAYER_READY_UPDATE",
  PHASE_CHANGE: "PHASE_CHANGE",
  PLAYER_SCORE_UPDATE: "PLAYER_SCORE_UPDATE",
  BATTLE_RESULTS: "BATTLE_RESULTS",
  ERROR: "ERROR",
};

// ============================================================================
// CLIENT → SERVER MESSAGES
// ============================================================================

export const CLIENT_MESSAGES = {
  /**
   * JOIN_LOBBY: Request to join an existing lobby
   * REQUIRES: Room code must be valid, not full
   * RESPONSE: Server sends LOBBY_SNAPSHOT on success, ERROR on failure
   * 
   * @typedef {Object} JoinLobbyPayload
   * @property {string} roomCode - Room code (e.g., "A7KQ")
   * @property {string} playerName - Player's display name
   * 
   * EXAMPLE:
   * {
   *   "type": "JOIN_LOBBY",
   *   "payload": {
   *     "roomCode": "A7KQ",
   *     "playerName": "Alice"
   *   }
   * }
   */
  JOIN_LOBBY: {
    type: MESSAGE_TYPES.JOIN_LOBBY,
    payload: {
      roomCode: "string",
      playerName: "string",
    },
  },

  /**
   * LEAVE_LOBBY: Request to leave current lobby
   * BEHAVIOR: Removes player from lobby, triggers updates for others
   * NO PAYLOAD required
   * 
   * EXAMPLE:
   * {
   *   "type": "LEAVE_LOBBY"
   * }
   */
  LEAVE_LOBBY: {
    type: MESSAGE_TYPES.LEAVE_LOBBY,
    // No payload
  },

  /**
   * SET_READY: Mark player as ready (or unready) for battle
   * PHASE: Only valid during LOBBY phase
   * RESTRICTIONS: Cannot ready if not in LOBBY phase
   * RESPONSE: Server broadcasts PLAYER_READY_UPDATE
   * 
   * @typedef {Object} SetReadyPayload
   * @property {boolean} ready - Ready status
   * 
   * EXAMPLE:
   * {
   *   "type": "SET_READY",
   *   "payload": { "ready": true }
   * }
   */
  SET_READY: {
    type: MESSAGE_TYPES.SET_READY,
    payload: {
      ready: "boolean",
    },
  },

  /**
   * START_BATTLE: Request to start the battle (host only)
   * RESTRICTIONS: Only host can send, all players must be ready
   * VALIDATION: Server checks host status, ready status, song selected
   * RESPONSE: Server broadcasts PHASE_CHANGE or ERROR
   * NO PAYLOAD required
   * 
   * EXAMPLE:
   * {
   *   "type": "START_BATTLE"
   * }
   */
  START_BATTLE: {
    type: MESSAGE_TYPES.START_BATTLE,
    // No payload
  },

  /**
   * SELECT_SONG: Host selects a song for the lobby
   * RESTRICTIONS: Only host can send, only in LOBBY phase
   * VALIDATION: Song ID must exist in catalog
   * RESPONSE: Server broadcasts LOBBY_SNAPSHOT with new song
   * 
   * @typedef {Object} SelectSongPayload
   * @property {string} songId - Unique song ID
   * 
   * EXAMPLE:
   * {
   *   "type": "SELECT_SONG",
   *   "payload": { "songId": "song_42" }
   * }
   */
  SELECT_SONG: {
    type: MESSAGE_TYPES.SELECT_SONG,
    payload: {
      songId: "string",
    },
  },

  /**
   * SCORE_UPDATE: Player sends their current score (mock or real calculation)
   * PHASE: Only during IN_BATTLE phase
   * TODO: BACKEND - This may be deprecated if server calculates all scores
   *                  Keep for compatibility or remove if backend handles it
   * BEHAVIOR: Server may validate/override, then broadcasts to others
   * 
   * @typedef {Object} ScoreUpdatePayload
   * @property {number} score - Current score
   * @property {number} combo - Current combo multiplier
   * @property {number} accuracy - Accuracy percentage (0-100)
   * 
   * EXAMPLE:
   * {
   *   "type": "SCORE_UPDATE",
   *   "payload": {
   *     "score": 542100,
   *     "combo": 42,
   *     "accuracy": 98.3
   *   }
   * }
   */
  SCORE_UPDATE: {
    type: MESSAGE_TYPES.SCORE_UPDATE,
    payload: {
      score: "number",
      combo: "number",
      accuracy: "number",
    },
  },

  /**
   * FINISH_BATTLE: Player declares they finished the lyrics
   * PHASE: Only during IN_BATTLE phase
   * BEHAVIOR: Server records finish time, may trigger battle end if all finished
   * NO PAYLOAD required
   * 
   * EXAMPLE:
   * {
   *   "type": "FINISH_BATTLE"
   * }
   */
  FINISH_BATTLE: {
    type: MESSAGE_TYPES.FINISH_BATTLE,
    // No payload
  },

  /**
   * AUDIO_CHUNK: Stream audio data to server for analysis
   * PHASE: Only during IN_BATTLE phase
   * FREQUENCY: Every 20ms (configurable based on chunk duration)
   * WARNING: High frequency, keep payload compact
   * 
   * @typedef {Object} AudioChunkPayload
   * @property {number} timestamp - Milliseconds since battle started (relative)
   * @property {string} audioData - Base64-encoded Float32Array PCM samples
   * 
   * PAYLOAD SIZE:
   *   - 20ms @ 44.1kHz = 882 samples
   *   - As Float32Array = 3528 bytes
   *   - As Base64 = ~4704 bytes
   *   - 50 chunks/sec × ~5KB = 250KB/sec (manageable)
   * 
   * TODO: BACKEND
   *   - Decide: Base64 vs binary WebSocket frame?
   *   - Verify chunk timing (should be 20ms apart)
   *   - Implement audio analysis (pitch, syllables, timing)
   *   - Store chunks temporarily for analysis
   * 
   * EXAMPLE:
   * {
   *   "type": "AUDIO_CHUNK",
   *   "payload": {
   *     "timestamp": 2340,
   *     "audioData": "AgD8//8B/Pv/8f..."
   *   }
   * }
   */
  AUDIO_CHUNK: {
    type: MESSAGE_TYPES.AUDIO_CHUNK,
    payload: {
      timestamp: "number",
      audioData: "string (Base64 encoded)",
    },
  },
};

// ============================================================================
// SERVER → CLIENT MESSAGES
// ============================================================================

export const SERVER_MESSAGES = {
  /**
   * LOBBY_SNAPSHOT: Full lobby state (sent on join or major changes)
   * FREQUENCY: On join, after each significant change
   * REPLACES: Partial updates (provides full state)
   * PURPOSE: Ensure clients never miss state updates
   * 
   * @typedef {Object} LobbySnapshotPayload
   * @property {string} roomId - Unique lobby ID
   * @property {string} roomCode - Join code
   * @property {string} phase - Current phase
   * @property {Object|null} song - Current song or null
   * @property {Array} players - Array of PlayerState objects
   * 
   * EXAMPLE:
   * {
   *   "type": "LOBBY_SNAPSHOT",
   *   "payload": {
   *     "roomId": "abc123",
   *     "roomCode": "A7KQ",
   *     "phase": "LOBBY",
   *     "song": {
   *       "songId": "song_42",
   *       "title": "Twinkle Twinkle",
   *       "artist": "Unknown",
   *       "durationMs": 120000,
   *       "difficulty": "easy",
   *       "lyrics": ["Twinkle twinkle", "little star", ...],
   *       "lineDurations": [4000, 4000, ...],
   *       "lineTimings": [0, 4000, 8000, ...],
   *       "fileUrl": "/songs/song_42.mp3"
   *     },
   *     "players": [
   *       {
   *         "id": "p1",
   *         "name": "Alice",
   *         "ready": true,
   *         "score": 0,
   *         "isHost": true,
   *         "connected": true,
   *         "combo": 0,
   *         "accuracy": 0,
   *         "finished": false
   *       },
   *       {
   *         "id": "p2",
   *         "name": "Bob",
   *         "ready": false,
   *         "score": 0,
   *         "isHost": false,
   *         "connected": true,
   *         "combo": 0,
   *         "accuracy": 0,
   *         "finished": false
   *       }
   *     ]
   *   }
   * }
   */
  LOBBY_SNAPSHOT: {
    type: MESSAGE_TYPES.LOBBY_SNAPSHOT,
    payload: {
      roomId: "string",
      roomCode: "string",
      phase: "string (LOBBY|IN_BATTLE|RESULTS)",
      song: "SongConfig | null",
      players: "PlayerState[]",
    },
  },

  /**
   * PLAYER_READY_UPDATE: A player's ready status changed
   * BROADCAST: To all players in lobby
   * TRIGGER: Player sent SET_READY message
   * 
   * @typedef {Object} PlayerReadyUpdatePayload
   * @property {string} playerId - ID of player who changed ready status
   * @property {boolean} ready - New ready status
   * 
   * EXAMPLE:
   * {
   *   "type": "PLAYER_READY_UPDATE",
   *   "payload": {
   *     "playerId": "p2",
   *     "ready": true
   *   }
   * }
   */
  PLAYER_READY_UPDATE: {
    type: MESSAGE_TYPES.PLAYER_READY_UPDATE,
    payload: {
      playerId: "string",
      ready: "boolean",
    },
  },

  /**
   * PHASE_CHANGE: Lobby phase transitioned (LOBBY → IN_BATTLE → RESULTS)
   * CRITICAL MESSAGE: Triggers major UI state changes
   * BROADCAST: To all players in lobby
   * 
   * @typedef {Object} PhaseChangePayload
   * @property {string} phase - New phase (LOBBY|IN_BATTLE|RESULTS)
   * @property {number} startTime - Unix ms (meaningful for IN_BATTLE)
   * @property {Object|null} song - Song config (included for IN_BATTLE)
   * @property {Array} players - Updated player list
   * 
   * PAYLOAD FOR IN_BATTLE:
   *   - startTime: When battle actually started (server unix ms)
   *   - song: Complete SongConfig with lyrics, durations, timings
   *   - players: Updated with reset ready status
   * 
   * PAYLOAD FOR RESULTS:
   *   - startTime: null (not meaningful)
   *   - song: null (battle over)
   *   - players: Final player list with final scores
   * 
   * EXAMPLE (IN_BATTLE):
   * {
   *   "type": "PHASE_CHANGE",
   *   "payload": {
   *     "phase": "IN_BATTLE",
   *     "startTime": 1705512345000,
   *     "song": SongConfig,
   *     "players": [...]
   *   }
   * }
   */
  PHASE_CHANGE: {
    type: MESSAGE_TYPES.PHASE_CHANGE,
    payload: {
      phase: "string",
      startTime: "number | null",
      song: "SongConfig | null",
      players: "PlayerState[]",
    },
  },

  /**
   * PLAYER_SCORE_UPDATE: A player's score changed
   * BROADCAST: To all players in lobby
   * TRIGGER: Server analyzed audio, calculated new score
   * FREQUENCY: Every syllable or phrase (variable)
   * 
   * @typedef {Object} PlayerScoreUpdatePayload
   * @property {string} playerId - ID of player whose score changed
   * @property {number} score - New total score
   * @property {number} combo - Current combo
   * @property {number} accuracy - Current accuracy %
   * 
   * EXAMPLE:
   * {
   *   "type": "PLAYER_SCORE_UPDATE",
   *   "payload": {
   *     "playerId": "p1",
   *     "score": 542100,
   *     "combo": 42,
   *     "accuracy": 98.3
   *   }
   * }
   * 
   * TODO: BACKEND - Implement audio analysis to generate these updates
   */
  PLAYER_SCORE_UPDATE: {
    type: MESSAGE_TYPES.PLAYER_SCORE_UPDATE,
    payload: {
      playerId: "string",
      score: "number",
      combo: "number",
      accuracy: "number",
    },
  },

  /**
   * BATTLE_RESULTS: Battle ended, final results available
   * CRITICAL MESSAGE: Marks end of battle, triggers results display
   * BROADCAST: To all players
   * TRIGGER: All players finished OR battle timeout
   * 
   * @typedef {Object} BattleResultsPayload
   * @property {Array} players - Final player list sorted by score
   * @property {Object} leaderboard - Ranked results
   * 
   * PAYLOAD:
   *   - players: Final PlayerState[] sorted by score (descending)
   *   - Each player has final: score, combo, accuracy, finished, finishTime
   * 
   * EXAMPLE:
   * {
   *   "type": "BATTLE_RESULTS",
   *   "payload": {
   *     "players": [
   *       {
   *         "id": "p1",
   *         "name": "Alice",
   *         "score": 950000,
   *         "combo": 142,
   *         "accuracy": 99.5,
   *         "finished": true,
   *         "finishTime": 120100
   *       },
   *       {
   *         "id": "p2",
   *         "name": "Bob",
   *         "score": 850000,
   *         "combo": 128,
   *         "accuracy": 98.2,
   *         "finished": true,
   *         "finishTime": 121500
   *       }
   *     ]
   *   }
   * }
   * 
   * TODO: BACKEND
   *   - Calculate final scores
   *   - Sort by score, then by finishTime (tiebreaker)
   *   - Include timestamps for leaderboard
   */
  BATTLE_RESULTS: {
    type: MESSAGE_TYPES.BATTLE_RESULTS,
    payload: {
      players: "PlayerState[]",  // Sorted by score descending
    },
  },

  /**
   * ERROR: Generic error message
   * BROADCAST: To triggering client only (or all)
   * TRIGGER: Invalid operation, validation error, server error
   * 
   * @typedef {Object} ErrorPayload
   * @property {string} message - Human-readable error message
   * @property {string} code - Machine-readable error code
   * @property {Object} [details] - Additional error context
   * 
   * ERROR CODES:
   *   ROOM_NOT_FOUND: Room code doesn't exist
   *   ROOM_FULL: Lobby is at max players
   *   INVALID_OPERATION: Operation not allowed in current phase
   *   PERMISSION_DENIED: Player lacks permission (e.g., not host)
   *   INVALID_PAYLOAD: Malformed message
   *   SERVER_ERROR: Internal server error
   *   SONG_NOT_FOUND: Selected song doesn't exist
   *   NOT_READY: Required precondition not met
   *   ALREADY_IN_ROOM: Player already joined this room
   *   TIMEOUT: Operation took too long
   * 
   * EXAMPLE:
   * {
   *   "type": "ERROR",
   *   "payload": {
   *     "message": "Room is full, cannot join",
   *     "code": "ROOM_FULL",
   *     "details": { "maxPlayers": 4, "currentPlayers": 4 }
   *   }
   * }
   */
  ERROR: {
    type: MESSAGE_TYPES.ERROR,
    payload: {
      message: "string",
      code: "string",
      details: "object | undefined",
    },
  },
};

// ============================================================================
// MESSAGE VALIDATION HELPERS (TODO: BACKEND)
// ============================================================================

/**
 * Validates a client message against the contract
 * TODO: BACKEND - Implement server-side validation
 * 
 * @param {Object} message - Message to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateClientMessage(message) {
  if (!message.type) {
    return { valid: false, error: "Missing message type" };
  }

  const allowedTypes = Object.values(MESSAGE_TYPES);
  if (!allowedTypes.includes(message.type)) {
    return { valid: false, error: `Invalid message type: ${message.type}` };
  }

  // TODO: BACKEND - Add payload validation per message type
  // Example:
  // if (message.type === MESSAGE_TYPES.JOIN_LOBBY) {
  //   if (!message.payload?.roomCode) return { valid: false, error: "Missing roomCode" };
  //   if (!message.payload?.playerName) return { valid: false, error: "Missing playerName" };
  // }

  return { valid: true };
}

/**
 * Validates a server message against the contract
 * TODO: BACKEND - Implement server validation before sending
 * 
 * @param {Object} message - Message to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateServerMessage(message) {
  if (!message.type) {
    return { valid: false, error: "Missing message type" };
  }

  const serverTypes = Object.keys(SERVER_MESSAGES).map(
    (key) => SERVER_MESSAGES[key].type
  );
  if (!serverTypes.includes(message.type)) {
    return { valid: false, error: `Invalid server message type: ${message.type}` };
  }

  // TODO: BACKEND - Add payload validation per message type

  return { valid: true };
}

// ============================================================================
// ERROR CODES CONSTANTS
// ============================================================================

export const ERROR_CODES = {
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_FULL: "ROOM_FULL",
  INVALID_OPERATION: "INVALID_OPERATION",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  SERVER_ERROR: "SERVER_ERROR",
  SONG_NOT_FOUND: "SONG_NOT_FOUND",
  NOT_READY: "NOT_READY",
  ALREADY_IN_ROOM: "ALREADY_IN_ROOM",
  TIMEOUT: "TIMEOUT",
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
  MESSAGE_TYPES,
  CLIENT_MESSAGES,
  SERVER_MESSAGES,
  ERROR_CODES,
  validateClientMessage,
  validateServerMessage,
};

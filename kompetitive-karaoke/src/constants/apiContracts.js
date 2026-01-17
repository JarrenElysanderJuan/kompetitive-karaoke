/**
 * API CONTRACTS & PAYLOAD STRUCTURES
 * 
 * This file documents all WebSocket and REST API contracts between frontend and backend.
 * Use this as the single source of truth for integration.
 * 
 * Source: Karaoke Multiplayer Design Document (v1)
 * Last Updated: January 17, 2026
 */

// ============================================================================
// SERVER STATE MODELS
// ============================================================================

/**
 * LobbyState - Represents a karaoke lobby
 */
export const LobbyStateModel = {
  roomId: String,           // Unique identifier
  roomCode: String,         // Short code for joining (e.g., "A7KQ")
  name: String,             // Display name
  maxPlayers: Number,
  createdAt: Number,        // Unix timestamp
  phase: String,            // "LOBBY" | "IN_BATTLE" | "RESULTS"
  rules: Object,            // LobbyRules (see below)
  players: Array,           // PlayerState[] (see below)
  songId: String | null,    // Currently selected song
  battle: Object | null,    // BattleState (see below)
};

/**
 * PlayerState - Represents a player in a lobby
 */
export const PlayerStateModel = {
  playerId: String,
  name: String,
  socketId: String,
  connected: Boolean,
  ready: Boolean,
  isHost: Boolean,
  score: Number,
  combo: Number,
  accuracy: Number,
  finished: Boolean,
};

/**
 * BattleState - Represents active battle info
 */
export const BattleStateModel = {
  startedAt: Number,        // Unix timestamp when battle started
  durationMs: Number,       // Expected battle duration
  expectedEndAt: Number,    // startedAt + durationMs
  finishedPlayers: Array,   // playerId[] of players who finished
  allFinished: Boolean,
};

/**
 * SongConfig - Song metadata
 */
export const SongConfigModel = {
  songId: String,
  title: String,
  artist: String,
  durationMs: Number,
  lyrics: Array,            // string[] - one per line
  difficulty: String,       // "easy" | "medium" | "hard"
  maxScore: Number,
  fileUrl: String,          // e.g., "/songs/song_42.mp3"
};

// ============================================================================
// WEBSOCKET: CLIENT → SERVER
// ============================================================================

export const ClientMessages = {
  /**
   * JOIN_LOBBY
   * Join an existing lobby by room code
   */
  JOIN_LOBBY: {
    type: "JOIN_LOBBY",
    payload: {
      roomCode: String,     // e.g., "A7KQ"
      playerName: String,   // User's display name
    },
  },

  /**
   * LEAVE_LOBBY
   * Leave the current lobby
   */
  LEAVE_LOBBY: {
    type: "LEAVE_LOBBY",
    // No payload
  },

  /**
   * SET_READY
   * Toggle player's ready status
   */
  SET_READY: {
    type: "SET_READY",
    payload: {
      ready: Boolean,
    },
  },

  /**
   * START_BATTLE
   * Start the battle (host only)
   */
  START_BATTLE: {
    type: "START_BATTLE",
    // No payload - host-only action
  },

  /**
   * SELECT_SONG
   * Select a song for the lobby (host only)
   */
  SELECT_SONG: {
    type: "SELECT_SONG",
    payload: {
      songId: String,
    },
  },

  /**
   * SCORE_UPDATE
   * Client sends its current score during battle
   * (Server will validate against audio analysis)
   */
  SCORE_UPDATE: {
    type: "SCORE_UPDATE",
    payload: {
      score: Number,
      combo: Number,
      accuracy: Number,
    },
  },

  /**
   * FINISH_BATTLE
   * Client declares they've finished the battle
   */
  FINISH_BATTLE: {
    type: "FINISH_BATTLE",
    // No payload
  },

  /**
   * AUDIO_CHUNK
   * Stream audio data to server for analysis
   * (Separate from WebSocket JSON - may use binary frame)
   */
  AUDIO_CHUNK: {
    type: "AUDIO_CHUNK",
    payload: {
      timestamp: Number,    // ms since battle start
      audioData: "Float32Array", // Raw PCM samples (serialize as Base64 or binary)
    },
  },
};

// ============================================================================
// WEBSOCKET: SERVER → CLIENT
// ============================================================================

export const ServerMessages = {
  /**
   * LOBBY_SNAPSHOT
   * Full lobby state (sent on join or when state significantly changes)
   */
  LOBBY_SNAPSHOT: {
    type: "LOBBY_SNAPSHOT",
    payload: {
      roomId: String,
      roomCode: String,
      phase: String,        // "LOBBY" | "IN_BATTLE" | "RESULTS"
      song: Object,         // SongConfig or null
      players: Array,       // PlayerState[]
    },
    example: {
      type: "LOBBY_SNAPSHOT",
      payload: {
        roomId: "abc123",
        roomCode: "A7KQ",
        phase: "LOBBY",
        song: {
          songId: "song_42",
          title: "Twinkle Twinkle",
          artist: "Unknown",
          durationMs: 120000,
          difficulty: "easy",
          fileUrl: "/songs/song_42.mp3",
        },
        players: [
          { id: "p1", name: "Alice", ready: true, score: 0 },
          { id: "p2", name: "Bob", ready: false, score: 0 },
        ],
      },
    },
  },

  /**
   * PLAYER_READY_UPDATE
   * A player's ready status changed
   */
  PLAYER_READY_UPDATE: {
    type: "PLAYER_READY_UPDATE",
    payload: {
      playerId: String,
      ready: Boolean,
    },
  },

  /**
   * PHASE_CHANGE
   * Lobby phase changed (LOBBY → IN_BATTLE → RESULTS)
   * Includes battle start time for client sync
   */
  PHASE_CHANGE: {
    type: "PHASE_CHANGE",
    payload: {
      phase: String,        // "LOBBY" | "IN_BATTLE" | "RESULTS"
      startTime: Number,    // Unix timestamp (used for lyric sync in IN_BATTLE)
    },
  },

  /**
   * PLAYER_SCORE_UPDATE
   * A player's score updated (usually from server analysis of their audio)
   */
  PLAYER_SCORE_UPDATE: {
    type: "PLAYER_SCORE_UPDATE",
    payload: {
      playerId: String,
      score: Number,
      combo: Number,
      accuracy: Number,
    },
  },

  /**
   * BATTLE_RESULTS
   * Battle ended, results are ready
   */
  BATTLE_RESULTS: {
    type: "BATTLE_RESULTS",
    payload: {
      players: Array,       // Array of { id, name, score }
    },
  },

  /**
   * ERROR
   * Generic error message
   */
  ERROR: {
    type: "ERROR",
    payload: {
      message: String,
      code: String,         // e.g., "ROOM_FULL", "INVALID_OPERATION"
    },
  },
};

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

export const RestEndpoints = {
  /**
   * GET /api/lobbies
   * Retrieve list of available lobbies
   */
  GET_LOBBIES: {
    method: "GET",
    path: "/api/lobbies",
    response: Array,  // LobbyState[]
    example: [
      {
        roomId: "abc123",
        roomCode: "A7KQ",
        name: "Rock Stars",
        players: ["Alice", "Bob"],
        maxPlayers: 4,
        phase: "LOBBY",
        song: null,
      },
    ],
  },

  /**
   * POST /api/lobbies
   * Create a new lobby
   */
  CREATE_LOBBY: {
    method: "POST",
    path: "/api/lobbies",
    body: {
      name: String,
      maxPlayers: Number,
    },
    response: {
      roomId: String,
      roomCode: String,
    },
  },

  /**
   * GET /api/songs
   * Get list of available songs
   */
  GET_SONGS: {
    method: "GET",
    path: "/api/songs",
    response: Array,  // SongConfig[]
    example: [
      {
        songId: "song_42",
        title: "Twinkle Twinkle",
        artist: "Unknown",
        durationMs: 120000,
        difficulty: "easy",
        fileUrl: "/songs/song_42.mp3",
      },
    ],
  },

  /**
   * GET /api/songs/:songId/file
   * Download the actual song file for playback
   */
  GET_SONG_FILE: {
    method: "GET",
    path: "/api/songs/:songId/file",
    response: "audio/mpeg | audio/ogg | audio/wav",  // Audio stream
  },
};

// ============================================================================
// FRONTEND INTEGRATION NOTES
// ============================================================================

export const IntegrationNotes = {
  phaseTransitions: [
    "LOBBY → IN_BATTLE: Server sends PHASE_CHANGE with startTime",
    "IN_BATTLE → RESULTS: Server sends BATTLE_RESULTS",
    "RESULTS → LOBBY: Client can request new battle or return to lobby",
  ],

  audioStreaming: [
    "Client captures audio in 20ms chunks during IN_BATTLE phase",
    "Each chunk includes timestamp relative to battleStartTime",
    "Format: AUDIO_CHUNK message with base64-encoded audioData",
    "Server analyzes and responds with PLAYER_SCORE_UPDATE",
  ],

  lyricSynchronization: [
    "Server provides lyrics array + lineDurations in SongConfig",
    "Client calculates current line: (now - battleStartTime) / lineDuration",
    "No client-side interval timers—use server's startTime as anchor",
    "Support time skew tolerance: ±100ms for network jitter",
  ],

  scoreAuthority: [
    "Client may optimistically increment score UI",
    "Server is authority: PLAYER_SCORE_UPDATE is the source of truth",
    "Client must not show final scores until BATTLE_RESULTS received",
  ],

  errorHandling: [
    "WebSocket disconnect during battle: reconnect and request LOBBY_SNAPSHOT",
    "Microphone permission denied: show error, allow retry",
    "Invalid operation (e.g., non-host starting battle): handled by ERROR message",
  ],

  futureExtensions: [
    "Implement time sync (NTP-like) for large clock skews",
    "Add battle pause/resume logic",
    "Support spectator mode (receive messages but don't send audio)",
    "Add difficulty multiplier to scoring",
  ],
};

export default {
  LobbyStateModel,
  PlayerStateModel,
  BattleStateModel,
  SongConfigModel,
  ClientMessages,
  ServerMessages,
  RestEndpoints,
  IntegrationNotes,
};

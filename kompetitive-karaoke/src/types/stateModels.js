/**
 * STATE MODELS & INTERFACES
 * 
 * JSDoc type definitions for Zustand store state.
 * These document the expected shape of all state objects.
 * 
 * AUTHORITY KEY:
 *   - SERVER-OWNED: Server is authoritative, client is read-only display
 *   - SHARED: Client sends, server validates and broadcasts result
 *   - CLIENT-ONLY: Never synced to server, local state only
 *   - TODO: BACKEND - marks fields/actions that need server integration
 */

/**
 * @typedef {Object} PlayerState
 * Represents a single player in a lobby
 * 
 * AUTHORITY: SERVER-OWNED (server manages full player list)
 * 
 * FIELD BREAKDOWN:
 *
 *   READ-ONLY (server assigns, client displays only):
 *     - id: unique player identifier assigned by server
 *     - name: player's display name (set at join)
 *     - socketId: server-side connection ID for WebSocket
 *     - isHost: whether this player can start the battle
 *     - connected: whether player is currently connected to server
 *
 *   MUTABLE BY CLIENT (client sends intent, server validates):
 *     - ready: player marking themselves as ready (validated by server)
 *
 *   CALCULATED BY SERVER (from audio analysis):
 *     - score: final calculated score (NOT client-computed)
 *     - combo: current combo multiplier (server-driven from audio quality)
 *     - accuracy: accuracy percentage (calculated from audio timing)
 *     - finished: set by server when player completes lyrics
 *
 * SCORING AUTHORITY:
 *   - Client must NOT calculate score locally
 *   - Client captures audio, sends chunks to server
 *   - Server analyzes audio + lyric timing, calculates score
 *   - Server broadcasts score via PLAYER_SCORE_UPDATE message
 *   - Client updates UI only from server messages
 *
 * TODO: BACKEND - Remove any client-side score calculation logic
 *                  Score should be:
 *                    accuracy = (correctSyllables / totalSyllables) * 100
 *                    combo = consecutive correct syllables (reset on miss)
 *                    score = baseScore * (1 + accuracyBonus) * comboMultiplier
 * 
 * @property {string} id - Unique player ID assigned by server
 * @property {string} name - Player's display name
 * @property {string} socketId - Server's WebSocket connection ID
 * @property {boolean} connected - Currently connected to server
 * @property {boolean} ready - Player marked as ready to battle
 * @property {boolean} isHost - Can this player start the battle?
 * @property {number} score - Total score (server-calculated, NOT client)
 * @property {number} combo - Consecutive correct syllables (server-tracked)
 * @property {number} accuracy - Accuracy % (server-calculated from audio analysis)
 * @property {boolean} finished - Whether player finished the lyrics
 */
export const PlayerStateShape = {
  id: "string",
  name: "string",
  socketId: "string | null",
  connected: "boolean",
  ready: "boolean",
  isHost: "boolean",
  score: "number",
  combo: "number",
  accuracy: "number",
  finished: "boolean",
};

/**
 * @typedef {Object} BattleState
 * Represents an active battle session
 * 
 * AUTHORITY: SERVER-OWNED (server controls battle flow)
 * 
 * TIMING & SYNCHRONIZATION:
 *   - startedAt: Server unix timestamp when battle began
 *   - durationMs: Total battle duration (from song length)
 *   - expectedEndAt: startedAt + durationMs (theoretical end time)
 *   - Server is the source of truth for time
 *   - Client calculates elapsed: (now - startedAt)
 *   - Client calculates currentLine: Math.floor(elapsedMs / lineAverageMs)
 * 
 * LYRIC PROGRESSION:
 *   - Lyrics array comes from SongConfig (sent by server)
 *   - Each lyric has a duration (in milliseconds)
 *   - Client calculates which line to display from elapsed time
 *   - Not interval-based (would desync across players)
 *   - Timestamp-based from server startedAt
 * 
 * PLAYER TRACKING:
 *   - finishedPlayers: Set of player IDs who reached end of lyrics
 *   - allFinished: true when all players finished (or timeout)
 *   - Server tracks when each player sends FINISH_BATTLE message
 * 
 * TODO: BACKEND
 *   - startedAt must be unix milliseconds (Date.now())
 *   - durationMs from SongConfig.durationMs
 *   - lineDurations array: duration of each lyric line in ms
 *   - lineTimings array: cumulative ms timestamps [0, 4000, 8000, ...]
 *   - Track player finish times for leaderboard
 *   - Handle timeout if battle runs too long (1.5x expected duration?)
 * 
 * @property {number} startedAt - Unix ms when battle started (for client sync)
 * @property {number} durationMs - Expected battle duration in milliseconds
 * @property {number} expectedEndAt - startedAt + durationMs
 * @property {string[]} finishedPlayers - Player IDs who finished lyrics
 * @property {boolean} allFinished - All players finished (or timeout reached)
 */
export const BattleStateShape = {
  startedAt: "number",
  durationMs: "number",
  expectedEndAt: "number",
  finishedPlayers: "string[]",
  allFinished: "boolean",
};

/**
 * @typedef {Object} SongConfig
 * Metadata for a single song
 * 
 * AUTHORITY: SERVER-OWNED (sent in lobby snapshot and battle start)
 * 
 * LYRIC PROGRESSION:
 *   - lyrics: array of line strings
 *   - lineDurations: time each line displays in milliseconds (e.g., [4000, 4000, 3500, ...])
 *   - lineTimings: cumulative timestamps [0, 4000, 8000, 11500, ...] (TODO: BACKEND)
 *   
 *   Client calculation for currentLine:
 *     elapsedMs = Date.now() - battle.startedAt
 *     currentLine = lineTimings.findIndex(t => t <= elapsedMs) for accurate lyric
 *     OR: currentLine = Math.floor(elapsedMs / avgLineDuration) for fallback
 * 
 * AUDIO STREAMING:
 *   - fileUrl: URL to download audio file
 *   - Used by client for karaoke backing track (future)
 *   - Not used in current mock implementation
 * 
 * TODO: BACKEND
 *   - Generate lineDurations from lyric timestamps
 *   - Include lineTimings in SongConfig for accuracy
 *   - Provide audio file at fileUrl for playback
 *   - Consider: should client pre-cache audio or stream?
 * 
 * @property {string} songId - Unique song ID
 * @property {string} title - Song title
 * @property {string} artist - Artist name
 * @property {number} durationMs - Total duration in milliseconds
 * @property {string[]} lyrics - Array of lyric lines
 * @property {number[]} lineDurations - Time each line displays in ms (TODO: BACKEND)
 * @property {number[]} lineTimings - Cumulative timestamps for each line (TODO: BACKEND)
 * @property {string} difficulty - "easy" | "medium" | "hard"
 * @property {number} maxScore - Maximum possible score for this song
 * @property {string} fileUrl - URL to audio file on server
 */
export const SongConfigShape = {
  songId: "string",
  title: "string",
  artist: "string",
  durationMs: "number",
  lyrics: "string[]",
  lineDurations: "number[]",              // TODO: BACKEND
  lineTimings: "number[]",                // TODO: BACKEND
  difficulty: "string",
  maxScore: "number",
  fileUrl: "string",
};

/**
 * @typedef {Object} LobbyState
 * Represents the full state of a karaoke lobby
 * 
 * STATE OWNERSHIP BREAKDOWN:
 *   - roomId, roomCode, maxPlayers: SERVER-OWNED, immutable after creation
 *   - phase: SERVER-OWNED, controlled by server transitions
 *   - players: SERVER-OWNED, server is authority on player list
 *   - song: SHARED, host selects, server validates and broadcasts
 *   - hostId: SERVER-OWNED, assigned at creation
 *   - battleStartTime: SERVER-OWNED, sent on PHASE_CHANGE to IN_BATTLE
 * 
 * BATTLE TIMING:
 *   - During LOBBY phase: battleStartTime is null
 *   - During IN_BATTLE phase: battleStartTime is unix ms when battle started
 *   - Client uses battleStartTime to calculate lyric progression
 *   - Do NOT use Date.now() - use server-provided battleStartTime
 *   - Lyric index: Math.floor((Date.now() - battleStartTime) / lineAvgDurationMs)
 * 
 * LYRIC PROGRESSION:
 *   - lyrics come from song.lyrics array
 *   - Current approach: fixed 4-second intervals (mock)
 *   - Server approach: line durations from SongConfig.lineDurations
 *   - Calculation: currentLine based on elapsed time, not client interval
 * 
 * TODO: BACKEND
 *   - Send battleStartTime in PHASE_CHANGE to IN_BATTLE message
 *   - Include lineDurations and lineTimings in SongConfig
 *   - Handle time skew: what if client/server clocks differ?
 *   - Consider NTP-like sync for large clock differences
 * 
 * @property {string | null} roomId - Unique lobby ID assigned by server
 * @property {string | null} roomCode - Short code for joining (e.g., "A7KQ")
 * @property {string | null} name - Lobby name
 * @property {number} maxPlayers - Maximum players allowed
 * @property {string} phase - "LOBBY" | "IN_BATTLE" | "RESULTS" (use LOBBY_PHASES enum)
 * @property {SongConfig | null} song - Currently selected song
 * @property {PlayerState[]} players - Array of all players in lobby
 * @property {string | null} hostId - ID of the player who can start battle
 * @property {number | null} battleStartTime - Unix ms when battle started
 */
export const LobbyStateShape = {
  roomId: "string | null",
  roomCode: "string | null",
  name: "string | null",
  maxPlayers: "number",
  phase: "string (LOBBY_PHASES enum)",
  song: "SongConfig | null",
  players: "PlayerState[]",
  hostId: "string | null",
  battleStartTime: "number | null",
};

/**
 * @typedef {Object} UseLobbyStoreState
 * Full Zustand store state
 * 
 * Combines lobby state, current user (client-only), and all actions.
 */
export const UseLobbyStoreStateShape = {
  // ---- LOBBY STATE ----
  lobby: "LobbyState",

  // ---- CLIENT-ONLY STATE ----
  currentUserId: "string | null",           // CLIENT-ONLY
  currentUserName: "string | null",         // CLIENT-ONLY

  // ---- ACTIONS: User Identity ----
  setCurrentUserId: "function(id: string) => void",
  setCurrentUserName: "function(name: string) => void",

  // ---- ACTIONS: Lobby Management ----
  setLobby: "function(lobby: LobbyState) => void",
  createLobby: "function(roomName: string, maxPlayers?: number) => void (TODO: BACKEND - async)",
  joinLobby: "function(mockLobby: LobbyState) => void (TODO: BACKEND - async)",

  // ---- ACTIONS: Player Management ----
  addPlayer: "function(player: PlayerState) => void (TODO: BACKEND - triggered by server)",
  removePlayer: "function(playerId: string) => void (TODO: BACKEND - triggered by server)",
  setReady: "function(playerId: string, ready: boolean) => void (TODO: BACKEND - send to server)",

  // ---- ACTIONS: Phase Management ----
  startBattle: "function() => void (TODO: BACKEND - wait for server PHASE_CHANGE)",
  endBattle: "function() => void (TODO: BACKEND - triggered by BATTLE_RESULTS)",
  resetToLobby: "function() => void (TODO: BACKEND - request server reset)",

  // ---- ACTIONS: Song Selection ----
  setSong: "function(song: SongConfig) => void (TODO: BACKEND - triggered by server)",

  // ---- ACTIONS: Scoring ----
  updateScore: "function(playerId: string, score: number, combo?: number, accuracy?: number) => void (TODO: BACKEND - server-driven)",
  setResults: "function(results: PlayerState[]) => void (TODO: BACKEND - triggered by BATTLE_RESULTS)",
};

/**
 * MUTATION RULES
 * 
 * ❌ NEVER DO THIS:
 *   - lobby.players[0].score = 100  (direct mutation)
 *   - lobby.phase = "IN_BATTLE"     (use action instead)
 *   - lobby.players.push(newPlayer) (use addPlayer action)
 * 
 * ✅ DO THIS INSTEAD:
 *   - updateScore(playerId, 100)
 *   - startBattle()
 *   - addPlayer(newPlayer)
 * 
 * WHY:
 *   - Zustand requires immutable updates for reactivity
 *   - Centralizing mutations makes server sync easier
 *   - Comments on each action clarify backend responsibility
 */

export default {
  PlayerStateShape,
  BattleStateShape,
  SongConfigShape,
  LobbyStateShape,
  UseLobbyStoreStateShape,
};

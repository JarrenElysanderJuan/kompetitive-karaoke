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
 * @property {string} id - Unique player ID assigned by server
 * @property {string} name - Player's display name
 * @property {string} socketId - Server's WebSocket connection ID (TODO: BACKEND)
 * @property {boolean} connected - Whether player is currently connected
 * @property {boolean} ready - Whether player marked as ready
 * @property {boolean} isHost - Whether player is the lobby host (can start battle)
 * @property {number} score - Current score (calculated by server)
 * @property {number} combo - Current combo multiplier (calculated by server, TODO: BACKEND)
 * @property {number} accuracy - Accuracy percentage (calculated by server, TODO: BACKEND)
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
 * @property {number} startedAt - Unix timestamp when battle started (TODO: BACKEND - for client lyric sync)
 * @property {number} durationMs - Expected battle duration in milliseconds
 * @property {number} expectedEndAt - startedAt + durationMs (TODO: BACKEND)
 * @property {string[]} finishedPlayers - Array of player IDs who finished
 * @property {boolean} allFinished - Whether all players finished
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
 * AUTHORITY: SERVER-OWNED (sent in lobby snapshot)
 * 
 * @property {string} songId - Unique song ID
 * @property {string} title - Song title
 * @property {string} artist - Artist name
 * @property {number} durationMs - Total duration in milliseconds
 * @property {string[]} lyrics - Array of lyric lines
 * @property {string} difficulty - "easy" | "medium" | "hard"
 * @property {number} maxScore - Maximum possible score for this song
 * @property {string} fileUrl - URL to audio file on server (TODO: BACKEND)
 */
export const SongConfigShape = {
  songId: "string",
  title: "string",
  artist: "string",
  durationMs: "number",
  lyrics: "string[]",
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
 *   - battleStartTime: TODO: BACKEND, server sends when battle starts
 * 
 * @property {string | null} roomId - Unique lobby ID assigned by server
 * @property {string | null} roomCode - Short code for joining (e.g., "A7KQ")
 * @property {string | null} name - Lobby name
 * @property {number} maxPlayers - Maximum players allowed
 * @property {string} phase - "LOBBY" | "IN_BATTLE" | "RESULTS" (use LOBBY_PHASES enum)
 * @property {SongConfig | null} song - Currently selected song
 * @property {PlayerState[]} players - Array of all players in lobby
 * @property {string | null} hostId - ID of the player who can start battle
 * @property {number | null} battleStartTime - Unix ms when battle started (TODO: BACKEND)
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

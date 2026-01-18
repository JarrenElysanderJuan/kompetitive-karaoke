
import { create } from "zustand";

/**
 * PHASE CONSTANTS
 * Valid lobby phase values. Server drives these transitions.
 */
export const LOBBY_PHASES = {
  LOBBY: "LOBBY",           // Players joining, before battle starts
  LOADING: "LOADING",       // Pre-loading audio assets
  IN_BATTLE: "IN_BATTLE",   // Battle active, lyrics displayed, audio streaming
  RESULTS: "RESULTS",       // Battle ended, showing results/podium
};

export const useLobbyStore = create((set, get) => ({
  // ============================================================================
  // LOBBY STATE
  // ============================================================================
  // 
  // STATE OWNERSHIP:
  //   SERVER-OWNED (authoritative, client display-only):
  //     - roomId: unique identifier assigned by server
  //     - roomCode: short join code, assigned by server
  //     - maxPlayers: set at creation, immutable
  //     - phase: controlled by server (LOBBY → IN_BATTLE → RESULTS)
  //     - players[]: full player list with server-validated state
  //
  //   SHARED (client sends, server validates):
  //     - song: server selects, client displays
  //     - name: client proposes, server confirms
  //
  //   CLIENT-ONLY (never synced to server):
  //     - currentUserId, currentUserName: local user identity
  //
  // BATTLE TIMING:
  //   - battleStartTime: unix ms when battle started (from server)
  //   - Used by client to calculate lyric progression
  //   - Do NOT use Date.now() for lyric timing
  //   - Calculate elapsed: (Date.now() - battleStartTime)
  //   - Calculate currentLine: Math.floor(elapsed / lineDurationMs)
  //
  // MUTATION RULES:
  //   - Never mutate lobby.players directly in component code
  //   - Always use actions: addPlayer(), removePlayer(), setReady(), updateScore()
  //   - Use LOBBY_PHASES constant for phase checks (never string literals)
  //   - Only set battleStartTime via setBattleStartTime() action
  //
  lobby: {
    roomId: null,                           // SERVER-OWNED
    roomCode: null,                         // SERVER-OWNED
    name: null,                             // SERVER-OWNED
    maxPlayers: 4,                          // SERVER-OWNED
    phase: LOBBY_PHASES.LOBBY,              // SERVER-OWNED (controls UI state)
    song: null,                             // SHARED { songId, title, fileUrl, durationMs, difficulty, lyrics, lineDurations, lineTimings }
    players: [],                            // SERVER-OWNED { id, name, ready, score, combo, accuracy, finished, isHost }
    hostId: null,                           // SERVER-OWNED (who can start battle)
    battleStartTime: null,                  // SERVER-OWNED - unix ms from PHASE_CHANGE message (for lyric sync)
    availableSongs: [],                     // SERVER-OWNED - list of available songs from server
  },

  // Helper to set battle start time (triggered by PHASE_CHANGE message)
  setBattleStartTime: (timestamp) =>
    set((state) => ({
      lobby: { ...state.lobby, battleStartTime: timestamp }
    })),
  setLobby: (lobby) => set({ lobby }),


  // ============================================================================
  // CONNECTION STATE (Client-Only)
  // ============================================================================
  connectionState: 'disconnected',          // 'disconnected' | 'connecting' | 'connected'
  connectionError: null,                    // Error object | null

  setConnectionState: (status) => set({ connectionState: status }),
  setConnectionError: (error) => set({ connectionError: error }),

  // ============================================================================
  // CLIENT-ONLY STATE (never synced to server)
  // ============================================================================
  // These fields represent the current user's local identity.
  // Server does NOT track these; they only exist on this client.
  //
  currentUserId: null,                      // CLIENT-ONLY - unique ID for this user session
  currentUserName: null,                    // CLIENT-ONLY - user's display name
  setCurrentUserId: (id) => set({ currentUserId: id }),
  setCurrentUserName: (name) => set({ currentUserName: name }),

  // ============================================================================
  // LOBBY ACTIONS - Player Management
  // ============================================================================

  /**
   * addPlayer: Add a player to the lobby
   * AUTHORITY: Server (client calls this when server broadcasts player join)
   * 
   * PLAYER FIELDS RECEIVED FROM SERVER:
   *   - id: unique identifier (assigned by server)
   *   - name: display name (from join request)
   *   - ready: false (initial state)
   *   - score: 0 (initial score)
   *   - isHost: based on lobby state
   *   - connected: true (just joined)
   *   - (other fields set by server)
   *
   * TODO: BACKEND - this will be triggered by "PLAYER_JOINED" or "LOBBY_SNAPSHOT" message
   */
  addPlayer: (player) =>
    set((state) => {
      // Idempotency check: don't add if already exists
      if (state.lobby.players.find(p => p.id === player.id)) {
        return state;
      }
      return {
        lobby: { ...state.lobby, players: [...state.lobby.players, player] },
      };
    }),

  /**
   * removePlayer: Remove a player from the lobby
   * AUTHORITY: Server (client calls when server broadcasts player leave)
   * 
   * Triggered when:
   *   - Player manually leaves
   *   - Player disconnects
   *   - Player gets kicked by host
   *
   * TODO: BACKEND - triggered by "PLAYER_LEFT" or connection drop
   */
  removePlayer: (playerId) =>
    set((state) => ({
      lobby: {
        ...state.lobby,
        players: state.lobby.players.filter((p) => p.id !== playerId),
      },
    })),

  /**
   * setReady: Update a player's ready status
   * AUTHORITY: Shared (client sends intention, server validates and broadcasts)
   * 
   * MUTABLE FIELD: ready (only this field is client-mutable)
   * 
   * Client-side flow:
   *   1. User clicks "Ready" button in UI
   *   2. Call setReady(currentUserId, true)
   *   3. Optimistically update local state
   *   4. Send "SET_READY" event to server
   *   5. Server validates and broadcasts to all players
   *   6. Receive "PLAYER_READY_UPDATE" message confirming
   * 
   * ❌ DO NOT mutate other player fields here (score, combo, accuracy, etc.)
   *    Those are server-calculated and only updated via updateScore()
   *
   * TODO: BACKEND - send "SET_READY" event to server, update on server response
   */
  setReady: (playerId, ready) =>
    set((state) => ({
      lobby: {
        ...state.lobby,
        players: state.lobby.players.map((p) =>
          p.id === playerId ? { ...p, ready } : p
        ),
      },
    })),

  /**
   * setSong: Set the battle song for this lobby
   * AUTHORITY: Server (host selects, server validates and broadcasts)
   * TODO: BACKEND - triggered by "SONG_SELECTED" server message
   */
  setSong: (song) =>
    set((state) => ({
      lobby: { ...state.lobby, song },
    })),

  // ============================================================================
  // LOBBY ACTIONS - Phase Management (SERVER-DRIVEN)
  // ============================================================================

  /**
   * startBattle: Transition lobby from LOBBY → IN_BATTLE
   * AUTHORITY: Server (only host can request, server validates and broadcasts)
   * 
   * CLIENT FLOW:
   *   1. Host clicks "Start Battle" button
   *   2. Send "START_BATTLE" to server
   *   3. Wait for "PHASE_CHANGE" message from server
   *   4. Server validates: all ready? song selected? room full?
   *   5. Server broadcasts PHASE_CHANGE with:
   *      - phase: "IN_BATTLE"
   *      - startTime: unix ms (server's battle start time)
   *      - song: SongConfig with lyrics, lineDurations, lineTimings
   *   6. Call startBattle() + setBattleStartTime(startTime)
   *   7. BattlePage mounts, audio capture starts
   * 
   * TIMING SYNCHRONIZATION:
   *   - Use server's startTime, NOT Date.now()
   *   - All clients show same lyric at same moment
   *   - Audio chunks timestamped relative to startTime
   * 
   * LYRIC PROGRESSION:
   *   - Song config includes lineTimings (cumulative ms)
   *   - Client calculates: currentLine from (Date.now() - startTime)
   *   - NOT fixed 4-second intervals
   * 
   * TODO: BACKEND
   *   - Host-only validation on server
   *   - Send PHASE_CHANGE with startTime + song metadata
   *   - Include lineDurations and lineTimings in song
   *   - Kick clients if they miss PHASE_CHANGE
   */
  startBattle: () =>
    set((state) => ({
      lobby: { ...state.lobby, phase: LOBBY_PHASES.IN_BATTLE }
    })),

  /**
   * endBattle: Transition lobby from IN_BATTLE → RESULTS
   * AUTHORITY: Server (when all players finish or timeout, server broadcasts)
   * 
   * TRIGGERED BY:
   *   - All players sent FINISH_BATTLE message
   *   - OR timeout: (currentTime - startTime) >= expectedEndTime * 1.5
   *   - Server sends BATTLE_RESULTS message
   * 
   * SERVER CALCULATES:
   *   - Final scores for all players
   *   - Rankings (sort by score, then by finish time)
   *   - Any achievements or badges
   * 
   * CLIENT RESPONSIBILITIES:
   *   - Stop audio capture
   *   - Stop sending audio chunks
   *   - Display results from server
   *   - Do NOT calculate final scores
   *   - Do NOT rerank players
   * 
   * TODO: BACKEND
   *   - Detect when all players finished or timeout reached
   *   - Calculate final rankings on server
   *   - Send BATTLE_RESULTS with final player list
   *   - Transition phase to RESULTS
   */
  endBattle: () =>
    set((state) => ({
      lobby: { ...state.lobby, phase: LOBBY_PHASES.RESULTS }
    })),

  /**
   * resetToLobby: Transition lobby from RESULTS → LOBBY
   * AUTHORITY: Server or Client (client requests, server confirms)
   * 
   * WHEN CALLED:
   *   - User clicks "Back to Lobby" on results screen
   *   - Send event to server requesting reset
   *   - Server validates (is host? do they want another round?)
   *   - Server broadcasts phase change
   * 
   * CLEANUP:
   *   - Clear battle state (battleStartTime = null)
   *   - Reset ready status for all players (ready = false)
   *   - Keep players in lobby (don't eject)
   *   - Clear song selection (for next round)
   * 
   * TODO: BACKEND
   *   - Clear server battle state
   *   - Send PHASE_CHANGE to LOBBY
   *   - Allow host to select new song
   */
  resetToLobby: () =>
    set((state) => ({
      lobby: {
        ...state.lobby,
        phase: LOBBY_PHASES.LOBBY,
        battleStartTime: null  // Clear timing when returning to lobby
      }
    })),

  // ============================================================================
  // LOBBY ACTIONS - Scoring (SERVER-DRIVEN)
  // ============================================================================

  /**
   * updateScore: Update a player's score, combo, and accuracy
   * AUTHORITY: Server (calculates from audio analysis, broadcasts to all clients)
   * 
   * SCORE CALCULATION FLOW:
   *   1. Client captures audio during battle (20ms chunks)
   *   2. Client sends audio chunks to server with timestamps
   *   3. Server analyzes audio:
   *      - Extracts vocal patterns
   *      - Compares against expected lyric syllables
   *      - Measures timing accuracy
   *   4. Server calculates:
   *      - accuracy = (correctSyllables / totalSyllables) * 100
   *      - combo = consecutive correct syllables (resets on misses)
   *      - score = baseScore * accuracyMultiplier * comboMultiplier
   *   5. Server broadcasts PLAYER_SCORE_UPDATE message
   *   6. Client receives and calls updateScore()
   * 
   * FIELDS UPDATED HERE (ALL server-calculated, never client-local):
   *   - score: total accumulated score for this battle
   *   - combo: current streak of correct syllables
   *   - accuracy: % of syllables sung correctly
   * 
   * ❌ CLIENT MUST NOT:
   *     - Calculate score locally
   *     - Guess accuracy from audio
   *     - Estimate combo from timing
   *   
   *   Always wait for server PLAYER_SCORE_UPDATE message
   *
   * TODO: BACKEND - this is triggered by "PLAYER_SCORE_UPDATE" message from server
   *                  NOT by client calculation
   *                  Implement server scoring algorithm:
   *                    - syllable detection from audio
   *                    - timing comparison against lyric marks
   *                    - accuracy/combo calculation
   */
  updateScore: (playerId, score, combo = 0, accuracy = 0) =>
    set((state) => ({
      lobby: {
        ...state.lobby,
        players: state.lobby.players.map((p) =>
          p.id === playerId ? { ...p, score, combo, accuracy } : p
        ),
      },
    })),

  /**
   * setResults: Set final results when battle ends
   * AUTHORITY: Server (calculates final scores, broadcasts in "BATTLE_RESULTS")
   * 
   * SERVER RESPONSIBILITIES:
   *   - Determines when battle ends (all players finish or timeout)
   *   - Calculates final scores for all players
   *   - Ranks players by score
   *   - Sends BATTLE_RESULTS message with final player list
   * 
   * CLIENT RESPONSIBILITIES:
   *   - Receives setResults() call from BATTLE_RESULTS handler
   *   - Updates players in store with final scores
   *   - Displays results page with server-provided rankings
   *   - Does NOT recalculate or adjust final scores
   *
   * TODO: BACKEND - triggered by "BATTLE_RESULTS" server message
   *                  Include final scores, rankings, and any badges/achievements
   */
  setResults: (results) =>
    set((state) => ({
      lobby: { ...state.lobby, players: results },
    })),

  // ============================================================================
  // LOBBY ACTIONS - Lobby Lifecycle
  // ============================================================================

  /**
   * createLobby: Create a new lobby (host-only action)
   * AUTHORITY: Client proposes, Server creates (generates roomId, roomCode)
   * TODO: BACKEND - replace with WebSocket "CREATE_LOBBY" event
   *                  currently: synchronous, will become async
   *                  will return roomId + roomCode from server
   */
  createLobby: (roomName, maxPlayers = 4) =>
    set(() => {
      const id = Math.random().toString(36).substring(2, 8).toUpperCase();
      const state = get();
      return {
        lobby: {
          roomId: id,
          roomCode: id,
          name: roomName,
          maxPlayers,
          phase: LOBBY_PHASES.LOBBY,
          song: null,
          players: [
            {
              id: state.currentUserId,
              name: state.currentUserName,
              ready: false,
              score: 0,
              combo: 0,
              accuracy: 0,
              finished: false,
              isHost: true,
              socketId: null,
              connected: true,
            },
          ],
          hostId: state.currentUserId,
        },
      };
    }),

  /**
   * joinLobby: Join an existing lobby by room code
   * AUTHORITY: Client proposes, Server validates (checks room exists, not full)
   * TODO: BACKEND - replace with WebSocket "JOIN_LOBBY" event
   *                  currently: synchronous, will become async
   *                  will validate on server before confirming join
   */
  joinLobby: (mockLobby) =>
    set(() => {
      const state = get();
      // Check if player already in lobby
      if (!mockLobby.players.find((p) => p.id === state.currentUserId)) {
        mockLobby.players.push({
          id: state.currentUserId,
          name: state.currentUserName,
          ready: false,
          score: 0,
          combo: 0,
          accuracy: 0,
          finished: false,
          isHost: false,
          socketId: null,
          connected: true,
        });
      }

      return { lobby: mockLobby };
    }),
}));

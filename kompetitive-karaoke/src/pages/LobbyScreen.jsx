import { useState } from "react";
import { useLobbyStore, LOBBY_PHASES } from "../store/lobbyStore";
import BattlePage from "./BattlePage";
import ResultsPage from "./ResultsPage";
import LoadingScreen from "./LoadingScreen";
import PlayerList from "../components/PlayerList";
import SongSelect from "../components/SongSelect";
import LobbyActions from "../components/LobbyActions";

/**
 * LobbyScreen: Main lobby view for players to ready up and start battles
 * 
 * PHASE TRANSITIONS:
 *   - LOBBY → player views this screen, readies up, host starts battle
 *   - IN_BATTLE → shows BattlePage instead
 *   - RESULTS → shows ResultsPage instead
 * 
 * READY STATUS FLOW (With Backend):
 *   
 *   Initial State:
 *   ┌─────────────┐
 *   │   LOBBY     │  All players not ready
 *   │  phase      │  Host cannot start
 *   └─────────────┘
 *           ↓ Player 1 clicks "Ready Up"
 *   
 *   POST /api/lobbies/{roomId}/ready { userId: player1, ready: true }
 *   Server: updates database, broadcasts PLAYER_READY_UPDATE
 *   WebSocket → All Clients: { type: 'PLAYER_READY_UPDATE', userId: player1, ready: true }
 *   
 *   Store Updates:
 *   ┌─────────────┐
 *   │   LOBBY     │  Players = [{ id: p1, ready: true }, { id: p2, ready: false }]
 *   │  phase      │  allReady = false
 *   │             │  Host button still disabled
 *   └─────────────┘
 *           ↓ Player 2 clicks "Ready Up"
 *   
 *   POST /api/lobbies/{roomId}/ready { userId: player2, ready: true }
 *   Server: updates database, broadcasts PLAYER_READY_UPDATE
 *   WebSocket → All Clients: { type: 'PLAYER_READY_UPDATE', userId: player2, ready: true }
 *   
 *   Store Updates:
 *   ┌─────────────┐
 *   │   LOBBY     │  Players = [{ id: p1, ready: true }, { id: p2, ready: true }]
 *   │  phase      │  allReady = true
 *   │             │  Host button ENABLED ✓
 *   └─────────────┘
 *           ↓ Host clicks "Start Battle"
 *   
 *   POST /api/lobbies/{roomId}/start-battle
 *   Server: validates allReady, song selected, phase=LOBBY
 *   Server: generates battleStartTime (unix timestamp)
 *   Server: updates phase to IN_BATTLE in database
 *   Server: broadcasts PHASE_CHANGE to all clients
 *   WebSocket → All Clients: 
 *     {
 *       type: 'PHASE_CHANGE',
 *       newPhase: 'IN_BATTLE',
 *       battleStartTime: 1704067200000,  // unix ms
 *       song: { songId, lyrics, lineDurations, ... }
 *     }
 *   
 *   Store Updates + Phase Transition:
 *   ┌─────────────────┐
 *   │   IN_BATTLE     │  All players synchronized
 *   │  phase          │  Audio capture starts
 *   │  battleStartTime│  Lyrics display begins
 *   │  (server time)  │  Score tracking starts
 *   └─────────────────┘
 * 
 * CURRENT FLOW (Mock - No Backend):
 *   1. Players click "Ready Up" locally
 *   2. Store updates only local players array
 *   3. Each player sees their own ready status
 *   4. Inconsistent state across players (no sync)
 *   5. Host clicks "Start Battle" → phase changes locally only
 *   6. Only that client transitions to BattlePage
 *   7. NOT MULTIPLAYER (each client independent)
 * 
 * TODO: BACKEND INTEGRATION POINTS
 * 
 * 1. POST /api/lobbies/{roomId}/ready
 *    When: Player clicks "Ready Up" button
 *    Payload: { userId, ready: true/false }
 *    Response: { success: true } or error
 *    Error cases:
 *      - 403: User not in lobby
 *      - 400: Lobby not in LOBBY phase
 *      - 500: Database error
 *    On success: Wait for WebSocket PLAYER_READY_UPDATE broadcast
 *    On error: Show toast error, allow retry
 * 
 * 2. WebSocket PLAYER_READY_UPDATE
 *    Received from: Server
 *    Payload: { userId, ready: true/false, roomId, timestamp }
 *    Action:
 *      - Find player in store by userId
 *      - Update players[i].ready = payload.ready
 *      - Recalculate allReady = players.every(p => p.ready)
 *      - Re-render immediately (< 100ms)
 *    Sent to: All players in room
 * 
 * 3. POST /api/lobbies/{roomId}/start-battle
 *    When: Host clicks "Start Battle" button
 *    Preconditions: Host MUST verify these exist:
 *      - All players ready
 *      - Song selected (lobby.song !== null)
 *      - Lobby phase is LOBBY
 *    Server validation repeats all checks
 *    Response: { battleStartTime: 1704067200000, phase: 'IN_BATTLE', ... }
 *    Error cases:
 *      - 403: User is not host
 *      - 400: Not all players ready
 *      - 400: No song selected
 *      - 400: Lobby not in LOBBY phase
 *      - 500: Database error
 *    On success: Wait for WebSocket PHASE_CHANGE broadcast
 *    On error: Show toast error, allow retry
 * 
 * 4. WebSocket PHASE_CHANGE
 *    Received from: Server
 *    Payload: 
 *      {
 *        type: 'PHASE_CHANGE',
 *        newPhase: 'IN_BATTLE',
 *        battleStartTime: 1704067200000,
 *        song: { songId, title, lyrics, lineDurations: [...], lineTimings: [...] },
 *        roomId
 *      }
 *    Action:
 *      - Update store: lobby.phase = 'IN_BATTLE'
 *      - Update store: lobby.battleStartTime = payload.battleStartTime
 *      - Update store: lobby.song = payload.song
 *      - Trigger: Component re-renders and shows BattlePage
 *      - Note: All 4 players receive this simultaneously
 *      - Lyric sync: Client uses (Date.now() - battleStartTime)
 *    Sent to: All players in room
 * 
 * VALIDATION BEFORE ALLOWING START:
 *   ✓ Host check: isHost = lobby.hostId === currentUserId
 *   ✓ All ready check: allReady = players.every(p => p.ready)
 *   ✓ Song selected: lobby.song !== null (shown in UI)
 *   ✓ Correct phase: lobby.phase === LOBBY_PHASES.LOBBY
 * 
 * ERROR SCENARIOS & RECOVERY:
 * 
 *   Scenario A: Player unreadies after others are ready
 *   - Player A ready, Player B ready
 *   - Host sees "Start Battle" enabled
 *   - Player B clicks "Ready Up" again (toggle)
 *   - Server broadcasts PLAYER_READY_UPDATE { userId: B, ready: false }
 *   - allReady becomes false
 *   - Host sees "Start Battle" disabled again
 *   - Expected behavior: ✅ Works
 * 
 *   Scenario B: Player joins after others are ready
 *   - Player A ready, Player B ready
 *   - New player C joins (POST /join)
 *   - Server sets players[C].ready = false
 *   - Server broadcasts PLAYER_READY_UPDATE { userId: C, ready: false }
 *   - allReady becomes false
 *   - Host sees "Start Battle" disabled
 *   - Expected behavior: ✅ Works
 * 
 *   Scenario C: Player leaves lobby
 *   - Player A ready, Player B ready, Player C leaves
 *   - Server removes C from players array
 *   - Server broadcasts PLAYER_LEFT { userId: C }
 *   - Store updates: players = [A, B] (C removed)
 *   - allReady still true (remaining players ready)
 *   - Host can still start
 *   - Expected behavior: ✅ Works
 * 
 *   Scenario D: Host clicks start but server disagrees (race condition)
 *   - Host clicks "Start Battle"
 *   - Client sends POST /start-battle
 *   - Meanwhile: Player B unreadies
 *   - Server receives unready BEFORE start-battle request
 *   - Server rejects start-battle with 400 NOT_ALL_READY
 *   - Client shows error toast
 *   - Expected behavior: ✅ Prevented inconsistent state
 * 
 * STATE CONSISTENCY:
 *   - Server is source of truth for player ready state
 *   - Client trusts WebSocket broadcasts (eventually consistent)
 *   - If client loses connection: show "Connection lost"
 *   - If client reconnects: fetch latest lobby state
 * 
 * PERFORMANCE CONSIDERATIONS:
 *   - Ready status should update within 100-200ms (network latency)
 *   - UI response to clicks: instant (optimistic update possible TODO)
 *   - BattlePage transition: < 100ms (should not freeze UI)
 *   - No memory leaks on unmount
 */

function LobbyScreen() {
  const lobby = useLobbyStore((state) => state.lobby);
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const setSong = useLobbyStore((state) => state.setSong);
  const setReady = useLobbyStore((state) => state.setReady);
  const startBattle = useLobbyStore((state) => state.startBattle);
  const endBattle = useLobbyStore((state) => state.endBattle);

  const [showResults, setShowResults] = useState(false);

  if (!lobby) {
    return <div className="text-white">No lobby joined</div>;
  }

  const isHost = lobby.hostId === currentUserId;
  const allReady = lobby.players.every((p) => p.ready);

  // Render BattlePage if phase is IN_BATTLE
  if (lobby.phase === LOBBY_PHASES.IN_BATTLE) {
    return <BattlePage onEnd={(score) => endBattle({ score })} />;
  }

  // Render ResultsPage if phase is RESULTS or user opts to view it
  if (showResults || lobby.phase === LOBBY_PHASES.RESULTS) {
    return (
      <ResultsPage
        players={lobby.players}
        onBack={() => {
          setShowResults(false);
          // Reset phase back to LOBBY
          useLobbyStore.getState().setLobby({
            ...lobby,
            phase: LOBBY_PHASES.LOBBY,
          });
        }}
      />
    );
  }

  // Render Lobby UI (LOBBY phase)
  return (
    <div className="w-screen h-screen bg-gray-900 flex justify-center items-center">
      <div className="w-3/4 h-5/6 bg-gray-800 rounded-lg p-6 flex flex-col text-white">
        <h1 className="text-3xl font-bold text-center mb-6">
          Lobby: {lobby.roomName}
        </h1>
        <p className="text-center text-gray-400 mb-4">
          Room Code: <strong>{lobby.roomCode}</strong> | Players:{" "}
          <strong>
            {lobby.players.length}/{lobby.maxPlayers}
          </strong>
        </p>

        <div className="flex flex-1 gap-6">
          <PlayerList players={lobby.players} hostId={lobby.hostId} />
          <div className="flex-1 bg-gray-700 rounded p-4 flex flex-col justify-between">
            <SongSelect
              selectedSong={lobby.song?.songId || ""}
              onChange={(songId) => setSong(songId)}
            />
            <LobbyActions
              isHost={isHost}
              allReady={allReady}
              onReadyToggle={() =>
                setReady(
                  currentUserId,
                  !lobby.players.find((p) => p.id === currentUserId)?.ready
                )
              }
              onStart={() => startBattle()}
            />
            {/* Button to view results after battle */}
            {lobby.phase === LOBBY_PHASES.RESULTS && (
              <button
                className="mt-4 px-4 py-2 bg-blue-600 rounded font-bold"
                onClick={() => setShowResults(true)}
              >
                View Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;

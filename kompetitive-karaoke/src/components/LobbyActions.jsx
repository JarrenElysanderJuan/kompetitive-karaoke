/**
 * LobbyActions: Controls for ready status and battle start
 * 
 * BACKEND INTEGRATION POINTS:
 * 
 * Current Flow (Mock):
 *   1. Player clicks "Ready Up" button
 *   2. Component calls onReadyToggle()
 *   3. Store updates local player.ready state
 *   4. UI re-renders to show status
 *   5. Host sees "Start Battle" enabled when allReady=true
 *   6. Host clicks "Start Battle" → triggers startBattle()
 * 
 * Future Flow (With Backend):
 *   1. Player clicks "Ready Up" button
 *   2. Component sends: POST /api/lobbies/{roomId}/ready
 *      Payload: { userId, ready: true/false }
 *   3. Server broadcasts: WebSocket MESSAGE_TYPES.PLAYER_READY_UPDATE
 *      Payload: { userId, ready: true/false, roomId }
 *   4. All clients receive update via WebSocket
 *   5. UI updates for all players simultaneously
 *   6. Host sees "Start Battle" enabled when all players ready
 *   7. Host clicks "Start Battle" → POST /api/lobbies/{roomId}/start-battle
 *   8. Server validates: all players ready, song selected, phase=LOBBY
 *   9. Server responds: updated lobby with phase=IN_BATTLE, battleStartTime
 *   10. Server broadcasts: WebSocket MESSAGE_TYPES.PHASE_CHANGE
 *   11. All clients transition to BattlePage
 * 
 * UI States:
 *   - Button text: "Ready Up" (not ready) → "Ready ✓" (ready)
 *   - Button disabled: false (always enabled for players)
 *   - Start button disabled: true (until allReady=true)
 *   - Start button disabled: true (until host clicks, then loading)
 * 
 * Error Handling (TODO: BACKEND):
 *   - Server rejects ready update: show error toast
 *   - Server rejects start battle: invalid state, show error
 *   - Network timeout: retry, show error if fails
 *   - User leaves during ready: auto-unready them
 * 
 * TODO: BACKEND
 *   - POST /api/lobbies/{roomId}/ready endpoint
 *   - Validate user in lobby and phase=LOBBY
 *   - Broadcast PLAYER_READY_UPDATE to all clients
 *   - Track which players ready in database
 * 
 *   - POST /api/lobbies/{roomId}/start-battle endpoint
 *   - Validate: host is caller, all players ready, song selected
 *   - Generate battleStartTime on server
 *   - Update phase to IN_BATTLE
 *   - Broadcast PHASE_CHANGE to all clients
 *   - Clients receive battleStartTime to sync lyrics
 */

export default function LobbyActions({ isHost, allReady, onReadyToggle, onStart }) {
  return (
    <div className="flex gap-4 mt-6">
      <button
        onClick={onReadyToggle}
        className="flex-1 bg-blue-600 hover:bg-blue-700 p-3 rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Ready Up
      </button>
      {isHost && (
        <button
          onClick={onStart}
          disabled={!allReady}
          className={`flex-1 p-3 rounded font-semibold transition ${
            allReady ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 cursor-not-allowed opacity-50"
          }`}
          title={!allReady ? "All players must be ready before starting" : "Start the battle"}
        >
          Start Battle
        </button>
      )}
    </div>
  );
}
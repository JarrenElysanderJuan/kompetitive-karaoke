import PlayerItem from "./PlayerItem";

/**
 * PlayerList: Display all players in lobby with ready status
 * 
 * DISPLAYS:
 *   - Player list with names, host indicator, ready status
 *   - Updated in real-time as players ready/unready
 *   - Host marked with crown (👑)
 * 
 * BACKEND INTEGRATION:
 *   - Receives players array from store (updated via WebSocket)
 *   - When server broadcasts PLAYER_READY_UPDATE:
 *     1. Server updates database: players[i].ready = true/false
 *     2. Server sends WebSocket message to all clients
 *     3. Client store updates players array
 *     4. This component re-renders with new status
 *   - All players see same state simultaneously
 * 
 * Real-Time Update Flow (TODO: BACKEND):
 *   1. Player A clicks "Ready Up"
 *   2. Client sends: POST /api/lobbies/{roomId}/ready { ready: true }
 *   3. Server updates database
 *   4. Server broadcasts: WebSocket PLAYER_READY_UPDATE { playerId, ready: true }
 *   5. All clients (including Player A) receive message
 *   6. Store updates: players[indexA].ready = true
 *   7. PlayerList re-renders for all users
 * 
 *   If all players are ready:
 *   8. Host sees "Start Battle" button enabled
 *   9. Host can click to start battle phase
 * 
 * Performance Notes:
 *   - Should not re-render unless players array changed
 *   - Use React.memo if performance issues arise
 *   - Typical 2-4 players, rendering should be < 1ms
 */

export default function PlayerList({ players, hostId }) {
  return (
    <div className="w-1/3 bg-gray-700 rounded p-4">
      <h2 className="text-xl font-semibold mb-4">Players ({players.length})</h2>
      <ul className="space-y-2">
        {players && players.length > 0 ? (
          players.map((player) => (
            <PlayerItem
              key={player.id}
              player={player}
              isHost={player.id === hostId}
            />
          ))
        ) : (
          <li className="text-gray-400">No players in lobby</li>
        )}
      </ul>
    </div>
  );
}
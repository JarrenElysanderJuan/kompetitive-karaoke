/**
 * PlayerItem: Display individual player status in lobby
 * 
 * DISPLAYS:
 *   - Player name
 *   - Host crown icon (👑) if isHost
 *   - Ready status: "Ready" (green) or "Not Ready" (red)
 * 
 * BACKEND INTEGRATION:
 *   - This component receives player object from store
 *   - player.ready updated via WebSocket PLAYER_READY_UPDATE
 *   - No direct user interaction (parent handles clicks)
 *   - Re-renders when server broadcasts ready status change
 * 
 * Future Enhancements (TODO):
 *   - Show player avatar/profile picture
 *   - Show player connection status (online/offline)
 *   - Show player latency/ping indicator
 *   - Show player score from previous battle
 *   - Allow host to kick player (admin action)
 */

export default function PlayerItem({ player, isHost }) {
  return (
    <li className="flex justify-between items-center bg-gray-600 p-2 rounded">
      <span>
        {player.name}
        {isHost && <span className="ml-2">👑</span>}
      </span>
      <span
        className={`text-sm font-semibold ${
          player.ready ? "text-green-400" : "text-red-400"
        }`}
      >
        {player.ready ? "Ready" : "Not Ready"}
      </span>
    </li>
  );
}
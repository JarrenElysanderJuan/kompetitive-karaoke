/**
 * ScoreCardSidebar - Live score display during battle
 * 
 * STATE AUTHORITY:
 *   - Reads scores directly from Zustand store
 *   - Store receives scores from server via PLAYER_SCORE_UPDATE messages
 *   - This component NEVER calculates scores locally
 *   - Only responsibility: display server-provided scores
 * 
 * SCORE DATA FLOW:
 *   Server (audio analysis) -> updateScore() -> Zustand store -> this component
 * 
 * TODO: BACKEND - scores come from real server once integrated
 *       Currently from mock WebSocket (no actual audio analysis)
 */

import { useLobbyStore } from "../store/lobbyStore";

export default function ScoreCardSidebar() {
  // Read players directly from the store
  // These scores are from server (or mock) - never calculated here
  const players = useLobbyStore((state) => state.lobby.players);

  // Sort descending by server-provided scores
  const sortedScores = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="w-64 bg-gray-800 text-white p-4 rounded space-y-2">
      <h2 className="text-xl font-bold mb-2 text-center">Scores</h2>
      <ul>
        {sortedScores.map((player, idx) => {
          let bgColor = "bg-gray-700 text-white";
          if (idx === 0) bgColor = "bg-yellow-400 text-black";
          else if (idx === 1) bgColor = "bg-gray-300 text-black";
          else if (idx === 2) bgColor = "bg-yellow-700 text-black";
          return (
            <li key={player.id} className={`flex justify-between p-2 rounded mb-1 ${bgColor}`}>
              <span>{player.name}</span>
              <span>{player.score}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
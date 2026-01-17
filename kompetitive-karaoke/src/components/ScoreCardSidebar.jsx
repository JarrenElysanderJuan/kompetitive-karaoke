import { useLobbyStore } from "../store/lobbyStore";

export default function ScoreCardSidebar() {
  // Read players directly from the store
  const players = useLobbyStore((state) => state.lobby.players);

  // Sort descending
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
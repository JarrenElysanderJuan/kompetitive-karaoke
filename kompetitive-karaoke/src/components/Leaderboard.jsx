import LeaderboardItem from "./LeaderboardItem";

export default function Leaderboard({ players }) {
  return (
    <div className="w-full max-w-md bg-gray-800 rounded p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Leaderboard</h2>
      <ul>
        {players.map((player, idx) => (
          <LeaderboardItem key={player.id} player={player} rank={idx} />
        ))}
      </ul>
    </div>
  );
}

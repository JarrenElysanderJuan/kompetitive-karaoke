export default function LeaderboardItem({ player, rank }) {
  let bgColor = "bg-gray-700 text-white"; // default

  // Assign gold/silver/bronze to top 3
  if (rank === 0) bgColor = "bg-yellow-400 text-black"; // Gold
  else if (rank === 1) bgColor = "bg-gray-300 text-black"; // Silver
  else if (rank === 2) bgColor = "bg-yellow-700 text-black"; // Bronze
  else if (rank === 3) bgColor = "bg-gray-600 text-white"; // 4th place slightly highlighted

  return (
    <li
      className={`flex justify-between p-2 rounded mb-1 ${bgColor}`}
    >
      <span>{rank + 1}. {player.name}</span>
      <span>{player.score}</span>
    </li>
  );
}
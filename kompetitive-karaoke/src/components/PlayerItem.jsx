export default function PlayerItem({ player, isHost }) {
  return (
    <li className="flex justify-between items-center bg-gray-600 p-2 rounded">
      <span>{player.name} {isHost && "👑"}</span>
      <span className={`text-sm font-semibold ${player.ready ? "text-green-400" : "text-red-400"}`}>
        {player.ready ? "Ready" : "Not Ready"}
      </span>
    </li>
  );
}
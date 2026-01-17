import PlayerItem from "./PlayerItem";

export default function PlayerList({ players, hostId }) {
  return (
    <div className="w-1/3 bg-gray-700 rounded p-4">
      <h2 className="text-xl font-semibold mb-4">Players</h2>
      <ul className="space-y-2">
        {players.map((player) => (
          <PlayerItem key={player.id} player={player} isHost={player.id === hostId} />
        ))}
      </ul>
    </div>
  );
}
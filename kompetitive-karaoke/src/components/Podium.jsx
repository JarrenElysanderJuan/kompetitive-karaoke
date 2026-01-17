import PodiumPlayer from "./PodiumPlayer";

export default function Podium({ players }) {
  // podiumHeights: 2nd, 1st, 3rd
  const podiumHeights = [120, 160, 100];

  return (
    <div className="flex items-end justify-center gap-6 mb-12">
      {players.map((player, idx) => (
        <PodiumPlayer key={player.id} player={player} height={podiumHeights[idx]} />
      ))}
    </div>
  );
}

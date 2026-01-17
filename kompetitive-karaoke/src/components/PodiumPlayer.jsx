export default function PodiumPlayer({ player, height }) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-gray-700 rounded-t-lg px-4"
      style={{
        height: `${height}px`,
        width: "120px",
        minWidth: "120px",
      }}
    >
      <span className="text-2xl font-bold mb-2 truncate text-center w-full">
        {player.name}
      </span>
      <span className="text-xl">{player.score}</span>
    </div>
  );
}
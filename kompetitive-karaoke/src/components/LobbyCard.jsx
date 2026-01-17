const LobbyCard = ({ lobby, onJoin, disabled }) => {
  return (
    <div
      className={`bg-gray-700 text-white p-4 rounded shadow cursor-pointer
            hover:bg-gray-600 w-80 min-h-45
            flex flex-col justify-between ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
      onClick={() => !disabled && onJoin(lobby.roomId)}
    >
      <h2 className="text-xl font-bold">{lobby.name}</h2>
      <p>
        Players: {lobby.players.map((p) => p.name).join(", ")} (
        {lobby.players.length}/{lobby.maxPlayers})
      </p>
      <p>Code: {lobby.roomCode}</p>
      <p>
        Ready: {lobby.players.map((p) => (p.ready ? "✅" : "❌")).join(" ")}
      </p>
    </div>
  );
};

export default LobbyCard;
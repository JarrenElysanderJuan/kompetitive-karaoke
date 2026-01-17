const LobbyCard = ({ lobby, onJoin }) => {
  return (
    <div
    className="bg-gray-700 text-white p-4 rounded shadow cursor-pointer
            hover:bg-gray-600 w-80 min-h-45
            flex flex-col justify-between"
    onClick={() => onJoin(lobby.id)}
    >
      <h2 className="text-xl font-bold">{lobby.name}</h2>
      <p>
        Players: {lobby.players.join(', ')} ({lobby.players.length}/{lobby.maxPlayers})
      </p>
      <p>Song: {lobby.song}</p>
      <p>
        Ready: {lobby.ready.map((r) => (r ? '✅' : '❌')).join(' ')}
      </p>
    </div>
  );
};

export default LobbyCard;
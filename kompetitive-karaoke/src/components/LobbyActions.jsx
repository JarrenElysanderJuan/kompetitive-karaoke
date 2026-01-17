export default function LobbyActions({ isHost, allReady, onReadyToggle, onStart }) {
  return (
    <div className="flex gap-4 mt-6">
      <button
        onClick={onReadyToggle}
        className="flex-1 bg-blue-600 hover:bg-blue-700 p-3 rounded font-semibold"
      >
        Ready Up
      </button>
      {isHost && (
        <button
          onClick={onStart}
          disabled={!allReady}
          className={`flex-1 p-3 rounded font-semibold ${
            allReady ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 cursor-not-allowed"
          }`}
        >
          Start Battle
        </button>
      )}
    </div>
  );
}
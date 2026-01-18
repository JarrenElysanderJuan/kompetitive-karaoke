/**
 * LobbyActions: Controls for ready status and battle start
 */

export default function LobbyActions({
  isHost,
  allReady,
  isConnected = true,
  currentUserReady = false,
  onReadyToggle,
  onStart
}) {
  return (
    <div className="flex gap-4 mt-6">
      <button
        onClick={onReadyToggle}
        disabled={!isConnected}
        className={`flex-1 p-3 rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${currentUserReady
            ? "bg-green-600 hover:bg-green-700"
            : "bg-blue-600 hover:bg-blue-700"
          }`}
      >
        {currentUserReady ? "Ready ✓" : "Ready Up"}
      </button>
      {isHost && (
        <button
          onClick={onStart}
          disabled={!allReady || !isConnected}
          className={`flex-1 p-3 rounded font-semibold transition ${allReady && isConnected
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-500 cursor-not-allowed opacity-50"
            }`}
          title={!allReady ? "All players must be ready before starting" : "Start the battle"}
        >
          Start Battle
        </button>
      )}
    </div>
  );
}

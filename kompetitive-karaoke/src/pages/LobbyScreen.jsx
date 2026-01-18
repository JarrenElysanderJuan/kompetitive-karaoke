import { useState, useCallback } from "react";
import { useLobbyStore, LOBBY_PHASES } from "../store/lobbyStore";
import { useWebSocket } from "../hooks/useWebSocket";
import BattlePage from "./BattlePage";
import ResultsPage from "./ResultsPage";
import PlayerList from "../components/PlayerList";
import SongSelect from "../components/SongSelect";
import LobbyActions from "../components/LobbyActions";

/**
 * LobbyScreen: Main lobby view with WebSocket integration
 * 
 * Sends SET_READY, START_BATTLE, LEAVE_LOBBY messages via WebSocket.
 * Phase transitions are driven by server PHASE_CHANGE messages.
 */

function LobbyScreen() {
  const lobby = useLobbyStore((state) => state.lobby);
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const setSong = useLobbyStore((state) => state.setSong);
  const endBattle = useLobbyStore((state) => state.endBattle);

  const { send, isConnected } = useWebSocket();
  const [showResults, setShowResults] = useState(false);

  // Handle ready toggle
  const handleReadyToggle = useCallback(() => {
    if (!lobby.roomId || !currentUserId || !isConnected) return;

    const currentPlayer = lobby.players.find((p) => p.id === currentUserId);
    const newReadyState = !currentPlayer?.ready;

    send({
      type: 'SET_READY',
      roomId: lobby.roomId,
      userId: currentUserId,
      isReady: newReadyState,
    });
  }, [lobby.roomId, lobby.players, currentUserId, isConnected, send]);

  // Handle start battle (host only)
  const handleStartBattle = useCallback(() => {
    if (!lobby.roomId || !currentUserId || !isConnected) return;

    send({
      type: 'START_BATTLE',
      roomId: lobby.roomId,
      userId: currentUserId,
    });
  }, [lobby.roomId, currentUserId, isConnected, send]);

  // Handle leave lobby
  const handleLeaveLobby = useCallback(() => {
    if (!lobby.roomId || !currentUserId || !isConnected) return;

    send({
      type: 'LEAVE_LOBBY',
      roomId: lobby.roomId,
      userId: currentUserId,
    });

    // Clear local lobby state
    useLobbyStore.getState().setLobby({
      roomId: null,
      roomCode: null,
      name: null,
      maxPlayers: 4,
      phase: LOBBY_PHASES.LOBBY,
      song: null,
      players: [],
      hostId: null,
      battleStartTime: null,
    });
  }, [lobby.roomId, currentUserId, isConnected, send]);

  if (!lobby || !lobby.roomId) {
    return (
      <div className="w-screen h-screen bg-gray-900 flex justify-center items-center">
        <div className="text-white text-xl">No lobby joined</div>
      </div>
    );
  }

  const isHost = lobby.hostId === currentUserId;
  const allReady = lobby.players.length > 0 && lobby.players.every((p) => p.ready);

  // Handle song selection (host only)
  const handleSelectSong = useCallback((songId) => {
    if (!isHost || !lobby.roomId || !currentUserId || !isConnected) return;

    send({
      type: 'SELECT_SONG',
      roomId: lobby.roomId,
      userId: currentUserId,
      songId,
    });
  }, [isHost, lobby.roomId, currentUserId, isConnected, send]);

  // Render BattlePage if phase is LOADING or IN_BATTLE
  if (lobby.phase === LOBBY_PHASES.LOADING || lobby.phase === LOBBY_PHASES.IN_BATTLE) {
    return <BattlePage onEnd={(score) => endBattle({ score })} />;
  }

  // Render ResultsPage if phase is RESULTS or user opts to view it
  if (showResults || lobby.phase === LOBBY_PHASES.RESULTS) {
    return (
      <ResultsPage
        players={lobby.players}
        onBack={() => {
          setShowResults(false);
          // Reset phase back to LOBBY
          useLobbyStore.getState().setLobby({
            ...lobby,
            phase: LOBBY_PHASES.LOBBY,
          });
        }}
      />
    );
  }

  // Render Lobby UI (LOBBY phase)
  return (
    <div className="w-screen h-screen bg-gray-900 flex justify-center items-center">
      <div className="w-3/4 h-5/6 bg-gray-800 rounded-lg p-6 flex flex-col text-white">
        <h1 className="text-3xl font-bold text-center mb-6">
          Lobby: {lobby.name}
        </h1>
        <p className="text-center text-gray-400 mb-4">
          Room Code: <strong className="text-xl tracking-wider">{lobby.roomCode}</strong> | Players:{" "}
          <strong>
            {lobby.players.length}/{lobby.maxPlayers}
          </strong>
          {!isConnected && <span className="ml-2 text-yellow-500">(Reconnecting...)</span>}
        </p>

        <div className="flex flex-1 gap-6">
          <PlayerList players={lobby.players} hostId={lobby.hostId} />
          <div className="flex-1 bg-gray-700 rounded p-4 flex flex-col justify-between">
            <SongSelect
              selectedSong={lobby.song?.id || ""}
              onChange={handleSelectSong}
              isHost={isHost}
            />
            <LobbyActions
              isHost={isHost}
              allReady={allReady}
              isConnected={isConnected}
              onReadyToggle={handleReadyToggle}
              onStart={handleStartBattle}
              currentUserReady={lobby.players.find((p) => p.id === currentUserId)?.ready}
            />

            {/* Leave Lobby button */}
            <button
              onClick={handleLeaveLobby}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-bold transition"
            >
              Leave Lobby
            </button>

            {/* Button to view results after battle */}
            {lobby.phase === LOBBY_PHASES.RESULTS && (
              <button
                className="mt-4 px-4 py-2 bg-blue-600 rounded font-bold"
                onClick={() => setShowResults(true)}
              >
                View Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;


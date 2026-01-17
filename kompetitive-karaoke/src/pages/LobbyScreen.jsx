import { useState } from "react";
import { useLobbyStore } from "../store/lobbyStore";
import BattlePage from "./BattlePage";
import ResultsPage from "./ResultsPage";
import LoadingScreen from "./LoadingScreen";
import PlayerList from "../components/PlayerList";
import SongSelect from "../components/SongSelect";
import LobbyActions from "../components/LobbyActions";

function LobbyScreen() {
  const lobby = useLobbyStore((state) => state.lobby);
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const setSong = useLobbyStore((state) => state.setSong);
  const setReady = useLobbyStore((state) => state.setReady);
  const startBattle = useLobbyStore((state) => state.startBattle);
  const endBattle = useLobbyStore((state) => state.endBattle);

  const [showResults, setShowResults] = useState(false);

  if (!lobby) {
    return <div className="text-white">No lobby joined</div>;
  }

  const isHost = lobby.hostId === currentUserId;
  const allReady = lobby.players.every((p) => p.ready);

  // Render BattlePage if phase is IN_BATTLE
  if (lobby.phase === "IN_BATTLE") {
    return <BattlePage onEnd={(score) => endBattle({ score })} />;
  }

  // Render ResultsPage if phase is RESULTS or user opts to view it
  if (showResults || lobby.phase === "RESULTS") {
    return (
      <ResultsPage
            players={lobby.players}
            onBack={() => {
              setShowResults(false);
              // Reset phase back to LOBBY
              useLobbyStore.getState().setLobby({ ...lobby, phase: "LOBBY" });
            }}
        />
    );
  }

  // Render Lobby UI
  return (
    <div className="w-screen h-screen bg-gray-900 flex justify-center items-center">
      <div className="w-3/4 h-5/6 bg-gray-800 rounded-lg p-6 flex flex-col text-white">
        <h1 className="text-3xl font-bold text-center mb-6">Lobby: {lobby.roomName}</h1>
        <div className="flex flex-1 gap-6">
          <PlayerList players={lobby.players} hostId={lobby.hostId} />
          <div className="flex-1 bg-gray-700 rounded p-4 flex flex-col justify-between">
            <SongSelect
              selectedSong={lobby.song?.songId || ""}
              onChange={(songId) => setSong(songId)}
            />
            <LobbyActions
              isHost={isHost}
              allReady={allReady}
              onReadyToggle={() =>
                setReady(
                  currentUserId,
                  !lobby.players.find((p) => p.id === currentUserId)?.ready
                )
              }
              onStart={() => startBattle()}
            />
            {/* Button to view results after battle */}
            {lobby.phase === "RESULTS" && (
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

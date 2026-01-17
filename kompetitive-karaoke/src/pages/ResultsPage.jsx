import Podium from "../components/Podium";
import Leaderboard from "../components/Leaderboard";
import { useLobbyStore } from "../store/lobbyStore";
import { useMockPlayers } from "../hooks/useMockPlayers";

export default function ResultsPage({ onBack }) {
  useMockPlayers();
  
  // Get players from Zustand
  const players = useLobbyStore((state) => state.lobby.players);
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white">
      {/* Podium: top 3 */}
      <Podium players={sortedPlayers.slice(0, 3)} />

      {/* Full leaderboard */}
      <Leaderboard players={sortedPlayers} />

      {/* Back button */}
      <button
        onClick={onBack} // call handler passed from LobbyScreen
        className="mt-8 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold"
      >
        Back to Lobby
      </button>
    </div>
  );
}
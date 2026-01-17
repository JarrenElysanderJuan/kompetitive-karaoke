import Spinner from "../components/Spinner";
import { useLobbyStore } from "../store/lobbyStore";

function LoadingScreen({ phase }) {
  const lobby = useLobbyStore((state) => state.lobby); // get lobby from store

  const allReady = lobby.players.every((p) => p.ready);

  let title = "";
  let subtitle = "";

  if (phase === "pre-battle") {
    title = allReady ? "Starting soon..." : "Waiting for all players...";
    subtitle = "Get ready to sing 🎤";
  } else if (phase === "post-battle") {
    title = "Results coming up...";
    subtitle = "Calculating scores...";
  }

  return (
    <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      {/* Spinny thingy */}
      <Spinner size={64} />

      <h1 className="text-4xl font-bold mt-6">{title}</h1>
      <p className="text-gray-400 mt-2">{subtitle}</p>
    </div>
  );
}

export default LoadingScreen;

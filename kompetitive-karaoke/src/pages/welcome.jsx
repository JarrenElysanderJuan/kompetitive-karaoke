import { useState } from "react";
import { useLobbyStore } from "../store/lobbyStore";
import '../App.css';

function Welcome() {
  const [username, setUsername] = useState("");
  const setCurrentUser = useLobbyStore((state) => state.setCurrentUserName);
  const [error, setError] = useState("");

  const handleStart = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a username to continue!");
      return;
    }
    setError("");
    setCurrentUser(trimmed);
    console.log("Username set:", trimmed);
    // TODO: navigate to lobby selection/test page
  };

  return (
    <main className="flex flex-col items-center justify-center px-6 py-16 text-center bg-gray-900">
      <h1 className="text-4xl font-bold text-white mb-4">
        Welcome to Kompetitive Karaoke!
      </h1>
      <p className="text-lg text-gray-300 max-w-xl mb-6">
        A competitive karaoke platform where you can showcase your singing skills,
        explore other users' performances, and participate in live challenges.
      </p>
      <p className="text-md text-gray-400 max-w-xl mb-8">
        To get started, enter your username, browse the available rooms, join a session, and sing your heart out.
        Your scores will be tracked, and you can see how you rank against other players.
      </p>

      {/* Username input */}
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
        className="mb-2 px-4 py-2 rounded-lg bg-gray-400 text-black w-64 text-center"
      />
      {error && <p className="text-red-500 mb-2">{error}</p>}

      <button
        onClick={handleStart}
        disabled={!username.trim()}
        className={`px-6 py-3 font-semibold rounded-lg transition ${
          username.trim()
            ? "bg-gray-700 text-white hover:bg-gray-600"
            : "bg-gray-600 text-gray-400 cursor-not-allowed"
        }`}
      >
        Select Username
      </button>
    </main>
  );
}

export default Welcome;

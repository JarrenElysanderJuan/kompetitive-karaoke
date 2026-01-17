import { useState, useEffect, useCallback } from "react";
import LyricsDisplay from "../components/LyricsDisplay";
import ScoreBoard from "../components/ScoreBoard";
import ScoreCardSidebar from "../components/ScoreCardSidebar";
import { useMockWebSocket } from "../hooks/UseMockWebSocket";
import { useLobbyStore } from "../store/lobbyStore";

function BattlePage({ onEnd }) {
  // Start mock WebSocket or replace with real WS later
useMockWebSocket();

  // Lyrics for the battle
  const [currentLine, setCurrentLine] = useState(0);
  const [lyrics] = useState([
    "Twinkle, twinkle, little star",
    "How I wonder what you are",
    "Up above the world so high",
    "Like a diamond in the sky",
  ]);
    /*
    const song = useLobbyStore((state) => state.lobby.song);
    const lyrics = song?.lyrics || []; // fallback to empty array
    */

  // Grab players and client info from the store
  const players = useLobbyStore((state) => state.lobby.players);
  const updateScore = useLobbyStore((state) => state.updateScore);
  const currentUserId = useLobbyStore((state) => state.currentUserId);

  // Current player object
  const currentPlayer = players.find((p) => p.id === currentUserId) || {
    id: currentUserId,
    name: "Player",
    score: 0,
  };

  // Memoize setScore to avoid dependency issues in LyricsDisplay
  const handleSetScore = useCallback((updater) => {
    const currentPlayer = players.find(p => p.id === currentUserId);
    if (!currentPlayer) return;
    const newScore = updater(currentPlayer.score);
    updateScore(currentUserId, newScore);
  }, [players, currentUserId, updateScore]);

  return (
    <div className="w-screen h-screen bg-gray-900 flex items-center justify-center p-6 text-white">
      <div className="flex w-full max-w-6xl gap-6">
        {/* Main lyrics & current player score */}
        <div className="flex-1 flex flex-col items-center">
          <LyricsDisplay
            lyrics={lyrics}
            currentLine={currentLine}
            setCurrentLine={setCurrentLine}
            setScore={handleSetScore}
            onEnd={onEnd}
            />
          <ScoreBoard
            currentLine={currentLine}
            totalLines={lyrics.length}
            score={currentPlayer.score}
          />
        </div>

        {/* Sidebar showing all player scores */}
        <ScoreCardSidebar />
      </div>
    </div>
  );
}

export default BattlePage;

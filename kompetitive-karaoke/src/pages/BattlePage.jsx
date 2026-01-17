import { useState, useEffect, useCallback } from "react";
import LyricsDisplay from "../components/LyricsDisplay";
import ScoreBoard from "../components/ScoreBoard";
import ScoreCardSidebar from "../components/ScoreCardSidebar";
import { useMockWebSocket } from "../hooks/UseMockWebSocket";
import { useAudioCapture } from "../hooks/useAudioCapture";
import { useLobbyStore } from "../store/lobbyStore";

function BattlePage({ onEnd }) {
  // Initialize mock WebSocket
  const { handleAudioChunk } = useMockWebSocket();

  // Grab players and client info from the store
  const players = useLobbyStore((state) => state.lobby.players);
  const updateScore = useLobbyStore((state) => state.updateScore);
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const lobby = useLobbyStore((state) => state.lobby);

  // Audio capture callback - package chunks with metadata only during IN_BATTLE phase
  const onAudioChunk = useCallback(
    (chunk) => {
      // Only send audio chunks during the battle phase
      if (lobby.phase === "IN_BATTLE") {
        handleAudioChunk({
          ...chunk,
          userId: currentUserId,
          lobbyId: lobby.roomId,
        });
      }
    },
    [currentUserId, lobby.roomId, lobby.phase, handleAudioChunk]
  );

  // Initialize audio capture
  const { isCapturing, error: audioError, startCapture, stopCapture } =
    useAudioCapture(onAudioChunk, { chunkDurationMs: 20 });

  // Start audio capture when BattlePage mounts, stop on unmount
  useEffect(() => {
    startCapture();
    return () => {
      stopCapture();
    };
  }, []); // Empty dependency - only run once on mount/unmount

  // Only log audio capture errors, don't spam console with normal logs
  useEffect(() => {
    if (audioError) {
      console.error("🎤 Audio error:", audioError);
    }
  }, [audioError]);

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

  // Wrap onEnd to stop audio capture when battle ends
  const handleBattleEnd = useCallback((result) => {
    console.log("🎬 Battle ended, stopping audio capture");
    stopCapture();
    if (onEnd) {
      onEnd(result);
    }
  }, [onEnd, stopCapture]);

  return (
    <div className="w-screen h-screen bg-gray-900 flex items-center justify-center p-6 text-white">
      {/* Audio capture status indicator - always recording during battle */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm text-gray-300">🎤 Recording</span>
      </div>

      <div className="flex w-full max-w-6xl gap-6">
        {/* Main lyrics & current player score */}
        <div className="flex-1 flex flex-col items-center">
          <LyricsDisplay
            lyrics={lyrics}
            currentLine={currentLine}
            setCurrentLine={setCurrentLine}
            setScore={handleSetScore}
            onEnd={handleBattleEnd}
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

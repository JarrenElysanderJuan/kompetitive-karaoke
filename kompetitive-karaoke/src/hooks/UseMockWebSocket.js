import { useEffect } from "react";
import { useLobbyStore } from "../store/lobbyStore";

/*
 * Mock WebSocket hook
 * Simulates server updates during battle (score updates, etc.)
 * Also queues audio chunks for "transmission"
 */
export function useMockWebSocket() {
  const lobby = useLobbyStore((state) => state.lobby);
  const updateScore = useLobbyStore((state) => state.updateScore);
  const setReady = useLobbyStore((state) => state.setReady);

  // Handle incoming audio chunks
  const handleAudioChunk = (chunk) => {
    // Log to simulate transmission to server
    console.log("📤 Audio chunk queued for transmission:", {
      timestamp: chunk.timestamp,
      audioDataLength: chunk.audioData.length,
      sampleRate: 44100,
    });

    // In a real WebSocket:
    // ws.send(JSON.stringify({
    //   type: "audio_chunk",
    //   lobbyId: lobby.roomId,
    //   userId: currentUserId,
    //   timestamp: chunk.timestamp,
    //   audioData: btoa(chunk.audioData) // base64 encode for transmission
    // }));
  };

  // Simulate other players scoring
  useEffect(() => {
    if (lobby.phase !== "IN_BATTLE") return;

    const interval = setInterval(() => {
      // Randomly simulate other players scoring
      lobby.players.forEach((p) => {
        if (!p.ready) return; // skip unready
        const increment = Math.floor(Math.random() * 50);
        updateScore(p.id, p.score + increment);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [lobby.phase, updateScore]);

  return {
    handleAudioChunk,
  };
}

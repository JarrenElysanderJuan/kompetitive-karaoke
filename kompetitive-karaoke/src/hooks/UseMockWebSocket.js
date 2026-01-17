import { useEffect } from "react";
import { useLobbyStore } from "../store/lobbyStore";

export function useMockWebSocket() {
  const lobby = useLobbyStore((state) => state.lobby);
  const updateScore = useLobbyStore((state) => state.updateScore);
  const setReady = useLobbyStore((state) => state.setReady);

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
}
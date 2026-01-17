import { useEffect } from "react";
import { useLobbyStore } from "../store/lobbyStore";

export function useMockPlayers() {
  const setLobby = useLobbyStore((state) => state.setLobby);

  useEffect(() => {
    // Only run once
    const mockLobby = {
      roomId: "room123",
      roomCode: "ABCD",
      name: "Test Lobby",
      maxPlayers: 4,
      phase: "RESULTS", // show results directly
      song: { songId: "song1", title: "Mock Song", fileUrl: "/mock.mp3", durationMs: 120000 },
      players: [
        { id: "p1", name: "Alice", ready: true, score: 820 },
        { id: "p2", name: "Bob", ready: true, score: 950 },
        { id: "p3", name: "Charlie", ready: true, score: 780 },
        { id: "p4", name: "Diana", ready: true, score: 870 },
      ],
    };

    setLobby(mockLobby);
  }, [setLobby]);
}
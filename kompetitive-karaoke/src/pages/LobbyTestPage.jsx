import { useEffect } from "react";
import LobbyScreen from "./LobbyScreen";
import { useLobbyStore } from "../store/lobbyStore";
import { mockLobby } from "../hooks/UseMockLobby";

function LobbyTestPage() {
  const setLobby = useLobbyStore((state) => state.setLobby);
  const setCurrentUserId = useLobbyStore((state) => state.setCurrentUserId);

  // Initialize mock lobby once
  useEffect(() => {
    setLobby(mockLobby);
    setCurrentUserId("p1"); // test as Alice
  }, [setLobby, setCurrentUserId]);

  return <LobbyScreen />;
}

export default LobbyTestPage;

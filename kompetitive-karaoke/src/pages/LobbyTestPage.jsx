import { useEffect, useState } from "react";
import LobbyScreen from "./LobbyScreen";
import { useLobbyStore } from "../store/lobbyStore";
import { mockLobby } from "../hooks/UseMockLobby";

function LobbyTestPage() {
  const setLobby = useLobbyStore((state) => state.setLobby);
  const setCurrentUserId = useLobbyStore((state) => state.setCurrentUserId);
  const currentLobby = useLobbyStore((state) => state.lobby);
  const [initialized, setInitialized] = useState(false);

  // Initialize mock lobby only on first visit with no lobby set
  useEffect(() => {
    if (!initialized && !currentLobby.roomId) {
      setLobby(mockLobby);
      setCurrentUserId("p1"); // test as Alice
      setInitialized(true);
    } else {
      setInitialized(true);
    }
  }, [initialized]);

  return <LobbyScreen />;
}

export default LobbyTestPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LobbyCard from '../components/LobbyCard';
import { useLobbyStore } from '../store/lobbyStore';
import { mockLobbies } from '../hooks/mockLobbies';

/**
 * JoinTeams: UI for browsing and joining existing lobbies
 * 
 * BACKEND INTEGRATION POINTS:
 * 
 * Current Flow (Mock):
 *   1. Load from mockLobbies hardcoded array
 *   2. User clicks lobby card or enters room code
 *   3. Calls store.joinLobby()
 *   4. Navigate to LobbyScreen
 * 
 * Future Flow (With Backend):
 *   1. Component mounts → GET /api/lobbies?status=open
 *      Server response:
 *      [{
 *        roomId: string,
 *        roomCode: string,    // User-shareable 6-char code
 *        roomName: string,
 *        maxPlayers: number,
 *        currentPlayers: [     // Array of player objects
 *          { id, name, ready: false, score: 0, ... }
 *        ],
 *        phase: "LOBBY",       // LOBBY_PHASES.LOBBY
 *        createdAt: timestamp,
 *        ...
 *      }]
 *   2. User clicks lobby card → POST /api/lobbies/{roomId}/join
 *      Payload: { userId: currentUserId, userName: currentUserName }
 *      Server response: Full lobby object with user added to players[]
 *   3. WebSocket connects and subscribes to room updates
 *   4. Subsequent players joining trigger PLAYER_JOINED broadcast
 *   5. Navigate to LobbyScreen
 * 
 *   Alternative: Join by room code:
 *   1. User enters room code (e.g., "ABC123")
 *   2. POST /api/lobbies/join-code
 *      Payload: { roomCode: "ABC123", userId, userName }
 *      Server looks up by room code instead of roomId
 *      Server response: Full lobby object (after adding user)
 *   3. Same as above from step 3
 * 
 * Error Handling (TODO: BACKEND):
 *   - Lobby not found → show error
 *   - Lobby full (players.length >= maxPlayers) → disable button
 *   - Lobby already in battle phase → disable join or warn
 *   - Room code invalid/expired → show error
 *   - User already in another lobby → show error
 *   - Network error → show error with retry
 * 
 * Real-Time Updates (TODO: BACKEND):
 *   - Lobbies refresh every 5-10 seconds (or via WebSocket if available)
 *   - When user joins: lobby.currentPlayers updated
 *   - When user leaves: lobby.currentPlayers updated
 *   - When lobby full: button disabled automatically
 *   - When lobby deleted: remove from list
 * 
 * Validation (Current):
 *   ✅ User has currentUserId and currentUserName
 *   ✅ Lobby not full (players.length < maxPlayers)
 * 
 * Validation (TODO: BACKEND):
 *   - Room code format validation (6 alphanumeric chars)
 *   - Lobby phase check (don't allow join during battle)
 *   - User not already in lobby
 *   - Max join attempts per second (rate limiting)
 */

export default function JoinTeams() {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);      // TODO: BACKEND - show during join request
  const [error, setError] = useState(null);               // TODO: BACKEND - display errors
  const [lobbyList, setLobbyList] = useState(mockLobbies); // TODO: BACKEND - load from API
  const navigate = useNavigate();
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const currentUserName = useLobbyStore((state) => state.currentUserName);
  const joinLobby = useLobbyStore((state) => state.joinLobby);

  // TODO: BACKEND - Load lobbies on mount and set up polling/WebSocket
  // useEffect(() => {
  //   const fetchLobbies = async () => {
  //     try {
  //       const response = await fetch('/api/lobbies?status=open&maxResults=20');
  //       if (response.ok) {
  //         const lobbies = await response.json();
  //         setLobbyList(lobbies);
  //       }
  //     } catch (err) {
  //       console.error('[JoinTeams] Error fetching lobbies:', err);
  //     }
  //   };
  //   
  //   fetchLobbies();
  //   // Poll every 5 seconds, or remove if using WebSocket subscriptions
  //   const interval = setInterval(fetchLobbies, 5000);
  //   return () => clearInterval(interval);
  // }, []);

  // Handle clicking a lobby card
  const handleJoin = async (lobbyId) => {
    if (!currentUserId || !currentUserName) {
      return alert('Please set a username first!');
    }

    const lobbyToJoin = lobbyList.find((l) => l.roomId === lobbyId);
    if (!lobbyToJoin) {
      return alert('Lobby not found!');
    }

    // Check if lobby is full
    if (lobbyToJoin.players && lobbyToJoin.players.length >= lobbyToJoin.maxPlayers) {
      return alert('Lobby is full!');
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: BACKEND - Replace with real API call
      // const response = await fetch(`/api/lobbies/${lobbyId}/join`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     userId: currentUserId,
      //     userName: currentUserName
      //   })
      // });
      //
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to join lobby');
      // }
      //
      // const updatedLobby = await response.json();
      // useLobbyStore.setState({ lobby: updatedLobby });
      // // TODO: BACKEND - WebSocket subscribes to room updates after join

      // CURRENT: Mock implementation
      joinLobby(lobbyToJoin);

      navigate('/lobby');
    } catch (err) {
      console.error('[JoinTeams] Error joining lobby:', err);
      setError(err.message);
      // TODO: BACKEND - Show error UI and allow retry
    } finally {
      setIsLoading(false);
    }
  };

  // Handle joining by room code input
  const handleJoinByCode = async () => {
    if (!currentUserId || !currentUserName) {
      return alert('Please set a username first!');
    }

    if (!roomCodeInput.trim()) {
      return alert('Please enter a room code');
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: BACKEND - Call join-by-code endpoint
      // const response = await fetch('/api/lobbies/join-code', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     roomCode: roomCodeInput.toUpperCase(),
      //     userId: currentUserId,
      //     userName: currentUserName
      //   })
      // });
      //
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to join lobby');
      // }
      //
      // const updatedLobby = await response.json();
      // useLobbyStore.setState({ lobby: updatedLobby });
      // // TODO: BACKEND - WebSocket subscribes to room updates

      // CURRENT: Mock implementation
      const lobby = lobbyList.find(
        (l) => l.roomCode === roomCodeInput.toUpperCase()
      );
      if (!lobby) {
        throw new Error('Lobby not found!');
      }

      joinLobby(lobby);
      navigate('/lobby');
    } catch (err) {
      console.error('[JoinTeams] Error joining by code:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-7/10 bg-gray-800 rounded-lg mr-10 ml-10 p-5 flex flex-col items-center text-3xl font-bold">
      {/* Error Display (TODO: BACKEND) */}
      {error && (
        <div className="w-full max-w-2xl mb-6 p-3 bg-red-600 rounded">
          {error}
        </div>
      )}

      {/* Join by Room Code */}
      <div className="mb-6 w-full flex flex-col items-center">
        <label htmlFor="roomCode" className="mb-2 text-xl">
          Join by Room Code:
        </label>
        <div className="flex gap-2">
          <input
            id="roomCode"
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="Enter room code (e.g., ABC123)"
            disabled={isLoading}
            className="px-3 py-1 rounded-lg bg-gray-500 text-white disabled:opacity-50"
          />
          <button
            onClick={handleJoinByCode}
            disabled={!currentUserId || !currentUserName || !roomCodeInput || isLoading}
            className="px-4 py-1 bg-blue-600 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Joining...' : 'Join'}
          </button>
        </div>
      </div>

      {/* Lobby Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center mt-6 w-full">
        {lobbyList && lobbyList.length > 0 ? (
          lobbyList.map((lobby) => (
            <LobbyCard
              key={lobby.roomId}
              lobby={lobby}
              onJoin={handleJoin}
              disabled={
                isLoading ||
                !currentUserId ||
                !currentUserName ||
                (lobby.players && lobby.players.length >= lobby.maxPlayers)
              }
            />
          ))
        ) : (
          <div className="col-span-full text-center text-white text-lg">
            No lobbies available. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}

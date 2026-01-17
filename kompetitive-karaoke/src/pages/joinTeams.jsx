import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LobbyCard from '../components/LobbyCard';
import { useLobbyStore } from '../store/lobbyStore';
import { mockLobbies } from '../hooks/mockLobbies';

export default function JoinTeams() {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const navigate = useNavigate();
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const currentUserName = useLobbyStore((state) => state.currentUserName);
  const joinLobby = useLobbyStore((state) => state.joinLobby);

  // Handle clicking a lobby card
  const handleJoin = (lobbyId) => {
    if (!currentUserId || !currentUserName) {
      return alert('Please set a username first!');
    }

    const lobbyToJoin = mockLobbies.find((l) => l.roomId === lobbyId);
    if (!lobbyToJoin) return alert('Lobby not found!');

    joinLobby(lobbyToJoin);
    navigate('/lobby');
  };

  // Handle joining by room code input
  const handleJoinByCode = () => {
    if (!currentUserId || !currentUserName) {
      return alert('Please set a username first!');
    }

    const lobby = mockLobbies.find(
      (l) => l.roomCode === roomCodeInput.toUpperCase()
    );
    if (!lobby) return alert('Lobby not found!');

    joinLobby(lobby);
    navigate('/lobby');
  };

  return (
    <div className="h-7/10 bg-gray-800 rounded-lg mr-10 ml-10 p-5 flex flex-col items-center text-3xl font-bold">
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
            onChange={(e) => setRoomCodeInput(e.target.value)}
            placeholder="Enter room code"
            className="px-3 py-1 rounded-lg bg-gray-500 text-white"
          />
          <button
            onClick={handleJoinByCode}
            className="px-4 py-1 bg-blue-600 rounded font-bold"
            disabled={!currentUserId || !currentUserName || !roomCodeInput}
          >
            Join
          </button>
        </div>
      </div>

      {/* Lobby cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center mt-6 w-full">
        {mockLobbies.map((lobby) => (
          <LobbyCard
            key={lobby.roomId}
            lobby={lobby}
            onJoin={handleJoin}
            disabled={
              !currentUserId ||
              !currentUserName ||
              lobby.players.length >= lobby.maxPlayers
            }
          />
        ))}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import LobbyCard from '../components/LobbyCard';
import { useLobbyStore } from '../store/lobbyStore';

export default function JoinTeams() {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const currentUserName = useLobbyStore((state) => state.currentUserName);

  // Mock lobbies
  const [lobbies, setLobbies] = useState([
    {
      roomId: 'lobby1',
      roomCode: 'RS01',
      name: 'Rock Stars',
      players: ['Alice', 'Bob'],
      maxPlayers: 2,
      ready: [true, false],
      song: 'Song 1',
    },
    {
      roomId: 'lobby2',
      roomCode: 'PK02',
      name: 'Pop Kings',
      players: ['Charlie'],
      maxPlayers: 2,
      ready: [true],
      song: 'Song 2',
    },
  ]);

  // Handle clicking a lobby card
  const handleJoin = (lobbyId) => {
    if (!currentUserName) return alert('Set a username first!');
    alert(`Joining lobby: ${lobbyId}`);
    // TODO: replace with actual join API call later
  };

  // Handle joining by room code input
  const handleJoinByCode = () => {
    if (!currentUserName) return alert('Set a username first!');
    const lobby = lobbies.find((l) => l.roomCode === roomCodeInput.toUpperCase());
    if (!lobby) return alert('Lobby not found');
    handleJoin(lobby.roomId);
  };

  return (
    <div className="h-7/10 bg-gray-800 rounded-lg mr-10 ml-10 p-5 flex flex-col items-center text-3xl font-bold">
      {/* Join by Room Code */}
      <div className="mb-6 w-full flex flex-col items-center">
        <label htmlFor="roomCode" className="mb-2 text-xl">Join by Room Code:</label>
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
            disabled={!currentUserName || !roomCodeInput}
          >
            Join
          </button>
        </div>
      </div>

      {/* Lobby cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center mt-6 w-full">
        {lobbies.map((lobby) => (
          <LobbyCard
            key={lobby.roomId}
            lobby={lobby}
            onJoin={handleJoin}
            disabled={!currentUserName || lobby.players.length >= lobby.maxPlayers}
          />
        ))}
      </div>
    </div>
  );
}

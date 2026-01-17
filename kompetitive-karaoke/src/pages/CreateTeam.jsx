import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/lobbyStore';

const CreateTeam = () => {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const navigate = useNavigate();
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const currentUserName = useLobbyStore((state) => state.currentUserName);
  const createLobby = useLobbyStore((state) => state.createLobby);

  const handleCreate = () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    if (!currentUserId || !currentUserName) {
      alert('Please set a username first!');
      return;
    }

    // Create lobby in store and navigate
    createLobby(roomName, maxPlayers);
    navigate('/lobby');
  };

  return (
    <div className="h-7/10 bg-gray-800 rounded-lg mr-10 ml-10 p-5 flex flex-col items-center text-3xl font-bold">
      Create a Team

      <div className="w-full max-w-md mt-8 text-white text-base font-normal">

        {/* Room Name */}
        <div className="mb-6">
          <label className="block mb-2 text-lg font-semibold">
            Room Name
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter room name"
            className="w-full p-3 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Players */}
        <div className="mb-8">
          <label className="block mb-2 text-lg font-semibold">
            Max Players
          </label>
          <select
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full p-3 rounded bg-gray-700 text-white outline-none"
          >
            <option value={2}>2 Players</option>
            <option value={3}>3 Players</option>
            <option value={4}>4 Players</option>
          </select>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold transition"
        >
          Create Team
        </button>

      </div>
    </div>
  );
};

export default CreateTeam;
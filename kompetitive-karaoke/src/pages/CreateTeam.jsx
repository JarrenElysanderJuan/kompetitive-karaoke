import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/lobbyStore';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * CreateTeam: UI for creating a new lobby/room via WebSocket
 */

const CreateTeam = () => {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const currentUserName = useLobbyStore((state) => state.currentUserName);
  const lobby = useLobbyStore((state) => state.lobby);

  const { send, isConnected, error: wsError } = useWebSocket();

  // Navigate to lobby when we receive lobby data
  useEffect(() => {
    if (lobby.roomId && isLoading) {
      setIsLoading(false);
      navigate('/lobby');
    }
  }, [lobby.roomId, isLoading, navigate]);

  // Show WebSocket errors
  useEffect(() => {
    if (wsError) {
      setError(wsError.message);
      setIsLoading(false);
    }
  }, [wsError]);

  const handleCreate = useCallback(() => {
    // CLIENT-SIDE VALIDATION
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    if (!currentUserId || !currentUserName) {
      setError('Please set a username first!');
      return;
    }
    if (!isConnected) {
      setError('Not connected to server. Please wait...');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Send CREATE_LOBBY message via WebSocket
    const success = send({
      type: 'CREATE_LOBBY',
      roomName: roomName.trim(),
      maxPlayers,
      userId: currentUserId,
      userName: currentUserName,
    });

    if (!success) {
      setError('Failed to send message. Please try again.');
      setIsLoading(false);
    }

    // Response will be handled by useWebSocket hook updating the store
    // We navigate in the useEffect above when lobby.roomId is set
  }, [roomName, maxPlayers, currentUserId, currentUserName, isConnected, send]);

  return (
    <div className="h-7/10 bg-gray-800 rounded-lg mr-10 ml-10 p-5 flex flex-col items-center text-3xl font-bold">
      Create a Team

      <div className="w-full max-w-md mt-8 text-white text-base font-normal">

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-3 bg-red-600 rounded text-center">
            {error}
          </div>
        )}

        {/* Connection Warning */}
        {!isConnected && (
          <div className="mb-6 p-3 bg-yellow-600 rounded text-center">
            Connecting to server...
          </div>
        )}

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
            disabled={isLoading}
            className="w-full p-3 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
            disabled={isLoading}
            className="w-full p-3 rounded bg-gray-700 text-white outline-none disabled:opacity-50"
          >
            <option value={2}>2 Players</option>
            <option value={3}>3 Players</option>
            <option value={4}>4 Players</option>
          </select>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={isLoading || !roomName.trim() || !isConnected}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating...' : 'Create Team'}
        </button>

      </div>
    </div>
  );
};

export default CreateTeam;

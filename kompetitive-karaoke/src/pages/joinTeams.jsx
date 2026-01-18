import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/lobbyStore';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * JoinTeams: UI for joining existing lobbies via room code
 * 
 * With backend: Users enter a 6-char room code to join.
 * Lobby list browsing is disabled (would require additional API).
 */

export default function JoinTeams() {
  const [roomCodeInput, setRoomCodeInput] = useState('');
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

  // Handle joining by room code input
  const handleJoinByCode = useCallback(() => {
    if (!currentUserId || !currentUserName) {
      setError('Please set a username first!');
      return;
    }

    if (!roomCodeInput.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (roomCodeInput.trim().length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    if (!isConnected) {
      setError('Not connected to server. Please wait...');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Send JOIN_BY_CODE message via WebSocket
    const success = send({
      type: 'JOIN_BY_CODE',
      roomCode: roomCodeInput.trim().toUpperCase(),
      userId: currentUserId,
      userName: currentUserName,
    });

    if (!success) {
      setError('Failed to send message. Please try again.');
      setIsLoading(false);
    }

    // Response handled by useWebSocket hook
  }, [roomCodeInput, currentUserId, currentUserName, isConnected, send]);

  return (
    <div className="h-7/10 bg-gray-800 rounded-lg mr-10 ml-10 p-5 flex flex-col items-center text-3xl font-bold">
      Join a Team

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

        {/* Join by Room Code */}
        <div className="mb-6">
          <label htmlFor="roomCode" className="block mb-2 text-lg font-semibold">
            Enter Room Code
          </label>
          <input
            id="roomCode"
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g., ABC123"
            disabled={isLoading}
            maxLength={6}
            className="w-full p-3 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 uppercase text-center text-2xl tracking-widest"
          />
          <p className="mt-2 text-sm text-gray-400 text-center">
            Ask the room host for their 6-character code
          </p>
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoinByCode}
          disabled={isLoading || !roomCodeInput.trim() || !isConnected}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>

      </div>
    </div>
  );
}


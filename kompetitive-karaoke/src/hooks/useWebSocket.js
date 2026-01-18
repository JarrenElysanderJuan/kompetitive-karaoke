/**
 * useWebSocket Hook (Refactored)
 * 
 * Now a "dumb" hook that only reads from the store and provides the send() method.
 * All event handling is done by GameSync service.
 */

import { useCallback } from 'react';
import { getWebSocketService } from '../services/WebSocketService';
import { useLobbyStore } from '../store/lobbyStore';

/**
 * WebSocket hook that reads from store
 * 
 * @returns {Object} { send, isConnected, error, connectionState }
 */
export function useWebSocket() {
    // Read state from store
    const isConnected = useLobbyStore(state => state.connectionState === 'connected');
    const connectionState = useLobbyStore(state => state.connectionState);
    const error = useLobbyStore(state => state.connectionError);
    const clearConnectionError = useLobbyStore(state => state.setConnectionError);

    // Send actions
    const send = useCallback((message) => {
        return getWebSocketService().send(message);
    }, []);

    // Clear error wrapper (optional, component could just set connectionError to null)
    const clearError = useCallback(() => {
        clearConnectionError(null);
    }, [clearConnectionError]);

    return {
        send,
        isConnected,
        error,
        clearError,
        connectionState,
    };
}

export default useWebSocket;

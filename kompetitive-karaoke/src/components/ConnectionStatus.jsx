/**
 * Connection Status Indicator
 * 
 * Shows WebSocket connection status with colored dot and text
 */

import { useWebSocket } from '../hooks/useWebSocket';

export function ConnectionStatus() {
    const { isConnected, connectionState, error } = useWebSocket();

    // Color based on state
    const getStatusColor = () => {
        if (error) return 'bg-red-500';
        switch (connectionState) {
            case 'connected':
                return 'bg-green-500';
            case 'connecting':
                return 'bg-yellow-500 animate-pulse';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusText = () => {
        if (error) return 'Error';
        switch (connectionState) {
            case 'connected':
                return 'Online';
            case 'connecting':
                return 'Connecting...';
            default:
                return 'Offline';
        }
    };

    return (
        <div className="flex items-center gap-2" title={error?.message || ''}>
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
            <span className="text-sm text-gray-400">{getStatusText()}</span>
        </div>
    );
}

export default ConnectionStatus;

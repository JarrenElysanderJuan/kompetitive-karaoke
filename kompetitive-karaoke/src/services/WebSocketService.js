/**
 * WebSocket Service
 * 
 * Real WebSocket connection to backend server.
 * Handles connection lifecycle, message parsing, and reconnection.
 */

const WS_URL = 'ws://127.0.0.1:3000';

// Reconnection settings
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const RECONNECT_MAX_ATTEMPTS = 10;

/**
 * Create a WebSocket service instance
 * @returns {Object} WebSocket service with connect, disconnect, send, on, off methods
 */
export function createWebSocketService() {
    let ws = null;
    let reconnectAttempts = 0;
    let reconnectTimeout = null;
    let isIntentionalClose = false;

    // Event handlers by message type
    const handlers = new Map();

    // Connection state callbacks
    const onConnectCallbacks = new Set();
    const onDisconnectCallbacks = new Set();
    const onErrorCallbacks = new Set();

    /**
     * Register a handler for a specific message type
     */
    function on(type, handler) {
        if (!handlers.has(type)) {
            handlers.set(type, new Set());
        }
        handlers.get(type).add(handler);
    }

    /**
     * Remove a handler for a specific message type
     */
    function off(type, handler) {
        if (handlers.has(type)) {
            handlers.get(type).delete(handler);
        }
    }

    /**
     * Set connection state callbacks
     */
    function onConnect(callback) {
        onConnectCallbacks.add(callback);
        // If already connected, fire immediately
        if (ws && ws.readyState === WebSocket.OPEN) {
            callback();
        }
        // Return unsubscribe function
        return () => onConnectCallbacks.delete(callback);
    }

    function onDisconnect(callback) {
        onDisconnectCallbacks.add(callback);
        return () => onDisconnectCallbacks.delete(callback);
    }

    function onError(callback) {
        onErrorCallbacks.add(callback);
        return () => onErrorCallbacks.delete(callback);
    }

    /**
     * Dispatch a message to registered handlers
     */
    function dispatch(message) {
        const type = message.type;

        // Call type-specific handlers
        if (handlers.has(type)) {
            for (const handler of handlers.get(type)) {
                try {
                    handler(message);
                } catch (err) {
                    console.error(`[WS] Handler error for ${type}:`, err);
                }
            }
        }

        // Call wildcard handlers (for debugging/logging)
        if (handlers.has('*')) {
            for (const handler of handlers.get('*')) {
                try {
                    handler(message);
                } catch (err) {
                    console.error('[WS] Wildcard handler error:', err);
                }
            }
        }
    }

    /**
     * Calculate reconnection delay with exponential backoff
     */
    function getReconnectDelay() {
        const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts),
            RECONNECT_MAX_DELAY
        );
        // Add jitter (±25%)
        return delay * (0.75 + Math.random() * 0.5);
    }

    /**
     * Attempt to reconnect
     */
    function scheduleReconnect() {
        if (isIntentionalClose) return;
        if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
            console.error('[WS] Max reconnection attempts reached');
            const error = new Error('Max reconnection attempts reached');
            onErrorCallbacks.forEach(cb => cb(error));
            return;
        }

        const delay = getReconnectDelay();
        console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1}/${RECONNECT_MAX_ATTEMPTS})`);

        reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connect();
        }, delay);
    }

    /**
     * Connect to WebSocket server
     */
    function connect() {
        return new Promise((resolve, reject) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }

            isIntentionalClose = false;

            try {
                ws = new WebSocket(WS_URL);
            } catch (err) {
                console.error('[WS] Failed to create WebSocket:', err);
                reject(err);
                scheduleReconnect();
                return;
            }

            ws.onopen = () => {
                console.log('[WS] Connected to', WS_URL);
                reconnectAttempts = 0;
                onConnectCallbacks.forEach(cb => {
                    try { cb(); } catch (e) { console.error(e); }
                });
                resolve();
            };

            ws.onclose = (event) => {
                console.log('[WS] Disconnected:', event.code, event.reason);
                onDisconnectCallbacks.forEach(cb => {
                    try { cb(event); } catch (e) { console.error(e); }
                });

                if (!isIntentionalClose) {
                    scheduleReconnect();
                }
            };

            ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                onErrorCallbacks.forEach(cb => {
                    try { cb(error); } catch (e) { console.error(e); }
                });
                // Don't reject here, let onclose handle reconnection
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    dispatch(message);
                } catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };

            // Timeout for initial connection
            setTimeout(() => {
                if (ws && ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    function disconnect() {
        isIntentionalClose = true;

        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }

        if (ws) {
            ws.close(1000, 'Client disconnect');
            ws = null;
        }
    }

    /**
     * Send a message to the server
     */
    function send(message) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('[WS] Cannot send, not connected');
            return false;
        }

        try {
            ws.send(JSON.stringify(message));
            return true;
        } catch (err) {
            console.error('[WS] Send error:', err);
            return false;
        }
    }

    /**
     * Check if connected
     */
    function isConnected() {
        return ws && ws.readyState === WebSocket.OPEN;
    }

    return {
        connect,
        disconnect,
        send,
        on,
        off,
        onConnect,
        onDisconnect,
        onError,
        isConnected,
    };
}

// Singleton instance for the app
let wsInstance = null;

export function getWebSocketService() {
    if (!wsInstance) {
        wsInstance = createWebSocketService();
    }
    return wsInstance;
}

export default { createWebSocketService, getWebSocketService };

/**
 * WEBSOCKET CONNECTION HANDLER
 * 
 * Manages individual client connections and message routing.
 */

import { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '../types/messages.js';
import { validateClientMessage } from '../types/messages.js';

export interface ClientConnection {
  ws: WebSocket;
  userId: string | null;
  lobbyId: string | null;
  isAlive: boolean;
}

/**
 * Create connection tracker for a WebSocket
 */
export function createConnection(ws: WebSocket): ClientConnection {
  return {
    ws,
    userId: null,
    lobbyId: null,
    isAlive: true,
  };
}

/**
 * Send message to client
 */
export function sendMessage(conn: ClientConnection, msg: ServerMessage): void {
  if (conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify(msg));
  }
}

/**
 * Broadcast message to all clients in a lobby
 */
export function broadcastToLobby(connections: Map<string, ClientConnection>, lobbyId: string, msg: ServerMessage): void {
  for (const conn of connections.values()) {
    if (conn.lobbyId === lobbyId) {
      sendMessage(conn, msg);
    }
  }
}

/**
 * Parse and validate incoming message
 */
export function parseMessage(data: unknown): ClientMessage | null {
  try {
    let messageString: string;

    if (typeof data === 'string') {
      messageString = data;
    } else if (Buffer.isBuffer(data)) {
      messageString = data.toString('utf-8');
    } else {
      // Try generic toString if possible, or fail
      messageString = (data as any).toString();
    }

    const msg = JSON.parse(messageString);
    if (validateClientMessage(msg)) {
      return msg;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Send error message to client
 */
export function sendError(conn: ClientConnection, code: string, message: string): void {
  sendMessage(conn, {
    type: 'ERROR',
    code,
    message,
  });
}

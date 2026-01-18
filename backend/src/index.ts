/**
 * KOMPETITIVE KARAOKE BACKEND
 * 
 * Real-time WebSocket server for multiplayer karaoke battles.
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import type { ClientMessage } from './types/messages.js';
import { parseMessage } from './ws/connection.js';
import { createConnection, broadcastToLobby, sendMessage, sendError } from './ws/connection.js';
import type { ClientConnection } from './ws/connection.js';
import * as handlers from './ws/handlers.js';
import * as lobbyState from './state/lobby.js';
import * as scoring from './services/scoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SONGS_DIR = path.resolve(__dirname, '..', 'songs');

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Connection tracking
const connections = new Map<string, ClientConnection>();
let connectionCounter = 0;

const server = createServer((req, res) => {
  // CORS for dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve Songs
  if (req.url?.startsWith('/songs/') && req.method === 'GET') {
    const filename = req.url.replace('/songs/', '');
    // Sanitize path (basic)
    if (filename.includes('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const filePath = path.join(SONGS_DIR, filename);

    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
      });
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  // Default
  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server });

// ============================================================================
// WEBSOCKET EVENT HANDLERS
// ============================================================================

wss.on('connection', (ws: any) => {
  const connectionId = `conn-${++connectionCounter}`;
  const conn = createConnection(ws);

  connections.set(connectionId, conn);
  console.log(`[Connection] Client connected: ${connectionId}`);

  ws.on('message', (data: unknown) => {
    try {
      const msg = parseMessage(data);
      if (!msg) {
        console.log('[Server] Validation failed for raw message:', (data as any).toString());
        sendError(conn, 'INVALID_MESSAGE', 'Message format invalid');
        return;
      }

      handleMessage(msg, conn, connectionId);
    } catch (err) {
      console.error(`[Error] Message handling failed:`, err);
      sendError(conn, 'SERVER_ERROR', 'Internal server error');
    }
  });

  ws.on('pong', () => {
    conn.isAlive = true;
  });

  ws.on('close', (code: number, reason: Buffer) => {
    if (conn.lobbyId && conn.userId) {
      lobbyState.leaveLobby(conn.lobbyId, conn.userId);

      // Notify others
      const msg = {
        type: 'PLAYER_LEFT' as const,
        roomId: conn.lobbyId,
        playerId: conn.userId,
        reason: 'disconnect' as const,
      };
      broadcastToLobby(connections, conn.lobbyId, msg);
    }

    connections.delete(connectionId);
    const reasonStr = reason.toString();
    console.log(`[Connection] Client disconnected: ${connectionId} (Code: ${code}, Reason: ${reasonStr})`);
  });

  ws.on('error', (err: any) => {
    console.error(`[Error] WebSocket error:`, err);
  });
});

/**
 * Route incoming message to handler
 */
function handleMessage(msg: ClientMessage, conn: ClientConnection, _connId: string): void {
  switch (msg.type) {
    case 'CREATE_LOBBY': {
      const replies = handlers.handleCreateLobby(msg, conn);
      for (const reply of replies) {
        sendMessage(conn, reply);
      }
      break;
    }

    case 'JOIN_LOBBY': {
      const replies = handlers.handleJoinLobby(msg, conn, connections);
      for (const reply of replies) {
        sendMessage(conn, reply);
      }
      break;
    }

    case 'JOIN_BY_CODE': {
      const replies = handlers.handleJoinByCode(msg, conn, connections);
      for (const reply of replies) {
        sendMessage(conn, reply);
      }
      break;
    }

    case 'SET_READY': {
      handlers.handleSetReady(msg, conn, connections);
      break;
    }

    case 'START_BATTLE': {
      handlers.handleStartBattle(msg, conn, connections);
      break;
    }

    case 'SELECT_SONG': {
      handlers.handleSelectSong(msg, conn, connections);
      break;
    }

    case 'PLAYER_LOADED': {
      handlers.handlePlayerLoaded(msg, conn, connections);
      break;
    }

    case 'AUDIO_CHUNK': {
      handlers.handleAudioChunk(msg);
      break;
    }

    case 'FINISH_BATTLE': {
      handlers.handleFinishBattle(msg, connections);
      break;
    }

    case 'LEAVE_LOBBY': {
      handlers.handleLeaveLobby(msg, conn, connections);
      break;
    }

    default:
      sendError(conn, 'UNKNOWN_MESSAGE', `Unknown message type: ${(msg as any).type}`);
  }
}

// ============================================================================
// PERIODIC TASKS
// ============================================================================

/**
 * Every 500ms: Process audio chunks and broadcast score updates
 */
setInterval(() => {
  const gameState = lobbyState.getGameState();

  for (const lobby of gameState.lobbies.values()) {
    if (lobby.battle.phase !== 'IN_BATTLE') continue;

    const scoreUpdates = scoring.updateBattleScores(lobby);

    for (const [userId, scoreData] of scoreUpdates) {
      lobbyState.updatePlayerScore(lobby.id, userId, scoreData.score, scoreData.combo, scoreData.accuracy);

      const updatedPlayer = lobby.players.get(userId);
      if (!updatedPlayer) continue;

      console.log(`[Score] ${userId}: Batch=${scoreData.score} Total=${updatedPlayer.score} Acc=${updatedPlayer.accuracy.toFixed(1)}%`);

      const msg = {
        type: 'PLAYER_SCORE_UPDATE' as const,
        roomId: lobby.id,
        playerId: userId,
        newScore: updatedPlayer.score,
        accuracy: updatedPlayer.accuracy,
        combo: updatedPlayer.combo,
      };

      broadcastToLobby(connections, lobby.id, msg);
    }

    const BATTLE_GRACE_PERIOD_MS = 5000;
    const songDuration = lobby.battle?.song?.duration || 60000;
    const elapsedMs = Date.now() - (lobby.battle.battleStartTime || Date.now());

    if (elapsedMs > songDuration + BATTLE_GRACE_PERIOD_MS) {
      console.log(`[Battle] Timeout reached for lobby ${lobby.id}, ending battle`);
      lobbyState.endBattle(lobby.id);

      const updatedLobby = lobbyState.getLobby(lobby.id);
      if (updatedLobby) {
        const playersArray = Array.from(updatedLobby.players.values())
          .sort((a, b) => b.score - a.score);

        const resultsMsg = {
          type: 'BATTLE_RESULTS' as const,
          roomId: lobby.id,
          players: playersArray.map((p, index) => ({
            id: p.id,
            name: p.name,
            score: p.score,
            accuracy: p.accuracy || 0,
            combo: p.combo || 0,
            position: index + 1,
          })),
          endedAt: Date.now(),
        };

        broadcastToLobby(connections, lobby.id, resultsMsg);

        const phaseMsg = {
          type: 'PHASE_CHANGE' as const,
          roomId: lobby.id,
          newPhase: 'RESULTS' as const,
        };
        broadcastToLobby(connections, lobby.id, phaseMsg);
      }
    }
  }
}, 500);

/**
 * Every 30s: Heartbeat / cleanup
 */
setInterval(() => {
  for (const [connId, conn] of connections.entries()) {
    if (!conn.isAlive) {
      conn.ws.terminate();
      connections.delete(connId);
      continue;
    }

    conn.isAlive = false;
    conn.ws.ping();
  }
}, 30000);

/**
 * Every 5min: Log statistics
 */
setInterval(() => {
  const gameState = lobbyState.getGameState();
  console.log(`[Stats] Connections: ${connections.size}, Lobbies: ${gameState.lobbies.size}`);
}, 5 * 60 * 1000);

// ============================================================================
// SERVER LIFECYCLE
// ============================================================================

server.listen(PORT, () => {
  console.log(`\n🎤 Kompetitive Karaoke Backend`);
  console.log(`📡 WebSocket server listening on port ${PORT}`);
  console.log(`🔗 Connect to: ws://localhost:${PORT}`);
  console.log(`\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Shutdown] SIGTERM received, closing server...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n[Shutdown] SIGINT received, closing server...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

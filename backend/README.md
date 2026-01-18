# Kompetitive Karaoke Backend

Real-time WebSocket backend for multiplayer karaoke battles.

## Architecture

```
┌─ index.ts ────────────────────┐
│  WebSocket server lifecycle   │
│  Message routing              │
│  Periodic tasks (scoring)     │
└──────────┬─────────────────────┘
           │
    ┌──────┴───────────────────────────────┐
    │                                       │
┌───▼─────────┐    ┌────────────────────┐ │
│ handlers.ts │    │ connection.ts      │ │
│             │    │ Message sending    │ │
│ Message     │    │ Broadcasting       │ │
│ processing  │    │ Error handling     │ │
└───┬─────────┘    └────────────────────┘ │
    │                                      │
    └──────────┬───────────────────────────┘
               │
        ┌──────┴──────────────────────────┐
        │                                  │
    ┌───▼──────────┐         ┌────────────▼──┐
    │ lobby.ts     │         │ scoring.ts    │
    │              │         │               │
    │ Lobby CRUD   │         │ Audio analysis│
    │ Player mgmt  │         │ Score calc    │
    │ Battle state │         │ Deterministic │
    └──────────────┘         └───────────────┘
```

## Running

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run dev

# Production
npm run build
npm start
```

## Architecture Decisions

### 1. Message Validation

All incoming messages are validated against the frontend contracts:

```typescript
validateClientMessage(msg): msg is ClientMessage
```

Invalid messages are rejected with error code.

### 2. Server-Authoritative State

Lobbies, players, and scores are stored server-side only.

```typescript
// Server is single source of truth
const lobby = lobbyState.getLobby(roomId);
const updatedLobby = lobbyState.updatePlayerScore(...);
```

Clients never calculate scores. They only receive `PLAYER_SCORE_UPDATE` messages.

### 3. Battle Timing with Server Time

When battle starts, server sends `battleStartTime`:

```typescript
battleStartTime: Date.now() // Server's current time (CRITICAL)
```

Clients use this anchor to calculate lyric progression:

```javascript
// Frontend calculation (all clients in sync)
const elapsedMs = Date.now() - battleStartTime;
const lineIndex = calculateLine(elapsedMs);
```

### 4. Audio Chunk Processing

Chunks are queued and processed in 500ms batches:

```typescript
// Audio arrives at 20ms intervals
// Server batches them every 500ms
// Calculates score once per batch
// Broadcasts PLAYER_SCORE_UPDATE
```

Ensures deterministic scoring (same audio → same score always).

### 5. Deterministic Scoring

Hash-based analysis ensures reproducibility:

```typescript
// Deterministic hash of audio data
let hash = 0;
for (let i = 0; i < audioData.length; i++) {
  hash = ((hash << 5) - hash) + audioData.charCodeAt(i);
}
// Same audioData → Same hash → Same score ✓
```

### 6. Lobby and Player Management

Uses Map<string, Player> for O(1) lookups:

```typescript
lobby.players.set(userId, player);
const player = lobby.players.get(userId);
```

Automatic host reassignment when host leaves.

## TODO: PRODUCTION

- [ ] Persist game state to database (Redis or PostgreSQL)
- [ ] Add authentication (JWT tokens, user accounts)
- [ ] Implement real audio analysis (FFT, pitch detection)
- [ ] Add song database with metadata
- [ ] Implement leaderboard/ranking system
- [ ] Add reconnection support with state recovery
- [ ] Implement battle timeout detection
- [ ] Add logging and monitoring
- [ ] Performance testing with multiple lobbies
- [ ] Rate limiting on WebSocket messages
- [ ] Replay storage and retrieval
- [ ] Achievement system server-side validation

## File Structure

```
src/
├── index.ts                 # Main entry point
├── types/
│   ├── messages.ts          # WebSocket message contracts
│   └── state.ts             # Game state types
├── state/
│   └── lobby.ts             # Lobby and player management
├── services/
│   └── scoring.ts           # Audio analysis and scoring
└── ws/
    ├── connection.ts        # Connection tracking and messaging
    └── handlers.ts          # Message handlers
```

## Message Flow Example

### Battle Sequence

1. **CREATE_LOBBY** (host)
   ```
   Client → CREATE_LOBBY {userId, userName, roomName}
   Server → LOBBY_SNAPSHOT {roomId, code, ...}
   ```

2. **JOIN_LOBBY** (other players)
   ```
   Client → JOIN_LOBBY {roomId, userId, userName}
   Server → LOBBY_SNAPSHOT (to joiner)
   Server → PLAYER_JOINED (broadcast to others)
   ```

3. **SET_READY** (all players)
   ```
   Client → SET_READY {roomId, userId, isReady}
   Server → PLAYER_READY_UPDATE (broadcast)
   ```

4. **START_BATTLE** (host only)
   ```
   Client → START_BATTLE {roomId, userId}
   Server → PHASE_CHANGE {newPhase: IN_BATTLE, battleStartTime, song}
   (broadcast to all)
   ```

5. **AUDIO_CHUNK** (all players, 20ms intervals)
   ```
   Client → AUDIO_CHUNK {roomId, userId, timestamp, audioData}
   Server → (queue for scoring)
   ```

6. **PLAYER_SCORE_UPDATE** (server broadcasts every 500ms)
   ```
   Server → PLAYER_SCORE_UPDATE {roomId, playerId, newScore, accuracy, combo}
   (broadcast to all)
   ```

7. **BATTLE_RESULTS** (on timeout or all finished)
   ```
   Server → BATTLE_RESULTS {roomId, players[...], endedAt}
   (broadcast to all)
   ```

## Error Codes

- `INVALID_MESSAGE` - Message format invalid
- `CREATE_LOBBY_ERROR` - Failed to create lobby
- `JOIN_FAILED` - Lobby not found or full
- `SET_READY_ERROR` - Ready toggle failed
- `START_BATTLE_ERROR` - Battle start failed
- `SERVER_ERROR` - Internal server error


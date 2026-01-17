# Ready Status & Battle Start Flow

**Status:** ✅ UI Ready (mock working, backend integration points marked)  
**Target Integration:** WebSocket real-time synchronization  
**Backend Work Required:** Ready status persistence, broadcast coordination, phase transitions  

---

## 1. Ready Status Flow

### Current Implementation (Mock)

**User Journey:**
1. Player enters LobbyScreen
2. Sees list of all players with ready status
3. Click "Ready Up" button
4. Local state updates: current player.ready = true
5. "Ready" label shows in green
6. Host's "Start Battle" button becomes enabled (if all ready)

**Data Flow (Current):**

```
Player clicks "Ready Up"
  │
  └─ onReadyToggle() callback
     │
     └─ setReady(currentUserId, !currentReady)
        │
        └─ Store mutation (LOCAL ONLY)
           ├─ Find player by id
           ├─ Update player.ready = true
           ├─ Calculate allReady = players.every(p => p.ready)
           └─ Re-render PlayerList + LobbyActions
              │
              └─ UI reflects new state
                 ├─ PlayerItem shows "Ready ✓" (green)
                 ├─ Host sees "Start Battle" enabled
                 └─ Other players see no change (no sync!)
```

**Problem with Current Approach:**
- Each client has independent state
- Player A clicks ready: only Player A's client updates
- Player B doesn't see Player A's ready status
- Host sees inconsistent data
- Game cannot actually start multiplayer

### Backend Integration (TODO)

**API Endpoint: POST /api/lobbies/{roomId}/ready**

**Request:**
```javascript
{
  userId: "user-123",
  ready: true/false    // Toggle state
}
```

**Server-Side Logic:**
```javascript
// 1. VALIDATE
if (!user_in_lobby(userId, roomId)) {
  return 403 FORBIDDEN
}
if (lobby.phase !== LOBBY_PHASES.LOBBY) {
  return 400 BAD_REQUEST "Lobby not in LOBBY phase"
}

// 2. UPDATE DATABASE
player = find_player(roomId, userId)
player.ready = request.ready
save_to_database(roomId, player)

// 3. BROADCAST TO ALL CLIENTS
broadcast_to_room(roomId, {
  type: MESSAGE_TYPES.PLAYER_READY_UPDATE,
  payload: {
    userId: userId,
    ready: true/false,
    roomId: roomId,
    timestamp: Date.now()
  }
})

// 4. RESPOND TO REQUESTER
return 200 OK { success: true }
```

**WebSocket Response (Broadcast):**
```javascript
{
  type: "PLAYER_READY_UPDATE",
  payload: {
    userId: "user-123",
    ready: true,
    roomId: "lobby-uuid-1",
    timestamp: 1704067210000
  }
}
```

**Enhanced Frontend Flow (TODO):**

```javascript
// In LobbyScreen.jsx or store
const setReady = useCallback(async (userId, readyStatus) => {
  // 1. OPTIMISTIC UPDATE (optional - improves perceived responsiveness)
  // Store shows immediate change to user
  setLocalReady(userId, readyStatus);
  
  try {
    // 2. SEND TO SERVER
    const response = await fetch(
      `/api/lobbies/${lobby.roomId}/ready`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ready: readyStatus })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      // 3. REVERT OPTIMISTIC UPDATE on error
      setLocalReady(userId, !readyStatus);
      showError(error.message);
      return;
    }
    
    // 4. WAIT FOR WebSocket PLAYER_READY_UPDATE
    // Server will broadcast to all clients
    // Including this one - so we get authoritative state
  } catch (err) {
    // Network error - revert optimistic update
    setLocalReady(userId, !readyStatus);
    showError('Failed to update ready status');
  }
}, [lobby.roomId]);

// In store or WebSocket handler
WebSocket.on(MESSAGE_TYPES.PLAYER_READY_UPDATE, (payload) => {
  // Update all clients simultaneously
  const { userId, ready, roomId } = payload;
  
  // Only process if in same lobby
  if (roomId !== lobby.roomId) return;
  
  // Find and update player
  setLobbyStore(state => ({
    lobby: {
      ...state.lobby,
      players: state.lobby.players.map(p =>
        p.id === userId ? { ...p, ready } : p
      )
    }
  }));
});
```

### Ready Status State Diagram

```
INITIAL STATE
┌─────────────────────────────┐
│ Player A: ready=false       │
│ Player B: ready=false       │
│ Player C: ready=false       │
│ allReady = false            │
│ Start button: DISABLED      │
└─────────────────────────────┘
         │ A clicks "Ready"
         ↓
PLAYER A READY
┌─────────────────────────────┐
│ Player A: ready=true  ✓     │
│ Player B: ready=false       │
│ Player C: ready=false       │
│ allReady = false            │
│ Start button: DISABLED      │
└─────────────────────────────┘
   │ B clicks "Ready"
   ↓
PLAYERS A & B READY
┌─────────────────────────────┐
│ Player A: ready=true  ✓     │
│ Player B: ready=true  ✓     │
│ Player C: ready=false       │
│ allReady = false            │
│ Start button: DISABLED      │
└─────────────────────────────┘
      │ C clicks "Ready"
      ↓
ALL PLAYERS READY
┌─────────────────────────────┐
│ Player A: ready=true  ✓     │
│ Player B: ready=true  ✓     │
│ Player C: ready=true  ✓     │
│ allReady = true             │
│ Start button: ENABLED ✓     │
└─────────────────────────────┘
         │ Host clicks "Start"
         ↓
   (See Section 2 below)
```

---

## 2. Battle Start Flow

### Current Implementation (Mock)

**User Journey (Host):**
1. Host clicks "Start Battle" button (when allReady=true)
2. Store calls startBattle() action
3. Updates lobby.phase = IN_BATTLE
4. Component shows BattlePage instead of LobbyScreen
5. Only host sees battle (no sync with other players)

**Data Flow (Current):**

```
Host clicks "Start Battle"
  │
  └─ onStart() → startBattle()
     │
     └─ Store mutation (LOCAL ONLY)
        ├─ Set lobby.phase = IN_BATTLE
        ├─ Set lobby.battleStartTime = Date.now()
        ├─ Clear song selection?
        └─ Re-render
           │
           └─ LobbyScreen shows BattlePage (host only!)
              └─ Other players still see LobbyScreen
                 └─ NOT MULTIPLAYER (desync!)
```

### Backend Integration (TODO)

**API Endpoint: POST /api/lobbies/{roomId}/start-battle**

**Request:**
```javascript
{
  userId: "user-123"  // Host making request
}
```

**Server-Side Logic:**
```javascript
// 1. VALIDATE HOST
if (lobby.hostId !== userId) {
  return 403 FORBIDDEN "Only host can start battle"
}

// 2. VALIDATE LOBBY STATE
if (lobby.phase !== LOBBY_PHASES.LOBBY) {
  return 400 BAD_REQUEST "Lobby already in battle or finished"
}

// 3. VALIDATE ALL PLAYERS READY
if (!lobby.players.every(p => p.ready)) {
  return 400 BAD_REQUEST "Not all players are ready"
}

// 4. VALIDATE SONG SELECTED
if (!lobby.song || !lobby.song.songId) {
  return 400 BAD_REQUEST "Please select a song"
}

// 5. GENERATE BATTLE START TIME (server time)
const battleStartTime = Date.now();  // Unix ms, server's clock

// 6. UPDATE DATABASE
lobby.phase = IN_BATTLE
lobby.battleStartTime = battleStartTime
save_to_database(roomId, lobby)

// 7. BROADCAST PHASE CHANGE TO ALL CLIENTS
broadcast_to_room(roomId, {
  type: MESSAGE_TYPES.PHASE_CHANGE,
  payload: {
    newPhase: IN_BATTLE,
    battleStartTime: battleStartTime,
    roomId: roomId,
    song: lobby.song  // Include song data (lyrics, timings)
  }
})

// 8. RESPOND TO HOST
return 200 OK { 
  phase: IN_BATTLE,
  battleStartTime: battleStartTime
}
```

**WebSocket Broadcast (To All 4 Players):**
```javascript
{
  type: "PHASE_CHANGE",
  payload: {
    newPhase: "IN_BATTLE",
    battleStartTime: 1704067300000,
    roomId: "lobby-uuid-1",
    song: {
      songId: "song-456",
      title: "Bohemian Rhapsody",
      lyrics: ["Is this the real life?", "Is this just fantasy?", ...],
      lineDurations: [2000, 1500, ...],  // ms per lyric line
      lineTimings: [0, 2000, 3500, ...]   // absolute ms in song
    }
  }
}
```

**Enhanced Frontend Flow (TODO):**

```javascript
// In LobbyScreen.jsx
const handleStartBattle = async () => {
  try {
    setIsLoading(true);
    
    // SEND TO SERVER
    const response = await fetch(
      `/api/lobbies/${lobby.roomId}/start-battle`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      showError(error.message);
      return;
    }
    
    const result = await response.json();
    
    // Update store with battleStartTime from server
    // Don't use local Date.now() - use server's time!
    setLobbyStore(state => ({
      lobby: {
        ...state.lobby,
        phase: LOBBY_PHASES.IN_BATTLE,
        battleStartTime: result.battleStartTime  // SERVER TIME
      }
    }));
    
    // Component re-renders with new phase
    // Shows BattlePage instead of LobbyScreen
    
  } catch (err) {
    showError('Failed to start battle: ' + err.message);
  } finally {
    setIsLoading(false);
  }
};

// In store or WebSocket handler
WebSocket.on(MESSAGE_TYPES.PHASE_CHANGE, (payload) => {
  const { newPhase, battleStartTime, roomId, song } = payload;
  
  if (roomId !== lobby.roomId) return;
  
  setLobbyStore(state => ({
    lobby: {
      ...state.lobby,
      phase: newPhase,
      battleStartTime: battleStartTime,
      song: song
    }
  }));
  
  // All clients transition simultaneously!
  // Lyric sync uses: (Date.now() - battleStartTime)
});
```

### Battle Start Validation

**Client-Side Pre-Check (Before Button Click):**
```javascript
const canStart = 
  isHost &&                                    // Must be host
  allReady &&                                  // All players ready
  lobby.song !== null &&                       // Song selected
  lobby.phase === LOBBY_PHASES.LOBBY;          // Still in lobby
```

**Server-Side Validation (Authoritative):**
```javascript
// Always repeats all checks
if (lobby.hostId !== userId) return 403;
if (lobby.phase !== LOBBY) return 400;
if (!lobby.players.every(p => p.ready)) return 400;
if (!lobby.song) return 400;
```

**Why Both?**
- Client: prevents unnecessary API calls
- Server: prevents race conditions and exploits

### Battle Start Timing

**Critical: Use Server Time, Not Client Time**

```javascript
// WRONG - will cause sync issues:
const battleStartTime = Date.now();  // Each client has different clock!

// RIGHT - use server's value:
const response = await fetch('/start-battle');
const { battleStartTime } = response.json();  // From server
setLobbyStore({ battleStartTime });

// Then in BattlePage:
const elapsedMs = Date.now() - battleStartTime;  // Relative to server time

// All clients with same battleStartTime will show same lyric at same time
// Even if their clocks differ by 100-200ms
```

---

## 3. Error Scenarios & Recovery

### Scenario 1: Player Unreadies Just Before Host Clicks Start

**Timeline:**
```
T=0s    Player A: ready=true
        Player B: ready=true
        Host checks: allReady=true
        Host button enabled ✓

T=0.1s  Host clicks "Start Battle"
        Client sends: POST /api/lobbies/{id}/start-battle

T=0.15s Player B:clicks "Ready Up" (toggle)
        Client sends: POST /api/lobbies/{id}/ready {ready: false}
        Server processes this BEFORE start request!

T=0.2s  Server receives: ready {ready: false}
        Database: Player B ready = false
        Broadcast: PLAYER_READY_UPDATE {B, ready: false}

T=0.25s Server receives: start-battle
        Checks: players.every(p => p.ready)?
        Player A: ready ✓
        Player B: ready ✗  (just updated!)
        Response: 400 NOT_ALL_READY

T=0.3s  Host sees error: "Not all players ready"
        Host's "Start Battle" button disabled
        Player B sees "Ready Up" button (unready now)
```

**Result:** ✅ **Prevented inconsistent state**

### Scenario 2: Player Loses Connection

**Timeline:**
```
T=0s    Player A in lobby, ready=false
T=5s    Player A: ready=true
        POST /api/lobbies/{id}/ready
        Network error - connection lost!
        Client retries...
        Still no connection

T=10s   Player A still sees local ready=true (optimistic)
        But server has ready=false (request never sent)
        Host sees Player A not ready

T=15s   Player A reconnects
        Client fetches: GET /api/lobbies/{id}
        Receives: Player A ready=false (from server)
        Client updates local state to match
        Shows correct status to player
```

**Recovery:** Fetch current state on reconnect

```javascript
WebSocket.on('reconnect', async () => {
  // Fetch authoritative lobby state
  const response = await fetch(`/api/lobbies/${lobby.roomId}`);
  const freshLobby = await response.json();
  
  // Replace local state with server state
  setLobbyStore({ lobby: freshLobby });
});
```

### Scenario 3: Lobby Deleted While Waiting to Start

**Timeline:**
```
T=0s    Players A, B, C all ready
        Host offline / AFK
        Lobby waiting...

T=30s   Admin deletes lobby (inactive)
        Server broadcasts: LOBBY_DELETED
        
T=30.1s Players receive: LOBBY_DELETED
        Response:
        - Clear local lobby state
        - Show message: "Lobby was deleted by admin"
        - Navigate back to lobby list
```

**WebSocket Event:**
```javascript
{
  type: "LOBBY_DELETED",
  payload: {
    roomId: "lobby-uuid-1",
    reason: "inactive"  // or "admin", "error", etc.
  }
}
```

**Frontend Handler:**
```javascript
WebSocket.on('LOBBY_DELETED', (payload) => {
  setLobbyStore({ lobby: null });
  showError('Lobby was deleted');
  navigate('/join');
});
```

### Scenario 4: Race Condition - Two Hosts?

**Problem:** Two players both think they're host?

**Solution:** 
- Server has single source of truth: `lobby.hostId`
- If non-host clicks "Start", server rejects (403 FORBIDDEN)
- Only host's request accepted

```javascript
// Server validation
if (lobby.hostId !== userId) {
  return 403 FORBIDDEN "Only host can start battle"
}

// If somehow two sent: first wins, second gets 400 "Already started"
```

---

## 4. UI State Management

### LobbyScreen Component Props & State

```javascript
// From Zustand store
const lobby = useLobbyStore(state => state.lobby);
const currentUserId = useLobbyStore(state => state.currentUserId);

// Derived state
const isHost = lobby.hostId === currentUserId;
const allReady = lobby.players.every(p => p.ready);
const currentPlayerReady = lobby.players
  .find(p => p.id === currentUserId)?.ready || false;

// Render conditions
if (lobby.phase === LOBBY_PHASES.IN_BATTLE) {
  return <BattlePage />;  // Show battle UI
}
if (lobby.phase === LOBBY_PHASES.RESULTS) {
  return <ResultsPage />;  // Show results UI
}

// Default: show lobby
return <LobbyScreen />;  // Show this component
```

### Player Ready Status Display

```javascript
<PlayerItem player={player} isHost={isHost} />

// Output
// Player name | ready status (green/red)
// "Alice 👑" | "Ready ✓" (green)
// "Bob"      | "Not Ready" (red)
// "Carol"    | "Not Ready" (red)
```

### Ready Button States

```javascript
{/* Non-host player */}
<button onClick={toggleReady}>
  Ready Up
</button>

// States:
// - Not ready: "Ready Up" (blue, enabled)
// - Ready: "Ready ✓" (blue, enabled - can unready)

{/* Host player */}
{isHost && (
  <button onClick={startBattle} disabled={!allReady}>
    Start Battle
  </button>
)}

// States:
// - allReady=false: "Start Battle" (gray, disabled, tooltip)
// - allReady=true: "Start Battle" (green, enabled)
// - Loading: "Starting..." (gray, disabled)
```

---

## 5. Integration Checklist

### Frontend Components

- [ ] **LobbyScreen.jsx**
  - [ ] Displays room code (for sharing)
  - [ ] Shows player count (X/maxPlayers)
  - [ ] Calculates allReady correctly
  - [ ] Host can see "Start Battle" button
  - [ ] TODO: BACKEND markers for API calls

- [ ] **PlayerList.jsx**
  - [ ] Displays all players
  - [ ] Shows ready/not-ready status
  - [ ] Shows host crown (👑)
  - [ ] Updates when WebSocket broadcasts

- [ ] **PlayerItem.jsx**
  - [ ] Shows name and status
  - [ ] Shows host crown if applicable
  - [ ] Status colors: green=ready, red=not-ready

- [ ] **LobbyActions.jsx**
  - [ ] "Ready Up" button for all players
  - [ ] "Start Battle" button for host only
  - [ ] Start button disabled until allReady
  - [ ] Loading state during requests
  - [ ] TODO: BACKEND markers for API calls

### API Integration (TODO: BACKEND)

- [ ] **POST /api/lobbies/{roomId}/ready**
  - [ ] Updates player.ready in database
  - [ ] Validates user in lobby and phase=LOBBY
  - [ ] Broadcasts PLAYER_READY_UPDATE to all clients
  - [ ] Returns 200 on success, appropriate error codes

- [ ] **POST /api/lobbies/{roomId}/start-battle**
  - [ ] Validates caller is host
  - [ ] Validates all players ready
  - [ ] Validates song selected
  - [ ] Generates battleStartTime (server's Date.now())
  - [ ] Updates phase to IN_BATTLE in database
  - [ ] Broadcasts PHASE_CHANGE to all clients
  - [ ] Returns 200 with battleStartTime

### WebSocket Integration (TODO: BACKEND)

- [ ] **MESSAGE_TYPES.PLAYER_READY_UPDATE**
  - [ ] Server broadcasts when any player toggles ready
  - [ ] All clients receive and update store
  - [ ] Payload: { userId, ready, roomId, timestamp }

- [ ] **MESSAGE_TYPES.PHASE_CHANGE**
  - [ ] Server broadcasts when host starts battle
  - [ ] All clients receive and transition to BattlePage
  - [ ] Payload: { newPhase, battleStartTime, roomId, song }

- [ ] **CONNECTION LOSS RECOVERY**
  - [ ] On reconnect: fetch latest lobby state
  - [ ] Sync store with server data
  - [ ] Retry pending operations if applicable

---

## 6. Timing Synchronization

### Why Server Timestamp Matters

**Problem with Client Timestamps:**

```javascript
// Client A: battleStartTime = 1704067300000 (clock skew +50ms)
// Client B: battleStartTime = 1704067300100 (clock skew -50ms)
//
// T=2 seconds into song:
// Client A: elapsedMs = (Date.now() - 1704067300000) = 2050ms
// Client B: elapsedMs = (Date.now() - 1704067300100) = 1950ms
//
// Different lyrics shown at same absolute time!
// Users hear different words simultaneously ❌
```

**Solution: Use Server Time:**

```javascript
// Server responds with: battleStartTime = 1704067300000 (UTC)
// All clients store this same value
//
// Client A: elapsedMs = (Date.now() - 1704067300000) = 2005ms
// Client B: elapsedMs = (Date.now() - 1704067300000) = 1995ms
//
// Difference ≤ 10ms (acceptable jitter)
// Both show approximately same lyric ✓
// Time skew doesn't matter - server time is anchor!
```

### Lyric Progression Formula

```javascript
// In BattlePage
const elapsedMs = Date.now() - battleStartTime;
const lineIndex = Math.floor(elapsedMs / avgLineDurationMs);
displayLyric(lyrics[lineIndex]);

// Example: song started at 1704067300000
// Current time: 1704067302340
// Elapsed: 2340ms
// Avg line duration: 1000ms
// Line index: 2340 / 1000 = 2 (3rd line)
// Display: lyrics[2]

// All clients with same battleStartTime → same line at same time
```

---

## 7. Commit Summary

**Section 5: Ready Status & Battle Start Flow**

**Changes:**
- ✅ Enhanced LobbyScreen.jsx with comprehensive documentation (200+ lines)
- ✅ Enhanced PlayerList.jsx with real-time update logic (30+ lines)
- ✅ Enhanced PlayerItem.jsx with status display notes (20+ lines)
- ✅ Enhanced LobbyActions.jsx with ready flow documentation (50+ lines)
- ✅ Added loading states and error handling scaffolding
- ✅ Added TODO: BACKEND markers for API endpoints
- ✅ Created READY_STATUS_BATTLE_START_FLOW.md (this file, 500+ lines)

**Testing:**
- ✅ All components maintain mock functionality
- ✅ No TypeScript/ESLint errors
- ✅ Ready toggle works locally
- ✅ Start button state logic correct
- ✅ All TODO markers in place

**Next Steps:**
- Section 6: Battle Timing & Score Updates
- Final: Comprehensive integration seams audit


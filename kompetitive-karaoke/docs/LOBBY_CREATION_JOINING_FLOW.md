# Lobby Creation & Joining Flow

**Status:** ✅ UI Ready (mock integration complete, backend swap points marked)  
**Target Integration:** REST API + WebSocket subscription  
**Backend Work Required:** Lobby creation, joining, listing, room code generation  

---

## 1. Lobby Creation Flow

### Current Implementation (Mock)

**User Journey:**
1. Click "Create Team" button on welcome screen
2. Navigate to CreateTeam.jsx page
3. Enter room name + select max players
4. Click "Create Team"
5. Store creates lobby object
6. Navigate to LobbyScreen

**Data Flow:**

```
CreateTeam.jsx
  │
  ├─ [User Input]
  │  ├─ roomName: "Epic Singers"
  │  └─ maxPlayers: 4
  │
  └─ handleCreate()
     │
     ├─ CLIENT-SIDE VALIDATION
     │  ├─ roomName not empty
     │  ├─ currentUserId exists
     │  └─ currentUserName exists
     │
     └─ store.createLobby(roomName, maxPlayers)
        │
        └─ LOCAL STATE MUTATION
           ├─ Generate roomId (UUID)
           ├─ Generate roomCode (6-char)
           ├─ Create player (currentUserId)
           ├─ Set phase = LOBBY_PHASES.LOBBY
           └─ Navigate → LobbyScreen
```

**Mock Implementation (Current):**

```javascript
const handleCreate = async () => {
  // Validation
  if (!roomName.trim()) return alert('Please enter a room name');
  if (!currentUserId || !currentUserName) {
    return alert('Please set a username first!');
  }

  setIsLoading(true);
  
  try {
    // CURRENT: Direct store mutation
    createLobby(roomName, maxPlayers);
    navigate('/lobby');
  } finally {
    setIsLoading(false);
  }
};
```

### Backend Integration (TODO)

**POST /api/lobbies**

**Request:**
```javascript
{
  roomName: "Epic Singers",     // 3-50 chars, alphanumeric + spaces
  maxPlayers: 4,                // 2-8 players
  createdBy: "user-123"         // currentUserId
}
```

**Response (201 Created):**
```javascript
{
  roomId: "lobby-uuid-456",     // SERVER-GENERATED, unique UUID
  roomCode: "ABC123",           // SERVER-GENERATED, 6-char shareable code
  roomName: "Epic Singers",
  maxPlayers: 4,
  phase: "LOBBY",               // LOBBY_PHASES.LOBBY
  createdAt: 1704067200,        // Unix timestamp
  players: [
    {
      id: "user-123",           // Creator added automatically
      name: "Alice",
      ready: false,
      score: 0,
      combo: 0,
      accuracy: 0,
      socketId: "socket-abc"
    }
  ]
}
```

**Error Responses:**

| Status | Code | Message | Recovery |
|--------|------|---------|----------|
| 400 | INVALID_ROOM_NAME | Room name too short/long | Re-enter name |
| 400 | DUPLICATE_ROOM_NAME | Room name already exists | Use different name |
| 400 | INVALID_MAX_PLAYERS | Max players outside range [2-8] | Adjust players |
| 400 | OFFENSIVE_ROOM_NAME | Room name blocked (content filter) | Choose different name |
| 403 | ALREADY_IN_LOBBY | User already in active lobby | Leave current lobby first |
| 500 | SERVER_ERROR | Database or server error | Retry, contact support |

**Enhanced Implementation (TODO):**

```javascript
const handleCreate = async () => {
  if (!roomName.trim()) {
    setError('Please enter a room name');
    return;
  }
  if (!currentUserId || !currentUserName) {
    setError('Please set a username first!');
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    // API CALL
    const response = await fetch('/api/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: roomName.trim(),
        maxPlayers,
        createdBy: currentUserId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create room');
    }

    const lobbyData = await response.json();
    
    // UPDATE STORE with server response
    useLobbyStore.setState({ 
      lobby: lobbyData,
      currentUserId,
      currentUserName
    });

    // SUBSCRIBE TO UPDATES
    // TODO: WebSocket.subscribe(`/rooms/${lobbyData.roomId}`);

    navigate('/lobby');
  } catch (err) {
    console.error('[CreateTeam] Error:', err);
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 2. Lobby Joining Flow

### Current Implementation (Mock)

**User Journey (Option 1: Join by Card):**
1. Click "Join Team" on welcome screen
2. See list of available lobbies (from mockLobbies)
3. Click "Join" on a lobby card
4. Store adds current user to lobby.players
5. Navigate to LobbyScreen

**User Journey (Option 2: Join by Room Code):**
1. Click "Join Team" on welcome screen
2. Enter room code (e.g., "ABC123")
3. Click "Join" button
4. Store finds lobby by code, adds user to players
5. Navigate to LobbyScreen

**Data Flow (Card Join):**

```
JoinTeams.jsx
  │
  ├─ [List Display]
  │  └─ mockLobbies: [{roomId, roomCode, roomName, players, ...}, ...]
  │
  ├─ User clicks "Join" on card
  │  │
  │  └─ handleJoin(lobbyId)
  │     │
  │     ├─ FIND LOBBY
  │     │  └─ lobbyToJoin = lobbyList.find(l => l.roomId === lobbyId)
  │     │
  │     ├─ VALIDATION
  │     │  ├─ currentUserId exists
  │     │  ├─ currentUserName exists
  │     │  ├─ Lobby exists
  │     │  └─ Lobby not full (players.length < maxPlayers)
  │     │
  │     └─ store.joinLobby(lobbyToJoin)
  │        │
  │        └─ LOCAL STATE MUTATION
  │           ├─ Add currentUser to lobby.players
  │           └─ Navigate → LobbyScreen
  │
  └─ handleJoinByCode(roomCode)
     │
     ├─ FIND LOBBY BY CODE
     │  └─ lobby = lobbyList.find(l => l.roomCode === code)
     │
     ├─ VALIDATION (same as above)
     │
     └─ store.joinLobby(lobby)
```

**Mock Implementation (Current):**

```javascript
const handleJoin = async (lobbyId) => {
  if (!currentUserId || !currentUserName) {
    return alert('Please set a username first!');
  }

  const lobbyToJoin = lobbyList.find((l) => l.roomId === lobbyId);
  if (!lobbyToJoin) {
    return alert('Lobby not found!');
  }

  if (lobbyToJoin.players.length >= lobbyToJoin.maxPlayers) {
    return alert('Lobby is full!');
  }

  setIsLoading(true);
  setError(null);

  try {
    // CURRENT: Direct store mutation
    joinLobby(lobbyToJoin);
    navigate('/lobby');
  } finally {
    setIsLoading(false);
  }
};
```

### Backend Integration (TODO)

**GET /api/lobbies** (List Available Lobbies)

**Query Parameters:**
```
?status=open       // LOBBY phase only
&maxResults=20     // Pagination
&offset=0          // For pagination
```

**Response (200 OK):**
```javascript
[
  {
    roomId: "lobby-uuid-1",
    roomCode: "ABC123",
    roomName: "Epic Singers",
    maxPlayers: 4,
    currentPlayers: 2,              // NEW: Simple count
    players: [                       // Full details if needed
      { id: "user-123", name: "Alice", ready: false, ... },
      { id: "user-456", name: "Bob", ready: false, ... }
    ],
    phase: "LOBBY",
    createdAt: 1704067200,
    updatedAt: 1704067210
  },
  // ... more lobbies
]
```

**POST /api/lobbies/{roomId}/join** (Join by ID)

**Request:**
```javascript
{
  userId: "user-123",        // currentUserId
  userName: "Alice"          // currentUserName
}
```

**Response (200 OK):**
```javascript
{
  roomId: "lobby-uuid-1",
  roomCode: "ABC123",
  roomName: "Epic Singers",
  maxPlayers: 4,
  phase: "LOBBY",
  players: [
    { id: "user-123", name: "Alice", ready: false, score: 0, ... },
    { id: "user-456", name: "Bob", ready: false, score: 0, ... },
    { id: "user-789", name: "Charlie", ready: false, score: 0, ... }  // NEW
  ],
  // ... rest of lobby object
}
```

**POST /api/lobbies/join-code** (Join by Room Code)

**Request:**
```javascript
{
  roomCode: "ABC123",        // User-entered code
  userId: "user-123",
  userName: "Alice"
}
```

**Response:** Same as /join endpoint

**Error Responses:**

| Status | Code | Message | Recovery |
|--------|------|---------|----------|
| 404 | LOBBY_NOT_FOUND | Room ID doesn't exist | List again, manual retry |
| 404 | CODE_NOT_FOUND | Room code doesn't exist | Enter code again |
| 400 | LOBBY_FULL | Players >= maxPlayers | Choose different lobby |
| 400 | INVALID_PHASE | Lobby not in LOBBY phase | Wait for next round |
| 400 | ALREADY_IN_LOBBY | User already in another active lobby | Leave first |
| 403 | USER_BANNED | User banned from this room | Contact admin |
| 500 | SERVER_ERROR | Database error | Retry, contact support |

**Enhanced Implementation (TODO):**

```javascript
// Load lobbies on mount and poll every 5 seconds
useEffect(() => {
  const fetchLobbies = async () => {
    try {
      const response = await fetch('/api/lobbies?status=open&maxResults=20');
      if (response.ok) {
        const lobbies = await response.json();
        setLobbyList(lobbies);
      }
    } catch (err) {
      console.error('[JoinTeams] Error fetching lobbies:', err);
    }
  };
  
  fetchLobbies();
  const interval = setInterval(fetchLobbies, 5000);
  return () => clearInterval(interval);
}, []);

const handleJoin = async (lobbyId) => {
  if (!currentUserId || !currentUserName) {
    setError('Please set a username first!');
    return;
  }

  const lobbyToJoin = lobbyList.find((l) => l.roomId === lobbyId);
  if (!lobbyToJoin) {
    setError('Lobby not found!');
    return;
  }

  if (lobbyToJoin.players?.length >= lobbyToJoin.maxPlayers) {
    setError('Lobby is full!');
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    // API CALL
    const response = await fetch(`/api/lobbies/${lobbyId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        userName: currentUserName
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to join lobby');
    }

    const updatedLobby = await response.json();
    
    // UPDATE STORE with server response
    useLobbyStore.setState({ lobby: updatedLobby });

    // SUBSCRIBE TO UPDATES
    // TODO: WebSocket.subscribe(`/rooms/${updatedLobby.roomId}`);

    navigate('/lobby');
  } catch (err) {
    console.error('[JoinTeams] Error joining:', err);
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 3. Real-Time Lobby Updates

### Current Implementation (Mock)

**Lobby list static on page load:**
- mockLobbies is hardcoded array
- Doesn't update when players join
- Doesn't reflect server state
- No real-time notifications

**Expected Behavior (Backend):**
- Lobby list updates when lobbies fill/empty
- Display current player count
- Disable "Join" if lobby fills up
- Show "Battle in progress" if phase changes

### Backend Requirements (TODO)

**Option A: Polling (Simpler)**

```javascript
// Fetch lobbies every 5 seconds
const interval = setInterval(async () => {
  const lobbies = await fetch('/api/lobbies?status=open');
  setLobbyList(lobbies);
}, 5000);  // 5-second poll interval
```

**Pros:**
- Simple to implement
- Works with basic REST API
- Predictable bandwidth

**Cons:**
- 5-10 second lag before UI updates
- Wasted requests when nothing changes
- Scales poorly (many users = many requests)

**Option B: WebSocket (Better)**

```javascript
// Subscribe to lobby updates
WebSocket.on('LOBBY_UPDATED', (updatedLobby) => {
  setLobbyList(prev => 
    prev.map(l => l.roomId === updatedLobby.roomId ? updatedLobby : l)
  );
});

WebSocket.on('LOBBY_DELETED', (deletedRoomId) => {
  setLobbyList(prev => prev.filter(l => l.roomId !== deletedRoomId));
});
```

**Pros:**
- Real-time updates (< 100ms)
- Reduces bandwidth (only changes broadcast)
- Scales well to many users

**Cons:**
- More complex backend
- Requires WebSocket infrastructure
- State consistency more important

---

## 4. Room Code System

### Generation Strategy

**Requirements:**
- 6-character alphanumeric (A-Z, 0-9)
- Unique within database
- Memorable and easy to type
- Case-insensitive

**Format: `ABC123`**

```
A = Random letter [A-Z]
B = Random letter [A-Z]
C = Random letter [A-Z]
1 = Random digit [0-9]
2 = Random digit [0-9]
3 = Random digit [0-9]

Total combinations: 26^3 × 10^3 = 17,576,000
```

**Backend Implementation (TODO):**

```javascript
function generateRoomCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  
  let code = '';
  // 3 letters
  for (let i = 0; i < 3; i++) {
    code += letters[Math.floor(Math.random() * 26)];
  }
  // 3 digits
  for (let i = 0; i < 3; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  
  return code;  // e.g., "ABC123"
}

// On room creation:
const roomCode = await generateUniqueRoomCode();
```

**Frontend Display (TODO):**

```javascript
// Show room code in LobbyScreen so creator can share
<div className="room-code">
  <p>Share this code: <strong>{lobby.roomCode}</strong></p>
  <button onClick={() => copyToClipboard(lobby.roomCode)}>
    Copy Code
  </button>
</div>
```

---

## 5. Error Handling & Recovery

### Common Error Scenarios

**Scenario 1: Room Name Already Exists**
```javascript
// Backend response:
{
  status: 400,
  code: 'DUPLICATE_ROOM_NAME',
  message: 'A room with this name already exists'
}

// Frontend handling:
setError(message);
// User can enter different name and retry
```

**Scenario 2: Lobby Full**
```javascript
// On page load, lobby has 3/4 players
// User tries to join
// But by the time request reaches server, 4th player joined

// Backend checks: players.length >= maxPlayers
// Returns 400 LOBBY_FULL

// Frontend:
setError('Lobby is now full. Please choose another.');
// User sees updated list (next poll shows full status)
```

**Scenario 3: Lobby Deleted**
```javascript
// User joins lobby
// Creator then deletes room before join completes

// Backend response:
{
  status: 404,
  code: 'LOBBY_NOT_FOUND',
  message: 'This room no longer exists'
}

// Frontend:
setError('Room deleted. Please create or join another.');
// Go back to lobby list
```

**Scenario 4: User Already in Lobby**
```javascript
// User in lobby A
// Opens another browser tab, tries to join lobby B

// Backend checks current user's active lobby
// Returns 403 ALREADY_IN_LOBBY

// Frontend:
alert('You are already in another lobby. Please leave it first.');
// Or auto-redirect to existing lobby
```

**Scenario 5: Network Error**
```javascript
// Request to /api/lobbies times out

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
} catch (err) {
  if (err.name === 'AbortError') {
    setError('Request timed out. Please try again.');
  } else {
    setError('Network error. Check your connection.');
  }
}
```

---

## 6. State Management

### Before Joining

```javascript
// lobbyStore state
{
  currentUserId: "user-123",
  currentUserName: "Alice",
  lobby: null,                   // No lobby yet
  players: [],
  currentUser: null
}
```

### After Creating Lobby

```javascript
{
  currentUserId: "user-123",
  currentUserName: "Alice",
  lobby: {
    roomId: "lobby-uuid-1",
    roomCode: "ABC123",
    roomName: "Epic Singers",
    maxPlayers: 4,
    phase: "LOBBY",
    players: [
      {
        id: "user-123",
        name: "Alice",
        ready: false,
        score: 0,
        combo: 0,
        accuracy: 0,
        socketId: null
      }
    ],
    createdAt: 1704067200
  },
  players: [
    { id: "user-123", name: "Alice", ready: false, ... }
  ],
  currentUser: "user-123"
}
```

### After Joining Existing Lobby

```javascript
// Same structure, but:
// - lobby.players has multiple entries
// - lobby.createdBy !== currentUserId (not the creator)
// - lobby.roomCode already assigned
```

---

## 7. Integration Checklist

### Pre-Integration

- [ ] **CreateTeam.jsx**
  - [ ] Form validation (room name not empty)
  - [ ] Loading state shown during request
  - [ ] Error messages displayed
  - [ ] Button disabled while loading
  - [ ] TODO markers for API endpoints

- [ ] **JoinTeams.jsx**
  - [ ] Lobby list displayed (from mock or API)
  - [ ] Room code input field
  - [ ] "Join" button disabled if full/no permission
  - [ ] Loading state shown during join
  - [ ] Error messages displayed
  - [ ] TODO markers for API endpoints

- [ ] **lobbyStore.js**
  - [ ] createLobby() action exists (works with mock)
  - [ ] joinLobby() action exists (works with mock)
  - [ ] State structure matches API responses
  - [ ] TODO markers for WebSocket subscriptions

### API Integration (TODO: BACKEND)

- [ ] **POST /api/lobbies**
  - [ ] Creates new lobby
  - [ ] Returns lobby object with roomId + roomCode
  - [ ] Adds creator to players automatically
  - [ ] Validates input (room name, max players)
  - [ ] Returns appropriate error codes

- [ ] **GET /api/lobbies**
  - [ ] Lists open lobbies
  - [ ] Supports pagination
  - [ ] Returns current player counts
  - [ ] Suitable for polling every 5-10 seconds

- [ ] **POST /api/lobbies/{roomId}/join**
  - [ ] Adds user to lobby.players
  - [ ] Validates user not already in lobby
  - [ ] Checks lobby not full
  - [ ] Checks lobby in LOBBY phase
  - [ ] Returns full lobby object

- [ ] **POST /api/lobbies/join-code**
  - [ ] Finds lobby by room code
  - [ ] Same validation as /join
  - [ ] Same response as /join

### WebSocket Integration (TODO: BACKEND)

- [ ] **Subscribe after join:**
  ```javascript
  // After successful join, subscribe to room updates
  WebSocket.subscribe(`/rooms/${lobbyId}`);
  ```

- [ ] **Handle PLAYER_JOINED event:**
  ```javascript
  WebSocket.on('PLAYER_JOINED', (updatedLobby) => {
    useLobbyStore.setState({ lobby: updatedLobby });
  });
  ```

- [ ] **Handle PLAYER_LEFT event:**
  ```javascript
  WebSocket.on('PLAYER_LEFT', (updatedLobby) => {
    useLobbyStore.setState({ lobby: updatedLobby });
  });
  ```

- [ ] **Handle LOBBY_DELETED event:**
  ```javascript
  WebSocket.on('LOBBY_DELETED', () => {
    alert('Lobby was deleted');
    navigate('/join');  // Back to lobby list
  });
  ```

---

## 8. Commit Summary

**Section 4: Lobby Creation & Joining Flow**

**Changes:**
- ✅ Enhanced CreateTeam.jsx with backend integration points (100+ lines)
- ✅ Added error state and loading state management
- ✅ Added validation and TODO: BACKEND markers for API calls
- ✅ Enhanced joinTeams.jsx with same improvements (120+ lines)
- ✅ Added polling mechanism (commented out, ready for activation)
- ✅ Created LOBBY_CREATION_JOINING_FLOW.md (this file, 500+ lines)

**Testing:**
- ✅ Both components maintain mock functionality
- ✅ No errors in TypeScript/ESLint
- ✅ All state management working
- ✅ Navigation flows intact

**Next Steps:**
- Section 5: Ready Status Flow
- Section 6: Battle Timing & Score Updates


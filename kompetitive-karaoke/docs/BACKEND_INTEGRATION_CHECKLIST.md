# Pre-Backend Integration TODO Checklist

## 🏗️ 1. STATE OWNERSHIP & AUTHORITY

### Lobby State
- [ ] Document which fields are owned by client vs server (LobbyStore comments)
  - Server-owned: `roomId`, `hostId`, `phase`, `players` list, `maxPlayers`
  - Client-owned: `currentUserId`, `currentUserName`
- [ ] Add clear comments to `lobbyStore.js` marking each action as "client-only", "server-synced", or "optimistic"
- [ ] Ensure no client code mutates `lobby.players` directly—always use store actions
- [ ] Create enum/constants for valid `phase` values: `"LOBBY"`, `"IN_BATTLE"`, `"RESULTS"`

### Player State
- [ ] Document player object structure and which fields are mutable:
  - Read-only from server: `id`, `name`, `isHost`, `score`
  - Derived client-side: `combo`, `accuracy` (remove if server owns)
  - Mutable by client: `ready` (but validated by server)
- [ ] Clarify: who calculates final scores? (server validation recommended)
- [ ] Add TypeScript interfaces or JSDoc comments defining player shape

### Battle State
- [ ] Document battle-phase-specific state ownership:
  - `currentLine` (lyrics index) → client-side for now, server-driven later
  - `lyrics` array → where does it come from? (song selection or server?)
  - `timestamps` for each lyric line → client polls or server broadcasts?
- [ ] Add inline comments showing future server integration points

---

## 📡 2. EVENT CONTRACTS (Client ↔ Server)

### Define WebSocket Message Format
- [ ] Create `src/types/websocket.ts` or `src/constants/wsMessages.js` listing all valid message types:
  ```
  CLIENT → SERVER:
    - "create_lobby" { roomName, maxPlayers }
    - "join_lobby" { roomCode }
    - "set_ready" { ready: boolean }
    - "start_battle" {} (host only)
    - "audio_chunk" { timestamp, audioData, userId }
    - "leave_lobby" {}

  SERVER → CLIENT:
    - "lobby_state" { lobby object }
    - "player_joined" { player object }
    - "battle_started" { battleStartTime, lyrics, lineTimings }
    - "score_update" { userId, score, combo, accuracy }
    - "battle_ended" { results }
  ```
- [ ] Document expected payload structure for each message
- [ ] Add TypeScript types for all WebSocket messages
- [ ] Document error response format (e.g., `{ type: "error", message, code }`)

### Lobby Creation Flow
- [ ] Replace `createLobby()` action with WebSocket event simulation
  - Currently: synchronous Zustand action
  - Future: client sends `"create_lobby"`, waits for server `"lobby_state"`
- [ ] Add `pending` state to track async operations
- [ ] Document: should client optimistically update UI or wait for server?

### Join Lobby Flow
- [ ] Replace `joinLobby()` with WebSocket event simulation
  - Currently: synchronous mutation
  - Future: client sends `"join_lobby" { roomCode }`, server validates and broadcasts

### Ready Status
- [ ] Ensure `setReady()` can handle optimistic updates vs server validation
- [ ] Add flag to distinguish between pending and confirmed ready state

---

## 🎤 3. AUDIO CAPTURE & STREAMING READINESS

### Audio Capture
- [ ] Add logging/debugging mode to `useAudioCapture.js` (toggleable, no console spam by default)
- [ ] Verify chunk size (20ms) aligns with backend expectations (document in comments)
- [ ] Add error recovery: what if mic goes silent during battle?
- [ ] Ensure cleanup is deterministic (no race conditions on stop)

### Audio Packet Format
- [ ] Document final audio packet structure:
  ```json
  {
    "type": "audio_chunk",
    "userId": "...",
    "lobbyId": "...",
    "timestamp": <ms since battle start>,
    "audioData": <Float32Array as Base64 or binary>
  }
  ```
- [ ] Decide: how is `audioData` serialized? (Base64 or binary WebSocket frame?)
- [ ] Add validation: reject chunks if userId/lobbyId don't match current session

### Audio Streaming Flow
- [ ] Verify: audio only sent during `phase === "IN_BATTLE"` ✓ (already done)
- [ ] Document: should audio stop before or after lyric display ends?
- [ ] Add buffer/queue for chunks in case of network latency
- [ ] Plan: what happens if server disconnects mid-battle? (pause or retry?)

### Mock vs Real Parity
- [ ] Ensure mock WebSocket handler validates the same packet structure as future backend
- [ ] Add `console.log()` in mock handler showing packet summary (not full data)
- [ ] Document: mock handler should simulate realistic latency (future)

---

## ⏱️ 4. BATTLE TIMING & LYRIC SYNCHRONIZATION

### Current Architecture
- [ ] Document: lyrics advance client-side on fixed 4-second timer
- [ ] Identify: this should be **server-driven** for multiplayer fairness
- [ ] Add timestamp tracking: `battleStartTime` from server

### Lyric Progression Redesign (Future)
- [ ] Plan server sends:
  ```json
  {
    "type": "battle_started",
    "battleStartTime": <unix ms>,
    "lyrics": [...],
    "lineDurations": [4000, 4000, 4000, 4000],  // ms per line
    "lineTimings": [0, 4000, 8000, 12000]       // cumulative ms
  }
  ```
- [ ] Client should calculate lyric index from `(now - battleStartTime) / lineDuration`
- [ ] Add utility function: `calculateCurrentLine(battleStartTime, lyrics, timings)`
- [ ] Add buffer tolerance (e.g., ±100ms) for network jitter
- [ ] Document: what if client time skews from server? (time sync strategy)

### LyricsDisplay Component
- [ ] Refactor to accept `battleStartTime` and `lineTimings` instead of managing its own interval
- [ ] Keep interval-based fallback for testing/mock mode
- [ ] Ensure `currentLine` is calculated, not state-managed

### Audio Timestamps
- [ ] Ensure audio chunk `timestamp` is relative to `battleStartTime`
- [ ] Verify: `chunkTimestamp = now - battleStartTime` (not absolute unix time)
- [ ] Document in `useAudioCapture.js` comments

---

## 📊 5. SCORING FLOW

### Current Scoring
- [ ] Document where scores come from:
  - Client increments own score in `LyricsDisplay` (random increment per line)
  - Server increments other players via mock WebSocket
  - **This should change: server validates user's audio + position, then awards score**

### Score Authority
- [ ] Clarify: 
  - **Client responsibility**: capture audio, send chunks, display visual feedback
  - **Server responsibility**: analyze audio, validate timing, calculate score, broadcast to all players
- [ ] Remove random score increments from client (replace with server-driven updates)
- [ ] Add comments explaining future scoring logic (e.g., "Server will analyze audio and increment here")

### Score Message Contract
- [ ] Define `"score_update"` message:
  ```json
  {
    "type": "score_update",
    "userId": "...",
    "scoreGained": <number>,
    "totalScore": <number>,
    "combo": <number>,
    "accuracy": <number>
  }
  ```
- [ ] Ensure UI updates reactively from this message (not from client calculation)

### Results Calculation
- [ ] Document: final results come from server (not derived from live scores)
- [ ] Ensure `ResultsPage` displays server-provided data
- [ ] Verify: player rankings are server-authoritative

---

## 🔄 6. MOCK WEBSOCKET PARITY

### Current Mock Implementation
- [ ] Review `UseMockWebSocket.js` for realistic simulation
- [ ] Ensure mock can handle all future message types (even if not implemented yet)
- [ ] Mock should validate packet structure (same as real backend would)

### Mock Limitations (Document)
- [ ] Mock does NOT analyze audio (just logs chunks)
- [ ] Mock does NOT calculate scores (just random increments)
- [ ] Mock does NOT sync client time (just assumes local clock is correct)
- [ ] Document which features are mocked vs real (add comment block at top of file)

### Switching Strategy
- [ ] Create `src/services/websocket.ts` (or similar) with factory function:
  ```javascript
  export function createWebSocketService(useMock = false) {
    return useMock ? new MockWebSocket() : new RealWebSocket();
  }
  ```
- [ ] Ensure both implement the same interface
- [ ] Add environment variable or config to toggle: `VITE_USE_MOCK_WS=true`
- [ ] Document how to swap in real WebSocket with zero UI changes

---

## 🔌 7. INTEGRATION SEAMS FOR BACKEND SWAP

### Identify All Integration Points
- [ ] **Lobby creation**: `lobbyStore.createLobby()` → replace with WebSocket event
- [ ] **Lobby joining**: `lobbyStore.joinLobby()` → replace with WebSocket event
- [ ] **Ready toggle**: `lobbyStore.setReady()` → validate with server
- [ ] **Battle start**: `lobbyStore.startBattle()` → wait for server `"battle_started"` message
- [ ] **Lyric progression**: `LyricsDisplay` interval → replace with server timestamps
- [ ] **Score updates**: mock increments → replace with server `"score_update"` messages
- [ ] **Audio streaming**: mock logs → replace with real WebSocket send

### Create a "Backend Integration" Checklist in Code
- [ ] Add `// TODO: BACKEND` comments at each integration point:
  ```javascript
  // TODO: BACKEND - Replace this action with WebSocket event
  createLobby: (roomName, maxPlayers = 4) => {
    // Current: synchronous
    // Future: send "create_lobby" event, wait for "lobby_state" response
  }
  ```

### Version Compatibility
- [ ] Document: what if backend is deployed before frontend is ready?
- [ ] Plan graceful degradation (e.g., old clients still use mock)
- [ ] Add backend version/API version negotiation in future WebSocket handshake

---

## ✅ 8. VERIFICATION CHECKLIST BEFORE BACKEND INTEGRATION

### Code Quality
- [ ] All WebSocket message types defined in one place (no magic strings scattered)
- [ ] No direct WebSocket calls in React components (only through hooks/services)
- [ ] Audio capture is resilient (handles permission denied, disconnection, etc.)
- [ ] No console spam or verbose logging in production code
- [ ] Error handling for all async operations (WebSocket connect fail, audio fail, etc.)

### Architecture
- [ ] Mock WebSocket validates same packet structure as backend will
- [ ] State management is clear (client vs server ownership documented)
- [ ] No race conditions between client updates and server messages
- [ ] UI updates reactively from store, not directly from WebSocket handlers
- [ ] All timings are timestamp-based (not interval-based) where multiplayer

### Testing
- [ ] Mock WebSocket mode works end-to-end (create lobby → battle → results)
- [ ] Audio capture works (check console for chunk logs, verify no crashes)
- [ ] Score updates flow correctly (mock sends, UI updates)
- [ ] Player list updates when users join/leave
- [ ] Battle ends cleanly and transitions to results

### Documentation
- [ ] WebSocket message contract is documented (types/interfaces or constants file)
- [ ] State ownership is clear in store comments
- [ ] All "TODO: BACKEND" markers are present and specific
- [ ] README has section: "For Backend Integration: See docs/BACKEND_INTEGRATION.md"
- [ ] Comments explain why hybrid authority (client for UX, server for fairness)

---

## 📋 QUICK REFERENCE: What to Do First

**Before any backend work:**

1. ✓ Define WebSocket message types (create `src/constants/wsMessages.js` or types file)
2. ✓ Document state ownership (add comments to `lobbyStore.js`)
3. ✓ Add "TODO: BACKEND" markers at all integration seams
4. ✓ Verify mock WebSocket validates packets correctly
5. ✓ Ensure audio only sent during `IN_BATTLE` phase ✓ (done)
6. ✓ Remove client-side score calculation (replace with server-driven)
7. ✓ Create WebSocket service factory (easy toggle between mock/real)
8. ✓ Test end-to-end in mock mode (all flows work)
9. ✓ Document integration procedure in `BACKEND_INTEGRATION.md`
10. ✓ Code review with backend team to ensure message contracts are feasible

---

## 🚀 ESTIMATED EFFORT

- **Quick wins** (1-2 hours): Define message types, document ownership
- **Medium effort** (3-4 hours): Add TODO markers, create service factory, write docs
- **Testing** (2-3 hours): End-to-end mock testing, edge cases
- **Total**: ~8 hours of prep before backend team starts
- **Payoff**: Backend integration in <1 hour with zero refactors

---

*Generated for: Kompetitive Karaoke Frontend*  
*Date: January 17, 2026*  
*Status: Ready for backend integration planning phase*

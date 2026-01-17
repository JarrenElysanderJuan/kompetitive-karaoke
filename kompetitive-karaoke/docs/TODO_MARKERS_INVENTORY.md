# TODO: BACKEND Integration Inventory

**Complete Audit of All Backend Integration Points**

---

## 📊 Summary Statistics

- **Total TODO: BACKEND markers:** 106+ across 15 files
- **Highest concentration:** `src/store/lobbyStore.js` (20 markers)
- **Component files:** 10 files with integration markers
- **Documentation files:** 5 files with integration guidelines
- **Critical path items:** 12 (must implement first)
- **Standard integrations:** 94+ (implement progressively)

---

## 🎯 Critical Path (Must Do First)

These 12 items unlock core functionality and must be implemented in order:

### Phase 1: Connection & Authentication (Week 1)

**Item #1: WebSocket Connection Handler**
- **File:** `src/hooks/UseMockWebSocket.js` (line 37)
- **Task:** Replace mock WebSocket with real ws.js client
- **What It Unblocks:** All real-time communication
- **Backend Needs:** WebSocket server on port 3000+, message routing
- **Acceptance:** Can connect, send/receive messages, handle reconnection

**Item #2: User Authentication & Identification**
- **File:** `src/store/lobbyStore.js` (line 345)
- **Task:** Get userId from auth, pass in WebSocket messages
- **What It Unblocks:** Per-user score tracking, leaderboard
- **Backend Needs:** Auth endpoint, JWT tokens, user session
- **Acceptance:** Player identity persisted across battles

**Item #3: Lobby Creation REST Endpoint**
- **File:** `src/pages/CreateTeam.jsx` (line 83)
- **Task:** POST /api/lobbies with room name, max players
- **What It Unblocks:** Multiplayer room creation
- **Backend Needs:** Database schema for lobbies, generate roomCode
- **Acceptance:** Can create room, get back roomId and roomCode

**Item #4: Lobby List REST Endpoint**
- **File:** `src/pages/joinTeams.jsx` (line 78)
- **Task:** GET /api/lobbies to list open rooms
- **What It Unblocks:** Room discovery for other players
- **Backend Needs:** Query lobbies by status, limit results
- **Acceptance:** Returns open rooms with player counts

---

### Phase 2: Lobby Synchronization (Week 1-2)

**Item #5: PLAYER_JOINED Broadcast**
- **File:** `src/store/lobbyStore.js` (line 95)
- **Task:** Server broadcasts when player joins, client adds to list
- **What It Unblocks:** Real-time player list updates
- **Backend Needs:** WebSocket message on player join
- **Acceptance:** All clients see new player instantly

**Item #6: PLAYER_READY_UPDATE Broadcast**
- **File:** `src/store/lobbyStore.js` (line 138)
- **Task:** Server broadcasts when ready status changes
- **What It Unblocks:** Real-time ready status sync
- **Backend Needs:** WebSocket message on ready toggle
- **Acceptance:** All players see ready indicators update

**Item #7: PHASE_CHANGE with battleStartTime**
- **File:** `src/store/lobbyStore.js` (line 190)
- **Task:** Server sends battleStartTime when phase → IN_BATTLE
- **What It Unblocks:** Battle timing synchronization
- **Backend Needs:** Calculate battleStartTime = Date.now() at server
- **Acceptance:** All clients show lyrics in sync

**Item #8: Audio Chunk Acceptance**
- **File:** `src/hooks/useAudioCapture.js` (line 80)
- **Task:** Server accepts AUDIO_CHUNK, validates structure
- **What It Unblocks:** Audio pipeline validation
- **Backend Needs:** Endpoint to accept 20ms chunks (Base64)
- **Acceptance:** No validation errors, chunks queued

---

### Phase 3: Scoring System (Week 2-3)

**Item #9: Audio Analysis Pipeline**
- **File:** `src/components/LyricsDisplay.jsx` (line 43)
- **Task:** Server analyzes audio chunks, calculates syllable scores
- **What It Unblocks:** Score calculation and accuracy metrics
- **Backend Needs:** Syllable detection, pitch extraction, accuracy calc
- **Acceptance:** Scores calculated and broadcasts match expected range

**Item #10: PLAYER_SCORE_UPDATE Broadcast**
- **File:** `src/store/lobbyStore.js` (line 297)
- **Task:** Server broadcasts score increments every 100-200ms
- **What It Unblocks:** Real-time leaderboard updates
- **Backend Needs:** Batch audio analysis, score aggregation
- **Acceptance:** Scores update smoothly in real-time

**Item #11: BATTLE_RESULTS Calculation**
- **File:** `src/store/lobbyStore.js` (line 330)
- **Task:** Server compiles final scores, achievements, rankings
- **What It Unblocks:** Results display with all metrics
- **Backend Needs:** Final score aggregation, accuracy %s, combos
- **Acceptance:** Results show accurate final rankings

**Item #12: Leaderboard Persistence**
- **File:** `docs/RESULTS_DISPLAY_LEADERBOARD.md` (line 166)
- **Task:** Save battle results to database, update user stats
- **What It Unblocks:** Global leaderboard, persistent rankings
- **Backend Needs:** Database update, ELO calculation
- **Acceptance:** Stats visible in user profile after battle

---

## 📂 File-by-File Integration Checklist

### Store: `src/store/lobbyStore.js` (20 TODO markers)

| Line | Task | Priority | Status |
|------|------|----------|--------|
| 95 | `addPlayer()` - PLAYER_JOINED trigger | CRITICAL | TODO |
| 111 | `removePlayer()` - PLAYER_LEFT trigger | CRITICAL | TODO |
| 138 | `setReady()` - broadcast ready update | CRITICAL | TODO |
| 153 | `setSong()` - triggered by server | HIGH | TODO |
| 190 | `setBattleStartTime()` - sync anchor | CRITICAL | TODO |
| 222 | `startBattle()` - wait for PHASE_CHANGE | CRITICAL | TODO |
| 249 | `endBattle()` - triggered by FINISH_BATTLE | HIGH | TODO |
| 297 | `updateScore()` - PLAYER_SCORE_UPDATE | CRITICAL | TODO |
| 330 | `setResults()` - BATTLE_RESULTS message | CRITICAL | TODO |
| 345 | `createLobby()` - POST /api/lobbies | CRITICAL | TODO |
| 383 | `joinLobby()` - POST /api/lobbies/{id}/join | CRITICAL | TODO |

**Key Pattern:** Each action is async. Must communicate with server via REST or WebSocket.

**When Implementing:**
1. Make actions async (return Promise)
2. Add try/catch error handling
3. Update loading states before/after
4. Show user feedback on success/failure
5. Clean up on unmount

---

### Pages: `src/pages/CreateTeam.jsx` (4 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 61 | isLoading state for button | MEDIUM | Show spinner during POST |
| 62 | error state display | MEDIUM | Show validation errors |
| 83 | Replace with real API call | CRITICAL | POST /api/lobbies |
| 109 | Error UI and retry | HIGH | Let user retry failed calls |
| 121 | Error Display component | MEDIUM | Show server error messages |

**Current Mock:**
```javascript
const mockRoom = {
  id: 'room-' + Math.random(),
  roomCode: 'ABC123',
  roomName: teamName,
  host: currentUser.id,
  ...
};
```

**Real Implementation:**
```javascript
// 1. Show loading spinner
setIsLoading(true);

// 2. Call API
const res = await fetch('/api/lobbies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ roomName: teamName, maxPlayers: 4 })
});

// 3. Handle errors
if (!res.ok) {
  const error = await res.json();
  setError(error.message);
  setIsLoading(false);
  return;
}

// 4. Success - join lobby
const room = await res.json();
useLobbyStore.joinLobby(room);
navigate('/lobby');
```

---

### Pages: `src/pages/joinTeams.jsx` (9 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 48 | Error Handling docs | MEDIUM | Document error flows |
| 56 | Real-Time Updates docs | MEDIUM | Polling vs WebSocket |
| 67 | Validation docs | MEDIUM | Room code validation |
| 76 | isLoading state | MEDIUM | Show during join request |
| 77 | error state | MEDIUM | Display validation errors |
| 78 | Load from API | CRITICAL | GET /api/lobbies |
| 84 | Polling/WebSocket setup | HIGH | Poll every 5 seconds OR subscribe |
| 124 | Replace with real API | CRITICAL | POST /api/lobbies/join |
| 141 | WebSocket subscribe | HIGH | After join, subscribe to room |
| 170 | Join by room code | CRITICAL | POST /api/lobbies/join-code |

**Key Challenge:** Lobby list is dynamic. Options:
1. **Polling:** GET /api/lobbies every 5 seconds (simpler, slight latency)
2. **WebSocket:** Subscribe to LOBBY_LIST_UPDATED events (real-time, more complex)

**Recommendation:** Start with polling, upgrade to WebSocket later.

---

### Pages: `src/pages/LobbyScreen.jsx` (2 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 81 | TODO markers doc | MEDIUM | Reference guide for integrations |
| Lines 81+ | Ready button flow | CRITICAL | Send ready to server, listen for broadcast |

**Current Mock Flow:**
```
User clicks "Ready"
  ↓
setReady() updates Zustand
  ↓
Component re-renders
  ✓ Done (mock)
```

**Real Flow:**
```
User clicks "Ready"
  ↓
Send WebSocket "SET_READY" to server
  ↓
Server broadcasts "PLAYER_READY_UPDATE" to all clients
  ↓
All clients receive, update Zustand
  ↓
All players see update simultaneously
```

---

### Pages: `src/pages/BattlePage.jsx` (5 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 132 | TODO documentation | MEDIUM | Explain all integrations |
| 181 | Add battleStartTime | CRITICAL | Use when sending audio chunks |
| 208 | Audio error display | MEDIUM | Show user why audio failed |
| 221 | Replace song mock data | HIGH | Load from server |
| 249 | Send finish-battle msg | HIGH | Tell server battle ended |

**Critical Timing Issue:** LyricsDisplay needs battleStartTime from server.

**Current (WRONG):**
```javascript
// Every 4 seconds, increment line index
setInterval(() => {
  setCurrentLine(prev => prev + 1);
}, 4000);
```

**Real (CORRECT):**
```javascript
// Calculate based on server time
const elapsedMs = Date.now() - battleStartTime;
const currentLineIndex = Math.floor(elapsedMs / lineDurationMs);
setCurrentLine(currentLineIndex);
```

**Why:** Server time anchor prevents clock drift. All 4 players see same lyric.

---

### Components: `src/components/LyricsDisplay.jsx` (3 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 43 | TODO integration guide | MEDIUM | Explain timing strategy |
| 109 | Replace interval calc | CRITICAL | Use timestamp-based formula |
| 114 | DELETE mock increment | CRITICAL | Remove `setCurrentLine(prev => prev + 1)` |

**⚠️ CRITICAL:** This is the most time-sensitive component. Wrong implementation = out of sync lyrics.

**Timeline to Fix:**
1. Receive `battleStartTime` from server in BattlePage
2. Pass as prop to LyricsDisplay
3. Replace interval with calculation
4. Remove mock increment logic

---

### Components: `src/components/LobbyActions.jsx` (2 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 35 | Error handling doc | MEDIUM | Document error flows |
| 41 | Backend flow doc | MEDIUM | Ready button → server → broadcast |

**Ready Button Logic:**
```javascript
// Current: isHost = allPlayersReady
// Real: isHost = allPlayersReady AND serverConfirmed

const canStartBattle = 
  currentUser.isHost && 
  allPlayersReady && 
  serverValidated;
```

---

### Components: `src/components/PlayerList.jsx` (1 TODO marker)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 20 | Real-time update doc | MEDIUM | Explain how updates arrive |

**Optimization Note:** If >10 players, use `React.memo()` to prevent re-renders.

```javascript
const PlayerItem = React.memo(({ player }) => (
  // ... rendering
));
```

---

### Components: `src/components/ScoreCardSidebar.jsx` (1 TODO marker)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 13 | Replace mock scores | CRITICAL | Listen to PLAYER_SCORE_UPDATE |

**Current (Mock):**
```javascript
// Increment random score every 2 seconds
score += Math.random() * 500;
```

**Real:**
```javascript
// Listen for server broadcast
WebSocket.on('PLAYER_SCORE_UPDATE', (update) => {
  updateScore(update.playerId, update.newScore);
});
```

---

### Components: `src/components/PlayerItem.jsx` (1 TODO marker)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| Lines 10-20 | Status display doc | MEDIUM | Show ready/not-ready indicators |

---

### Hooks: `src/hooks/useAudioCapture.js` (3 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 80 | TODO integration guide | MEDIUM | Explain chunk sending |
| Lines 80+ | Send chunks to server | CRITICAL | POST /api/lobbies/{id}/audio |
| Lines 80+ | Error recovery | HIGH | Retry failed sends |

**Audio Chunk Structure (MUST MATCH SERVER EXPECTATION):**
```javascript
{
  type: 'AUDIO_CHUNK',
  lobbyId: string,
  userId: string,
  timestamp: number,           // ms since battleStartTime (NOT unix time!)
  audioData: string,           // Base64 encoded Float32 PCM
  sampleRate: 44100,
  channelCount: 1,
  duration: 20                 // ms
}
```

**Critical:** Timestamp MUST be relative to battleStartTime, not absolute.

---

### Hooks: `src/hooks/UseMockWebSocket.js` (3 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 37 | Integration doc | MEDIUM | Explain mock → real swap |
| 61 | Replace with real send | CRITICAL | Use real WebSocket.send() |
| 91 | Remove score simulation | CRITICAL | Listen to real PLAYER_SCORE_UPDATE |

**Quick Swap Checklist:**
```javascript
// BEFORE (current mock)
if (message.type === 'AUDIO_CHUNK') {
  // Simulate server response
  simulateScoreUpdate();
}

// AFTER (real backend)
if (message.type === 'AUDIO_CHUNK') {
  // Server sends PLAYER_SCORE_UPDATE when ready
  // Just queue the chunk
}
```

---

### Types: `src/types/stateModels.js` (30 TODO markers)

| Scope | Items | Priority | Impact |
|-------|-------|----------|--------|
| Player State | 10 markers | HIGH | Score authority |
| Song Config | 5 markers | CRITICAL | Timing reference |
| Store Actions | 15 markers | CRITICAL | All integrations |

**Key Type Definitions (Will Need Documentation):**
```javascript
// TODO: BACKEND - Define server-side equivalents
PlayerState = {
  id, name, score, accuracy, combo, ready, ...
  // Which fields are READ-ONLY? Which are MUTABLE?
}

SongConfig = {
  id, name, lyrics, lineDurations, lineTimings, ...
  // Where do lineDurations come from? Hardcoded? Database?
}

BattleState = {
  battleStartTime, // ← CRITICAL: This anchors everything
  currentPhase,
  ...
}
```

---

### Constants: `src/constants/wsMessages.js` (5 TODO markers)

| Line | Task | Priority | Notes |
|------|------|----------|-------|
| 157 | Score calculation deprecation note | MEDIUM | Client never calculates |
| 217 | Message validation doc | MEDIUM | Server-side validation |
| 406 | Audio analysis pipeline note | CRITICAL | Server needs audio→score impl |
| 459 | Validation strategy doc | MEDIUM | How to validate payloads |
| 514+ | Message validation helpers | MEDIUM | Add server-side checks |

**Key Insight:** This file is the contract. Every message defined here must be matched on server.

---

## 🔗 Integration Dependencies

### Chain 1: Connection → Lobby → Battle

```
WebSocket Connect (Item #1)
  ↓
Auth (Item #2)
  ↓
Create/Join Lobby (Items #3, #4)
  ↓
Player Join Broadcast (Item #5)
  ↓
Ready Status (Item #6)
  ↓
Phase Change (Item #7)
  ↓
Battle Starts
```

### Chain 2: Audio → Score → Display

```
Capture Audio (useAudioCapture.js)
  ↓
Send Chunks (Item #8)
  ↓
Server Analysis (Item #9)
  ↓
Calculate Score (Item #10)
  ↓
Broadcast Update (Item #10)
  ↓
Display Leaderboard (ScoreCardSidebar)
```

### Chain 3: Battle End → Results

```
Battle Ends (timeout/finish)
  ↓
Calculate Final (Item #11)
  ↓
Send Results (Item #11)
  ↓
Display Results (ResultsPage)
  ↓
Persist (Item #12)
  ↓
Update Stats & ELO
```

---

## 🎯 Implementation Strategy

### Week 1: Connection & Lobby
- [ ] Item #1: WebSocket connection
- [ ] Item #2: Auth & user identification
- [ ] Item #3: Create lobby endpoint
- [ ] Item #4: List lobbies endpoint
- [ ] Item #5: PLAYER_JOINED broadcast
- [ ] Item #6: PLAYER_READY_UPDATE broadcast

**Goal:** Players can create/join lobbies and see each other in real-time

### Week 2: Battle Mechanics
- [ ] Item #7: PHASE_CHANGE with battleStartTime
- [ ] Item #8: Audio chunk acceptance
- [ ] Item #9: Audio analysis pipeline
- [ ] Fix LyricsDisplay timing calculation

**Goal:** Battle starts, lyrics sync, audio captured

### Week 3: Scoring & Results
- [ ] Item #10: PLAYER_SCORE_UPDATE broadcasts
- [ ] Item #11: BATTLE_RESULTS calculation
- [ ] Item #12: Leaderboard persistence
- [ ] Achievements system

**Goal:** Scores calculated, results displayed, leaderboard updated

### Week 4: Polish & Reliability
- [ ] Error recovery
- [ ] Reconnection handling
- [ ] Network latency optimization
- [ ] Performance testing

**Goal:** Production-ready, handles failures gracefully

---

## 📋 Progress Tracking Template

Use this template to track implementation:

```markdown
## Integration Progress

### Week 1
- [ ] Item #1: WebSocket connection
  - Status: Not Started
  - ETA: Mon-Tue
  - Notes: Need ws.js library

- [ ] Item #2: Auth & user identification
  - Status: Not Started
  - ETA: Wed-Thu
  - Notes: Coordinate with auth service

### Week 2
...
```

---

## 🚀 Quick Reference

### Most Important Files to Modify
1. `src/hooks/UseMockWebSocket.js` - Replace with real WebSocket
2. `src/store/lobbyStore.js` - Make all actions async
3. `src/components/LyricsDisplay.jsx` - Fix timing calculation
4. `src/pages/CreateTeam.jsx` - Implement create endpoint
5. `src/pages/joinTeams.jsx` - Implement list/join endpoints

### Highest Impact Fixes
1. **battleStartTime sync** - Fixes all timing issues
2. **Audio analysis** - Enables scoring system
3. **PLAYER_SCORE_UPDATE** - Enables leaderboard
4. **PLAYER_READY_UPDATE** - Enables lobby synchronization

### Most Common Mistakes to Avoid
1. ❌ Calculating score client-side (security flaw)
2. ❌ Using absolute timestamps instead of relative
3. ❌ Sending scores every 20ms (bandwidth waste)
4. ❌ Hardcoding song lyrics instead of fetching
5. ❌ Not handling network disconnection
6. ❌ Forgetting battleStartTime in audio chunks

---

## 📊 Completion Checklist

**Total Items:** 106+  
**Critical Path:** 12  
**Standard:** 94+

- [ ] All 12 critical items complete
- [ ] All 94 standard items complete
- [ ] All error cases handled
- [ ] All TODO: BACKEND comments removed
- [ ] Code reviewed by backend team
- [ ] Ready for production

---

**Generated:** 2024  
**Last Updated:** Based on 6-section frontend prep  
**Status:** Ready for backend team intake


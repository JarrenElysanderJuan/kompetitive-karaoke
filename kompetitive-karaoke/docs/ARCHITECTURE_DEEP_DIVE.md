# Deep Dive: Architecture & Code Explanation

**Comprehensive Technical Breakdown of Kompetitive Karaoke Frontend**

---

## 📐 System Architecture Overview

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KOMPETITIVE KARAOKE ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER (React 19.2 + Vite)                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ Pages ─────────────────────┐  ┌─ Components ────────────────────┐
│  │ • welcome.jsx               │  │ • LobbyActions.jsx              │
│  │ • CreateTeam.jsx            │  │ • PlayerList.jsx                │
│  │ • joinTeams.jsx             │  │ • LyricsDisplay.jsx             │
│  │ • LobbyScreen.jsx           │  │ • ScoreCardSidebar.jsx          │
│  │ • BattlePage.jsx            │  │ • Leaderboard.jsx              │
│  │ • ResultsPage.jsx           │  │ • Podium.jsx                    │
│  └────────┬────────────────────┘  └────────┬───────────────────────┘
│           │                               │
│           └──────────────┬────────────────┘
│                          │
│           ┌──────────────▼──────────────┐
│           │   ZUSTAND STORE             │
│           │ (src/store/lobbyStore.js)   │
│           │                             │
│           │  • lobby state              │
│           │  • player list              │
│           │  • current battle           │
│           │  • results                  │
│           └──────────────┬──────────────┘
│                          │
│           ┌──────────────▼──────────────────────────────┐
│           │   REAL-TIME COMMUNICATION LAYER             │
│           │                                             │
│           │  WebSocket (WebEvents)                      │
│           │  • PLAYER_JOINED                            │
│           │  • PLAYER_READY_UPDATE                      │
│           │  • PHASE_CHANGE (+ battleStartTime)         │
│           │  • PLAYER_SCORE_UPDATE                      │
│           │  • BATTLE_RESULTS                           │
│           │                                             │
│           │  REST API (Async)                           │
│           │  • POST /api/lobbies (create)               │
│           │  • GET /api/lobbies (list)                  │
│           │  • POST /api/lobbies/{id}/join              │
│           │  • POST /api/lobbies/{id}/ready             │
│           │  • POST /api/lobbies/{id}/audio-chunk       │
│           │  • POST /api/lobbies/{id}/finish-battle     │
│           └──────────────┬──────────────────────────────┘
│                          │
│           ┌──────────────▼──────────────┐
│           │   HARDWARE ACCESS LAYER     │
│           │                             │
│           │  Web Audio API              │
│           │  • getUserMedia()           │
│           │  • AudioContext             │
│           │  • AnalyserNode             │
│           │  • 44.1kHz sampling         │
│           │  • 20ms chunking            │
│           └──────────────┬──────────────┘
│                          │
│                         ▼
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│  SERVER LAYER (Node.js + WebSocket)                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ API Layer ─────────────────────────────────────────────────────┐
│  │ • Lobby CRUD endpoints                                          │
│  │ • Audio chunk acceptance & validation                           │
│  │ • User authentication                                           │
│  └─────────────────┬─────────────────────────────────────────────┘
│                    │
│  ┌─ Real-Time Layer ────────────────────────────────────────────┐
│  │ • WebSocket server (Socket.io or ws.js)                     │
│  │ • Message routing & broadcasting                             │
│  │ • Room/lobby subscriptions                                   │
│  └─────────────────┬─────────────────────────────────────────────┘
│                    │
│  ┌─ Audio Analysis Layer ───────────────────────────────────────┐
│  │ • Syllable detection (timing alignment)                     │
│  │ • Pitch extraction (fundamental frequency)                   │
│  │ • Confidence scoring (audio quality)                         │
│  │ • Score aggregation (per-syllable accuracy)                  │
│  │ • Batch processing (100-200ms windows)                       │
│  └─────────────────┬─────────────────────────────────────────────┘
│                    │
│  ┌─ Database Layer ──────────────────────────────────────────────┐
│  │ • Lobbies table (active sessions)                            │
│  │ • Players table (user participation)                          │
│  │ • Battles table (historical records)                          │
│  │ • Battle results table (final scores)                         │
│  │ • User stats table (aggregate statistics)                     │
│  │ • Achievements table (badge awards)                           │
│  └─────────────────┬─────────────────────────────────────────────┘
│                    │
│                   ▼
└──────────────────────────────────────────────────────────────────────┘

```

---

## 🔄 State Management: Zustand Store

### Why Zustand?

**Traditional Redux Problems:**
- Boilerplate (actions, reducers, constants)
- Learning curve
- Excessive indirection

**Zustand Advantages:**
- Minimal boilerplate
- Direct mutation (looks like vanilla JavaScript)
- Built-in DevTools support
- Automatic subscription cleanup
- No context provider wrapper needed

### Store Structure

```javascript
// src/store/lobbyStore.js
export const useLobbyStore = create((set, get) => ({
  // ===== LOBBY STATE (SERVER-OWNED) =====
  lobby: {
    id: null,
    roomCode: null,
    roomName: null,
    host: null,
    players: [],
    maxPlayers: 4,
    createdAt: null
  },

  // ===== BATTLE STATE (SERVER-OWNED) =====
  battle: {
    battleId: null,
    phase: 'LOBBY', // 'LOBBY' | 'IN_BATTLE' | 'RESULTS'
    battleStartTime: null, // CRITICAL: Server sends this
    currentSong: null,
    endReason: null,
    isFinished: false
  },

  // ===== RESULTS STATE (SERVER-OWNED) =====
  battleResults: {
    players: [],
    mode: 'ranked',
    timestamp: null
  },

  // ===== ACTIONS =====
  addPlayer: (player) => set(state => ({
    lobby: {
      ...state.lobby,
      players: [...state.lobby.players, player]
    }
  })),

  updateScore: (playerId, newScore) => set(state => ({
    lobby: {
      ...state.lobby,
      players: state.lobby.players.map(p =>
        p.id === playerId ? { ...p, score: newScore } : p
      )
    }
  })),

  setBattleStartTime: (timestamp) => set(state => ({
    battle: { ...state.battle, battleStartTime: timestamp }
  }))
}));
```

### Key Design Pattern: Ownership

**Why This Matters:**
Every piece of state has a clear owner:
- **SERVER-OWNED:** Readonly from client, updated via WebSocket
- **SHARED:** Updated by both server and client, must coordinate
- **CLIENT-ONLY:** Local state, not persisted

**Example: Score Ownership**
```javascript
// WRONG: Client calculates score
player.score += calculateScore(audioChunk);

// RIGHT: Server calculates, client receives
WebSocket.on('PLAYER_SCORE_UPDATE', (msg) => {
  updateScore(msg.playerId, msg.newScore);
});
```

---

## 🎮 Component Hierarchy & Responsibilities

### Page: BattlePage.jsx

**What It Does:**
- Container for active battle
- Orchestrates all battle components
- Handles audio capture lifecycle
- Detects battle end and shows results

**Component Tree:**
```
BattlePage
├── LyricsDisplay
│   └── Current line of lyrics
├── ScoreCardSidebar
│   └── Real-time leaderboard
├── PlayerList
│   └── All players with avatars
└── useAudioCapture (hook)
    └── Microphone input/output
```

**Critical State Dependencies:**
```javascript
// Current battle phase
const phase = useLobbyStore(state => state.battle.phase);

// Anchor for lyric progression
const battleStartTime = useLobbyStore(state => state.battle.battleStartTime);

// Current song metadata
const currentSong = useLobbyStore(state => state.battle.currentSong);

// Players with live scores
const players = useLobbyStore(state => state.lobby.players);
```

**Key Lifecycle:**
```javascript
useEffect(() => {
  // 1. Battle starts → request audio permission
  if (phase === 'IN_BATTLE') {
    startAudioCapture();
  }
}, [phase]);

useEffect(() => {
  // 2. Listen for battle end signal from server
  const checkBattleStatus = () => {
    if (battle.isFinished) {
      // Cleanup audio
      stopAudioCapture();
      // Navigate to results
      navigate('/results');
    }
  };
}, [battle.isFinished]);
```

### Component: LyricsDisplay.jsx

**What It Does:**
- Displays current line of lyrics
- Updates based on time elapsed since battleStartTime

**The Timing Algorithm (CRITICAL):**

```javascript
// CURRENT (MOCK - WRONG):
setInterval(() => {
  setCurrentLine(prev => prev + 1);  // Every 4 seconds
}, 4000);

// REAL (CORRECT):
useEffect(() => {
  const interval = setInterval(() => {
    if (!battleStartTime) return;
    
    // Calculate time elapsed since battle started
    const elapsedMs = Date.now() - battleStartTime;
    
    // Get line durations from song metadata
    // lineDurations = [4000, 4500, 3800, ...] (ms per line)
    const lineIndex = song.lineDurations
      .reduce((lineIdx, duration, idx) => {
        if (idx === 0) return 0;
        const cumulativeTime = song.lineDurations
          .slice(0, idx)
          .reduce((a, b) => a + b, 0);
        return elapsedMs > cumulativeTime ? idx : lineIdx;
      }, 0);
    
    setCurrentLine(lineIndex);
  }, 50); // Check every 50ms for smooth updates
  
  return () => clearInterval(interval);
}, [battleStartTime, song]);
```

**Why Server Time Anchor?**

Without it:
```
Client A clock:  10:00:00.000  → Line 1
Client B clock:  10:00:00.100  → Line 2
Client C clock:  09:59:59.900  → Line 0
Result: OUT OF SYNC ❌
```

With it:
```
Server sends: battleStartTime = 10:00:00.000
All clients calculate: elapsedMs = Date.now() - 10:00:00.000
Client A: 10:00:04.000 - 10:00:00.000 = 4000ms → Line 1 ✓
Client B: 10:00:04.000 - 10:00:00.000 = 4000ms → Line 1 ✓
Client C: 10:00:04.000 - 10:00:00.000 = 4000ms → Line 1 ✓
Result: ALL IN SYNC ✓
```

### Component: ScoreCardSidebar.jsx

**What It Does:**
- Real-time leaderboard display
- Updates as PLAYER_SCORE_UPDATE arrives from server

**Current Flow (Mock):**
```javascript
// Every 2 seconds, increment random scores
setInterval(() => {
  setPlayers(prev => prev.map(p => ({
    ...p,
    score: p.score + Math.random() * 500
  })));
}, 2000);
```

**Real Flow:**
```javascript
// Listen for server broadcasts
useEffect(() => {
  // Mock WebSocket in UseMockWebSocket.js
  // Real WebSocket in future
  useLobbyStore.subscribe(
    (state) => state.lobby.players,
    (players) => {
      // Zustand updated → re-render
      // Scores came from PLAYER_SCORE_UPDATE
    }
  );
}, []);

// Component re-renders automatically
return (
  <div>
    {players.map(p => (
      <ScoreCard key={p.id} score={p.score} combo={p.combo} />
    ))}
  </div>
);
```

---

## 🎤 Audio Capture Pipeline

### Web Audio API Flow

```
┌──────────────────────────────────────────────────────┐
│  USER ALLOWS MICROPHONE ACCESS                       │
│  navigator.mediaDevices.getUserMedia({ audio: true })│
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  CREATE AUDIO CONTEXT                                │
│  new AudioContext({ sampleRate: 44100 })             │
│  (Why 44.1kHz? CD quality, industry standard)        │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  CREATE SOURCE & ANALYSER                            │
│  • source = audioContext.createMediaStreamSource()   │
│  • analyser = audioContext.createAnalyser()          │
│  • analyser.fftSize = 2048 (for 20ms chunks)         │
│  • source → analyser → destination                   │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  POLLING LOOP (NOT EVENT-BASED!)                     │
│  requestAnimationFrame() every 20ms                  │
│                                                       │
│  Why polling? getByteFrequencyData() is only         │
│  available via polling, not via events               │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  GET FREQUENCY DATA                                  │
│  analyser.getByteFrequencyData(frequencyArray)       │
│  • Returns 1024 bins (frequency spectrum)            │
│  • Each bin = frequency intensity (0-255)            │
│  • Used for visualization + server analysis          │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  ENCODE TO BASE64 (for transmission)                 │
│  btoa(String.fromCharCode(...frequencyArray))        │
│  • Raw: 1024 bytes                                   │
│  • Base64: ~1365 bytes                               │
│  • Every 20ms = ~68.25KB/sec per player              │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  SEND CHUNK TO SERVER                                │
│  POST /api/lobbies/{id}/audio-chunk                  │
│  {                                                    │
│    type: 'AUDIO_CHUNK',                              │
│    timestamp: elapsedMs,  ← RELATIVE to battleStart! │
│    audioData: base64String,                          │
│    userId: currentUser.id                            │
│  }                                                    │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  SERVER RECEIVES & QUEUES                            │
│  • Validates timestamp is within battle window       │
│  • Queues for batch analysis                         │
│  • Returns 200 OK                                    │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  SERVER ANALYZES (100-200ms batches)                 │
│  • Decode Base64 → Float32 samples                   │
│  • Run pitch detection (autocorrelation)             │
│  • Run syllable detection                            │
│  • Calculate accuracy vs reference pitch             │
│  • Aggregate score for this window                   │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  BROADCAST PLAYER_SCORE_UPDATE                       │
│  WebSocket to all 4 clients:                         │
│  {                                                    │
│    type: 'PLAYER_SCORE_UPDATE',                      │
│    playerId: 'player-123',                           │
│    newScore: 1250,                                   │
│    accuracy: 92.5,                                   │
│    combo: 12                                         │
│  }                                                    │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  CLIENT UPDATES UI                                   │
│  • Zustand updates score                             │
│  • ScoreCardSidebar re-renders                       │
│  • All 4 players see update instantly ✓              │
└──────────────────────────────────────────────────────┘
```

---

## 📡 WebSocket Message Synchronization

### Key Messages (Server → Client)

```javascript
// 1. PLAYER_JOINED - When someone joins lobby
{
  type: 'PLAYER_JOINED',
  player: {
    id: 'player-123',
    name: 'Alex',
    ready: false,
    score: 0
  }
}
// Effect: Add to players list, update UI

// 2. PLAYER_READY_UPDATE - When someone toggles ready
{
  type: 'PLAYER_READY_UPDATE',
  playerId: 'player-123',
  isReady: true
}
// Effect: Update player.ready, enable Start button if all ready

// 3. PHASE_CHANGE - Battle starts (CRITICAL!)
{
  type: 'PHASE_CHANGE',
  newPhase: 'IN_BATTLE',
  battleStartTime: 1705521600000,  // Unix ms from server
  currentSong: {
    id: 'song-1',
    name: 'Hello',
    lyrics: ['Line 1', 'Line 2', ...],
    lineDurations: [4000, 4500, 3800, ...],
    duration: 245000
  }
}
// Effect: Hide lobby, show battle, start lyric progression

// 4. PLAYER_SCORE_UPDATE - Live scoring (100-200ms freq)
{
  type: 'PLAYER_SCORE_UPDATE',
  playerId: 'player-123',
  newScore: 1250,
  accuracy: 92.5,
  combo: 12
}
// Effect: Update in Zustand, leaderboard re-renders

// 5. BATTLE_RESULTS - When battle ends
{
  type: 'BATTLE_RESULTS',
  battleId: 'battle-uuid',
  players: [
    { id: 'player-1', finalScore: 8520, accuracy: 94.2, combo: 47 },
    { id: 'player-2', finalScore: 7840, accuracy: 89.1, combo: 35 }
  ],
  endedAt: timestamp
}
// Effect: Save to Zustand, navigate to ResultsPage
```

---

## 🎯 Score Calculation Deep Dive

### Why Server-Calculated Only?

**Security Problem (Client-Side Calculation):**
```javascript
// VULNERABLE! User can cheat!
const score = syllableCount * 100 + bonusPoints;
// User modifies: score *= 10 (10x multiplier)
// Result: 100,000 points (fake)
```

**Secure Solution (Server-Side Calculation):**
```
User sends: Raw audio chunk (can't be faked)
Server calculates: Analysis of actual audio
  ├─ Syllable detection (timing)
  ├─ Pitch extraction (accuracy)
  ├─ Confidence scoring (audio quality)
  └─ Final score (authoritative)
Result: Fair, tamper-proof ✓
```

### Scoring Formula

```
Score = Σ(syllable score for each syllable)

Where syllable score =
  (timing_accuracy × pitch_accuracy × confidence × points_per_syllable)

Timing accuracy = How close to the right time (-200ms to +200ms window)
  • +200ms too early: 0%
  • ±0ms (perfect): 100%
  • +200ms too late: 0%
  
Pitch accuracy = How well voice matches song pitch (±semitone tolerance)
  • Perfect match: 100%
  • ±1 semitone: 70%
  • ±2 semitone: 30%
  • >2 semitone: 0%

Confidence = Audio quality (noise floor, SNR)
  • Clean audio: 100%
  • Noisy: 50%
  • Very noisy: 10%

Points per syllable = Base multiplier (typically 10-50 points)
  • More lyrics = more points possible

Combo multiplier = 1.0x to 3.0x
  • Miss a syllable: combo resets to 1.0x
  • Hit 5 in a row: 1.5x
  • Hit 20 in a row: 2.0x
  • Hit 50+ in a row: 3.0x

Final score = base_score × combo_multiplier
```

### Example Calculation

```
Song: "Hello" (4 syllables per line)

Line 1: "Hel-lo, it's me"
  Syllables: [Hel, lo, it's, me]
  
  Hel:
    - Timing: +50ms (90% accuracy)
    - Pitch: Perfect (100% accuracy)
    - Confidence: 95%
    - Points per syllable: 25
    - Combo: 1x (first syllable)
    = 25 × 0.90 × 1.00 × 0.95 × 1.0 = 21.4 points
    
  lo:
    - Timing: -30ms (92% accuracy)
    - Pitch: +0.5 semitone (85% accuracy)
    - Confidence: 92%
    - Points per syllable: 25
    - Combo: 2x (2 in a row)
    = 25 × 0.92 × 0.85 × 0.92 × 1.2 = 22.8 points
    
  it's:
    - Timing: MISSED (-200ms to +200ms window)
    - = 0 points
    - Combo: RESET to 1x
    
  me:
    - Timing: +40ms (93% accuracy)
    - Pitch: Perfect (100%)
    - Confidence: 96%
    - Points per syllable: 25
    - Combo: 2x (2 in a row, restarted)
    = 25 × 0.93 × 1.00 × 0.96 × 1.2 = 27.0 points

Line 1 Total = 21.4 + 22.8 + 0 + 27.0 = 71.2 points

Entire Song (245 seconds, ~150 syllables):
  Average score: 71.2 / 4 = ~17.8 per syllable
  Total score: ~17.8 × 150 = ~2,670 points

With combos & bonuses: Can reach 8,000-10,000 points
```

---

## 🔄 Real-Time Synchronization Strategy

### Challenge: Network Latency

```
Timeline without compensation:
Server calculates score
  ↓ (50ms network)
Client receives PLAYER_SCORE_UPDATE
  ↓ (50ms UI render)
Leaderboard updates on screen

Total perceived latency: 100ms (noticeable)
```

### Solution: Batching Updates

```
Instead of: Broadcast every 20ms (5 messages/100ms)
Do this: Batch 5 messages into 1 broadcast every 100ms

Benefits:
✓ 80% reduction in WebSocket messages
✓ 80% less CPU on server processing
✓ 80% less bandwidth
✗ Slight latency (100ms) but acceptable for game

Recommendation: Send every 100-200ms
  • 100ms: More responsive leaderboard
  • 200ms: Lower server load
  • Pick based on player feedback
```

### Timestamp Strategy

**Why Use Relative Timestamps?**

```
Absolute (WRONG):
Message: { timestamp: 1705521600000 }  (Unix milliseconds)
Problem: Client clock might be off by 10 seconds!
Result: Chunks out of order, audio desync

Relative (CORRECT):
Message: { timestamp: 45000 }  (ms since battle start)
How: elapsedMs = Date.now() - battleStartTime
Problem solved: All clients have same reference point ✓
```

---

## 📊 Results Display Pipeline

### Data Flow After Battle

```
1. Server detects battle end (timeout or finish signal)
   ↓
2. Server calculates final scores for all players
   ↓
3. Server broadcasts BATTLE_RESULTS message:
   {
     players: [
       { finalScore: 8520, accuracy: 94.2, combo: 47 },
       { finalScore: 7840, accuracy: 89.1, combo: 35 }
     ]
   }
   ↓
4. Client receives BATTLE_RESULTS
   ↓
5. Zustand updates battleResults state
   ↓
6. ResultsPage mounts (navigate triggered)
   ↓
7. Sort players by finalScore (descending)
   ↓
8. Render Podium (top 3) + Leaderboard (all)
   ↓
9. Persist to leaderboard API:
   POST /api/leaderboard/battles
   ↓
10. Server updates user stats:
   • totalBattles++
   • wins++ (if 1st place)
   • avgScore = totalPoints / totalBattles
   • eloRating = newElo (if ranked)
   ↓
11. Server awards achievements:
   • ACCURACY_MASTER (if ≥95%)
   • COMBO_KING (if ≥50x combo)
   • BATTLE_VICTOR (if 1st place)
   ↓
12. ResultsPage displays all metrics
   ↓
13. User clicks "Back to Lobby"
   ↓
14. Reset Zustand state
   ↓
15. Navigate back to LobbyScreen (ready for next battle)
```

---

## 🛡️ Error Handling Patterns

### Three-Tier Error Strategy

**Tier 1: Prevention**
```javascript
// Validate before sending
if (!audioChunk || audioChunk.length === 0) {
  return; // Don't send empty data
}
```

**Tier 2: Recovery**
```javascript
try {
  await fetch('/api/lobbies/{id}/audio-chunk', { ... });
} catch (error) {
  // Retry up to 3 times
  for (let i = 0; i < 3; i++) {
    try {
      await fetch(...);
      break; // Success
    } catch {
      if (i === 2) throw error; // Give up
    }
  }
}
```

**Tier 3: Graceful Degradation**
```javascript
// If audio fails, continue without audio
// Show message: "Singing muted, but battle continues"
if (audioError) {
  setAudioError('Microphone unavailable');
  continueWithoutAudio();
}
```

---

## 🚀 Performance Optimization

### Memory Management

```javascript
// Problem: Thousands of audio chunks accumulating
chunks = [];
for (let i = 0; i < 1000; i++) {
  chunks.push(audioChunk);
}
// Memory leak: 1000 × 4KB = 4MB wasted!

// Solution: Ring buffer (fixed size, reuse)
const ringBuffer = new Float32Array(44100); // 1 second
function addChunk(chunk) {
  ringBuffer.set(chunk, bufferIndex);
  bufferIndex = (bufferIndex + chunk.length) % ringBuffer.length;
}
```

### Rendering Optimization

```javascript
// Problem: Re-render all 1024 frequency bins every 20ms
// = 51,200 re-renders per second (too much!)

// Solution: Throttle renders to 60fps
function throttledRender() {
  requestAnimationFrame(() => {
    setFrequencies(frequencyData); // Max 60 times/sec
  });
}
```

### Network Optimization

```javascript
// Problem: Send audio chunks every 20ms = 50/sec
// 50 × 4KB = 200KB/sec per player

// Solution: Compress + batch
// Option 1: Compress with WebCodecs (future)
// Option 2: Send every 100ms instead of 20ms = 40KB/sec
// Option 3: Use opus codec = 8KB/sec
```

---

## 🎓 Key Takeaways

### 1. Server Time is the Source of Truth
- All clients calculate lyrics based on `battleStartTime` from server
- Prevents clock drift and keeps all players in sync
- **Pattern:** Use server time anchor for any distributed timing

### 2. Score Authority Must Be on Server
- Client sends raw input (audio chunks)
- Server processes and calculates score
- Server broadcasts results to all clients
- **Pattern:** Never trust client calculations; server decides authority

### 3. Relative Timestamps Beat Absolute
- Use `ms since battle start` not `Unix timestamp`
- Client calculates: `elapsedMs = Date.now() - battleStartTime`
- Works even if client clocks are slightly off
- **Pattern:** Use relative timestamps for real-time data

### 4. Batch Updates Over Individual Messages
- Instead of 1 message per 20ms, send 1 message per 100-200ms
- 80% reduction in overhead
- Acceptable latency for most use cases
- **Pattern:** Batch high-frequency updates

### 5. WebSocket for Real-Time, REST for Long-Lived Resources
- WebSocket: Player status, scores, game events
- REST: Lobby list, user profiles, persistent data
- **Pattern:** Choose based on update frequency and persistence

### 6. Zustand Subscription Automatic
- When server updates state, component re-renders
- No manual event listener management needed
- **Pattern:** Use Zustand for all shared state

---

## 📚 References

**Web Audio API:**
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- AnalyserNode: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode

**Zustand:**
- https://github.com/pmndrs/zustand
- Docs: https://docs.pmnd.rs/zustand/

**WebSocket:**
- MDN WebSocket: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- Socket.io: https://socket.io/
- ws.js: https://github.com/websockets/ws

**Audio Analysis:**
- Pitch detection: https://en.wikipedia.org/wiki/Autocorrelation
- FFT analysis: https://en.wikipedia.org/wiki/Fast_Fourier_transform
- MFCC features: https://en.wikipedia.org/wiki/Mel-frequency_cepstrum

---

**This deep dive explains the philosophy and patterns underlying the entire architecture. Use these principles when implementing the backend!**


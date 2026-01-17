# Battle Timing & Live Scoring

**Status:** ✅ UI Ready (mock scoring working, timestamps marked TODO)  
**Target Integration:** Server-driven score calculations and real-time broadcasts  
**Backend Work Required:** Audio analysis, score computation, real-time WebSocket updates  

---

## 1. Battle Timing Architecture

### Current Implementation (Mock)

**Lyric Progression:**
- Fixed 4-second intervals (hardcoded)
- Each client progresses independently
- No synchronization between players
- Players see different lyrics at different times ❌

**Data Flow:**

```
Component mounts
  │
  └─ useEffect: setInterval every 4000ms
     │
     ├─ T=0s   → setCurrentLine(0) → Display "Twinkle, twinkle..."
     ├─ T=4s   → setCurrentLine(1) → Display "How I wonder..."
     ├─ T=8s   → setCurrentLine(2) → Display "Up above..."
     ├─ T=12s  → setCurrentLine(3) → Display "Like a diamond..."
     └─ T=16s  → currentLine >= length → onEnd() → ResultsPage
```

**Problem:**
- Client A's clock: 100ms fast
- Client B's clock: 100ms slow
- After 10 seconds:
  - Client A thinks elapsed: 10.1s → Line 2
  - Client B thinks elapsed: 9.9s → Line 2 (sometimes Line 1)
  - They hear different lyrics simultaneously ❌

### Backend Integration (TODO)

**Server Timestamp Anchor:**

```javascript
// When battle starts, server sends:
{
  type: PHASE_CHANGE,
  payload: {
    newPhase: IN_BATTLE,
    battleStartTime: 1704067300000,  // Server's Date.now()
    song: {
      lyrics: ["Line 1", "Line 2", ...],
      lineDurations: [2000, 1500, 2200, ...],  // ms per line
      lineTimings: [0, 2000, 3500, ...]  // cumulative ms in song
    }
  }
}
```

**Client-Side Calculation (TODO):**

```javascript
// Use server's battleStartTime as anchor
const elapsedMs = Date.now() - battleStartTime;  // Relative to server time
const avgLineDurationMs = 2000;  // or calculate from lineDurations array
const currentLineIndex = Math.floor(elapsedMs / avgLineDurationMs);
setCurrentLine(Math.min(currentLineIndex, lyrics.length - 1));

// All clients with same battleStartTime calculate same line!
// Even if their clocks differ ±200ms
```

**Why This Works:**

```
Server battleStartTime = 1704067300000

Client A (clock 100ms fast):
  Receives: battleStartTime = 1704067300000
  At T=1704067310100 (thinks 10.1s has passed):
  Elapsed = 1704067310100 - 1704067300000 = 10100ms
  Line = floor(10100 / 2000) = 5

Client B (clock 100ms slow):
  Receives: battleStartTime = 1704067300000
  At T=1704067309900 (thinks 9.9s has passed):
  Elapsed = 1704067309900 - 1704067300000 = 9900ms
  Line = floor(9900 / 2000) = 4 (waits 100ms, then jumps to 5)

Result: Both show line 5 within 100ms of each other ✓
```

### Implementation Strategy

**Step 1: Update Props**

```javascript
// LyricsDisplay component
export default function LyricsDisplay({
  lyrics,
  battleStartTime,  // NEW: from server
  lineDurations,    // NEW: from song metadata
  currentTime,      // NEW: server time or Date.now()
  onEnd,
}) {
  // ...
}
```

**Step 2: Timestamp-Based Calculation**

```javascript
useEffect(() => {
  let animationFrameId;
  
  const updateLine = () => {
    // Calculate elapsed time relative to server's battleStartTime
    const elapsedMs = currentTime - battleStartTime;
    
    // Calculate which line should display
    // Use average duration for now, or sum lineDurations array
    const avgDurationMs = lineDurations.length > 0
      ? lineDurations.reduce((a, b) => a + b, 0) / lineDurations.length
      : 2000;  // Fallback
    
    const lineIndex = Math.floor(elapsedMs / avgDurationMs);
    
    // Clamp to valid range
    const displayLine = Math.min(lineIndex, lyrics.length - 1);
    
    setCurrentLine(displayLine);
    
    // Continue until song ends
    if (displayLine < lyrics.length - 1) {
      animationFrameId = requestAnimationFrame(updateLine);
    } else {
      // Song finished
      onEnd && onEnd();
    }
  };
  
  animationFrameId = requestAnimationFrame(updateLine);
  return () => cancelAnimationFrame(animationFrameId);
}, [battleStartTime, lineDurations, lyrics, currentTime, onEnd]);
```

**Step 3: Remove Interval-Based Code**

```javascript
// DELETE the setInterval() approach
// const interval = setInterval(() => { ... }, 4000);

// REPLACE with timestamp calculation above
```

**Benefits:**
- ✅ All clients show same lyric at same time
- ✅ Smooth transitions (requestAnimationFrame)
- ✅ Network jitter doesn't affect timing
- ✅ Easy to seek (just change battleStartTime)

---

## 2. Real-Time Scoring System

### Current Implementation (Mock)

**Score Updates:**
```javascript
// In LyricsDisplay.jsx
setScoreRef.current(prevScore => prevScore + Math.floor(Math.random() * 100));

// Runs every 4 seconds (when line changes)
// Random increment: 0-99 points per line
// Only affects local player's score
```

**Problem:**
- ❌ Client calculates score (allows cheating)
- ❌ Only local updates (no multiplayer)
- ❌ No validation
- ❌ No feedback about why points awarded

### Backend Integration (TODO)

**Score Calculation Flow:**

```
┌─────────────────────────────────────────────────────────┐
│ CLIENT SENDS AUDIO CHUNK                                │
│ {                                                       │
│   timestamp: 1340ms (ms since battle start),           │
│   audioData: Base64EncodedFloat32Array,                │
│   userId: "user-123"                                    │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│ SERVER ANALYZES                                         │
│ 1. Extract syllables from audio                         │
│ 2. Measure pitch + confidence                           │
│ 3. Check timestamp = 1340ms                             │
│ 4. Look up expected lyric at 1340ms                     │
│ 5. Compare: actual vs expected                          │
│                                                         │
│ Analysis Results:                                       │
│   - Timing accuracy: 95% (within ±50ms)               │
│   - Pitch match: 87% (correct note)                     │
│   - Confidence: 92% (clear voice)                       │
│                                                         │
│ Score Calc:                                             │
│   points = 100 × 0.95 × 0.87 × 0.92 = 75 points       │
│   combo multiplier = 1.2× (on beat 12)                  │
│   final = 75 × 1.2 = 90 points                         │
│                                                         │
│ Leaderboard Update:                                     │
│   user-123: 5000 → 5090 points                          │
│   combo: 11 → 12                                        │
│   accuracy: 94% → 95%                                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│ SERVER BROADCASTS TO ALL CLIENTS                        │
│ {                                                       │
│   type: PLAYER_SCORE_UPDATE,                           │
│   payload: {                                            │
│     userId: "user-123",                                │
│     scoreIncrement: 90,                                │
│     totalScore: 5090,                                   │
│     combo: 12,                                          │
│     accuracy: 95,                                       │
│     timestamp: 1704067301340                           │
│   }                                                     │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│ ALL CLIENTS UPDATE DISPLAY                              │
│ - Store: players[0].score = 5090                        │
│ - Store: players[0].combo = 12                          │
│ - Store: players[0].accuracy = 95%                      │
│ - ScoreCardSidebar re-renders                           │
│ - Leaderboard shows live ranking changes                │
└─────────────────────────────────────────────────────────┘
```

### Scoring Metrics

**Points Calculation:**

```javascript
// Base points: 100 per perfect syllable
const basePoints = 100;

// Accuracy multiplier (timing relative to expected)
// 100% = perfect timing (within ±50ms)
// 50% = 500ms off
const timingAccuracy = calculateTimingAccuracy(submittedMs, expectedMs);

// Pitch multiplier (frequency match)
// 100% = exact note match
// 50% = half-step off
// 0% = completely wrong note
const pitchAccuracy = calculatePitchAccuracy(pitchHz, expectedPitchHz);

// Confidence multiplier (signal clarity)
// 100% = clear voice, high SNR
// 50% = moderate background noise
// 0% = can't determine
const confidence = measureConfidence(audioData);

// Combo multiplier (consecutive correct syllables)
// 1.0× = no combo (first syllable)
// 1.5× = 3x combo
// 2.0× = 10x combo
const comboMultiplier = Math.min(1 + (combo * 0.1), 2.0);

// Final score for this chunk
const points = basePoints × timingAccuracy × pitchAccuracy × confidence × comboMultiplier;
```

**Combo System:**

```javascript
// Combo increases on successful syllables
// Resets on miss or poor accuracy (< 50%)

combo = 0
│
├─ Syllable 1: 85% accuracy → combo = 1
├─ Syllable 2: 90% accuracy → combo = 2
├─ Syllable 3: 92% accuracy → combo = 3
├─ Syllable 4: 40% accuracy (miss!) → combo = 0 (RESET)
├─ Syllable 5: 88% accuracy → combo = 1
└─ Syllable 6: 86% accuracy → combo = 2
```

**Accuracy Percentage:**

```javascript
// Overall accuracy across entire battle
// Updated after each syllable

accuracy = (totalCorrectSyllables / totalSyllables) * 100

// Examples:
// 32/40 syllables correct = 80% accuracy
// 38/40 syllables correct = 95% accuracy
```

### Update Frequency

**Server Broadcasting Strategy:**

```javascript
// Option 1: Per-chunk analysis (20ms chunks)
// Broadcast PLAYER_SCORE_UPDATE every 20ms
// Pro: Real-time feedback, true live leaderboard
// Con: 50 updates/sec per player = heavy bandwidth
//      4 players × 50 updates = 200 messages/sec

// Option 2: Batch updates (100-200ms windows)
// Analyze 5-10 chunks (100-200ms of audio)
// Then broadcast PLAYER_SCORE_UPDATE once
// Pro: Reduced bandwidth, still responsive
// Con: Slight delay in leaderboard updates

// Option 3: Per-syllable updates
// Analyze when syllable boundary detected
// Broadcast PLAYER_SCORE_UPDATE per syllable
// Pro: Natural update boundaries
// Con: Variable timing (1-3 syllables per second)

// RECOMMENDED: Option 2 (batch every 100-200ms)
```

**WebSocket Message Format:**

```javascript
{
  type: MESSAGE_TYPES.PLAYER_SCORE_UPDATE,
  payload: {
    userId: "user-123",
    roomId: "lobby-uuid-1",
    
    // Score information
    scoreIncrement: 250,        // Points from this update
    totalScore: 5250,           // Cumulative score
    
    // Performance metrics
    combo: 12,                  // Current combo streak
    accuracy: 94,               // Overall % accuracy
    
    // Analysis details (optional, for UI display)
    analysisDetails: {
      timingAccuracy: 95,       // This chunk's timing
      pitchAccuracy: 88,        // This chunk's pitch
      confidence: 92            // Signal confidence
    },
    
    timestamp: 1704067301340    // Server time
  }
}
```

---

## 3. Battle End Conditions

### Condition 1: Song Complete

**Triggers:**
- Last lyric line displayed
- Sufficient time elapsed (e.g., 4 seconds after last line)

**Server Action:**

```javascript
// When battle duration exceeded song length
const battleElapsedMs = Date.now() - battleStartTime;
const songDurationMs = getTotalSongDuration(song);  // Sum of lineDurations

if (battleElapsedMs > songDurationMs + 5000) {  // 5s buffer
  // End battle
  const finalScores = calculateFinalScores(battle.players);
  
  // Broadcast to all clients
  broadcast({
    type: FINISH_BATTLE,
    payload: {
      reason: "song_complete",
      finalScores: finalScores,
      rankings: rankPlayers(finalScores)
    }
  });
}
```

**Client Action:**

```javascript
WebSocket.on(MESSAGE_TYPES.FINISH_BATTLE, (payload) => {
  stopCapture();
  setLobbyStore(state => ({
    lobby: {
      ...state.lobby,
      phase: LOBBY_PHASES.RESULTS,
      results: payload.finalScores
    }
  }));
  navigate('results');  // or trigger onEnd callback
});
```

### Condition 2: Inactivity Timeout

**Triggers:**
- No audio chunks received for 30+ seconds
- User paused/stopped singing

**Server Action:**

```javascript
// Track last audio time per player
const lastAudioTimeMs = audioChunks[audioChunks.length - 1].timestamp;
const currentTimeMs = Date.now();

if (currentTimeMs - lastAudioTimeMs > 30000) {  // 30 seconds
  // End battle due to inactivity
  broadcast({
    type: FINISH_BATTLE,
    payload: {
      reason: "inactivity",
      finalScores: getCurrentScores(),
      message: "No audio detected for 30 seconds"
    }
  });
}
```

### Condition 3: Manual End

**Triggers:**
- User clicks "End Battle" button
- Host terminates battle early

**Client Action:**

```javascript
const handleManualEnd = async () => {
  try {
    await fetch(`/api/lobbies/${roomId}/finish-battle`, {
      method: 'POST',
      body: JSON.stringify({ userId: currentUserId })
    });
    // Server sends FINISH_BATTLE response
  } catch (err) {
    console.error('Failed to end battle:', err);
  }
};
```

### Condition 4: Battle Timeout

**Triggers:**
- Song duration × 1.5 exceeded
- Prevents infinite battles

**Server Action:**

```javascript
// Failsafe timeout
const maxBattleTimeMs = getSongDuration(song) * 1.5;
const battleElapsedMs = Date.now() - battleStartTime;

if (battleElapsedMs > maxBattleTimeMs) {
  broadcast({
    type: FINISH_BATTLE,
    payload: {
      reason: "timeout",
      message: "Battle duration exceeded maximum"
    }
  });
}
```

---

## 4. Results Display Flow

### Server Final Results

**Broadcast on Battle End:**

```javascript
{
  type: MESSAGE_TYPES.BATTLE_RESULTS,
  payload: {
    roomId: "lobby-uuid-1",
    battleId: "battle-uuid-789",
    finalScores: [
      {
        userId: "user-123",
        userName: "Alice",
        score: 5250,
        combo: 18,
        accuracy: 94,
        rank: 1
      },
      {
        userId: "user-456",
        userName: "Bob",
        score: 4890,
        combo: 15,
        accuracy: 91,
        rank: 2
      },
      // ... rest of players
    ],
    newLeaderboard: [...],  // Persistent leaderboard
    achievements: [
      { userId: "user-123", achievement: "Perfect Combo", level: 3 }
    ]
  }
}
```

### Client Updates

```javascript
WebSocket.on(MESSAGE_TYPES.BATTLE_RESULTS, (payload) => {
  setLobbyStore(state => ({
    lobby: {
      ...state.lobby,
      phase: LOBBY_PHASES.RESULTS,
      battleResults: payload.finalScores,
      battleId: payload.battleId
    }
  }));
  
  // Navigate to ResultsPage
  // Show rankings, scores, achievements
});
```

### ResultsPage Component

```javascript
// Display:
// 1. Podium (top 3 players)
// 2. Full leaderboard (all players with scores)
// 3. Individual stats (combo, accuracy, improvements)
// 4. Achievements unlocked
// 5. "Play Again" or "Return to Lobby" buttons

function ResultsPage({ results }) {
  return (
    <div>
      <Podium top3={results.slice(0, 3)} />
      <FullLeaderboard players={results} />
      <button onClick={startNewBattle}>Play Again</button>
    </div>
  );
}
```

---

## 5. Integration Checklist

### Frontend Components

- [ ] **BattlePage.jsx**
  - [ ] Starts audio capture on mount
  - [ ] Stops audio capture on unmount
  - [ ] Displays recording indicator
  - [ ] Shows audio error state
  - [ ] TODO: BACKEND markers for batch analysis

- [ ] **LyricsDisplay.jsx**
  - [ ] TODO: BACKEND - Replace interval with timestamp calculation
  - [ ] TODO: BACKEND - Remove local score increment
  - [ ] TODO: BACKEND - Use lineDurations from song metadata
  - [ ] Smooth lyric transitions
  - [ ] Handle end of song

- [ ] **ScoreCardSidebar.jsx**
  - [ ] Displays all players' scores
  - [ ] Updates on PLAYER_SCORE_UPDATE
  - [ ] Shows rankings
  - [ ] Shows combo streaks

### API Endpoints (TODO: BACKEND)

- [ ] **POST /api/lobbies/{roomId}/audio-chunk**
  - [ ] Accepts audio chunks with timestamp
  - [ ] Validates roomId, userId, audioData format
  - [ ] Returns 200 OK immediately
  - [ ] Queues for async analysis

- [ ] **POST /api/lobbies/{roomId}/finish-battle**
  - [ ] Validates battle is active
  - [ ] Marks battle as finished
  - [ ] Calculates final scores
  - [ ] Returns 200 OK

### WebSocket Messages (TODO: BACKEND)

- [ ] **MESSAGE_TYPES.PLAYER_SCORE_UPDATE**
  - [ ] Payload includes: userId, scoreIncrement, totalScore, combo, accuracy
  - [ ] Broadcast every 100-200ms during battle
  - [ ] All clients receive and update store

- [ ] **MESSAGE_TYPES.FINISH_BATTLE**
  - [ ] Sent when battle ends (any reason)
  - [ ] Includes final scores and rankings
  - [ ] Triggers ResultsPage display

- [ ] **MESSAGE_TYPES.BATTLE_RESULTS**
  - [ ] Sent when results calculated
  - [ ] Includes full leaderboard
  - [ ] May include achievements/badges

### Audio Analysis Pipeline (TODO: BACKEND)

- [ ] **Syllable Detection**
  - [ ] Split audio chunks into syllables
  - [ ] Detect boundaries between syllables
  - [ ] Associate with lyric line

- [ ] **Pitch Extraction**
  - [ ] Extract fundamental frequency
  - [ ] Compare with expected melody
  - [ ] Calculate accuracy percentage

- [ ] **Timing Validation**
  - [ ] Check timestamp within expected range
  - [ ] Calculate timing accuracy
  - [ ] Track for combo system

- [ ] **Confidence Scoring**
  - [ ] Measure signal-to-noise ratio
  - [ ] Confidence metric (0-100%)
  - [ ] Weight score by confidence

- [ ] **Score Aggregation**
  - [ ] Combine all metrics
  - [ ] Apply combo multiplier
  - [ ] Broadcast updates

---

## 6. Performance Considerations

### Bandwidth

**Audio Streaming:**
```
20ms chunks @ 44.1kHz:
- Raw PCM: 3.5 KB per chunk
- Base64: 4.7 KB per chunk
- Rate: 50 chunks/sec
- Total: ~235 KB/sec per player
- 4 players: ~940 KB/sec (manageable)
```

**Score Updates (Batch Every 200ms):**
```
Per update: ~200 bytes
Rate: 5 updates/sec per player
Total: ~1 KB/sec per player
4 players: ~4 KB/sec (negligible)
```

### Latency Requirements

```
End-to-end latency budget (sync requirement):
- Audio capture: 20-40ms
- Network upload: 20-100ms (typical WiFi)
- Server processing: 10-50ms (analysis)
- Network download: 20-100ms (broadcast)
- Client render: 10-20ms
- Total: 80-310ms (acceptable)

Time skew tolerance: ±100ms
With server timestamp anchor: automatic sync
```

### Server CPU

```
Per player analysis (100ms window):
- 5 chunks (20ms each)
- Syllable detection: ~10ms
- Pitch extraction: ~20ms
- Score calculation: ~5ms
- Total: ~35ms per player
- 4 players: ~140ms per window
- Throughput: ~7 windows/sec (9ms per window)
- Load: Sustainable on modern server
```

---

## 7. Commit Summary

**Section 6: Battle Timing & Live Scoring**

**Changes:**
- ✅ Enhanced BattlePage.jsx with comprehensive documentation (200+ lines)
- ✅ Enhanced LyricsDisplay.jsx with timing algorithm explanation (100+ lines)
- ✅ Added audio error display and loading states
- ✅ Added TODO: BACKEND markers for all required integrations
- ✅ Created BATTLE_TIMING_LIVE_SCORING.md (this file, 600+ lines)

**Testing:**
- ✅ All components maintain mock functionality
- ✅ Audio capture starts/stops correctly
- ✅ Lyrics progress every 4 seconds (mock)
- ✅ Scores update with mock random values
- ✅ No TypeScript/ESLint errors

**Next Steps:**
- Final: Comprehensive integration seams audit
- All sections complete for backend integration
- Ready for real server implementation


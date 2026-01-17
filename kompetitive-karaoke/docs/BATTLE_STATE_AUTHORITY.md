# Battle State Authority & Lyric Synchronization

## Battle State Overview

Battle state manages the active karaoke battle session. It's completely server-driven to ensure fairness and consistency across all players.

```javascript
{
  // SERVER-OWNED (never modified by client)
  startedAt: 1705512345000,        // Unix ms when battle started
  durationMs: 120000,              // Expected battle duration (song length)
  expectedEndAt: 1705512465000,    // startedAt + durationMs
  
  // SERVER-TRACKED (updated by server as players finish)
  finishedPlayers: ["p1", "p3"],   // Players who completed the lyrics
  allFinished: false               // When all players done or timeout
}
```

---

## Lyric Progression Architecture

### Current (Mock) Approach
```
❌ PROBLEM:
   - Fixed 4-second intervals
   - No network sync
   - Same lyric duration for everyone
   - Doesn't handle audio analysis alignment
```

### Backend (Correct) Approach
```
✅ SOLUTION:
   Server sends song metadata with per-line durations
   Client calculates lyric index from elapsed time
   All clients show same lyric at same time (server time-based)
```

---

## Song Configuration Structure

### From Server (SongConfig)

```javascript
{
  songId: "song_42",
  title: "Twinkle Twinkle",
  artist: "Unknown",
  durationMs: 120000,
  
  // LYRICS ARRAY
  lyrics: [
    "Twinkle twinkle little star",   // index 0
    "How I wonder what you are",     // index 1
    "Up above the world so high",    // index 2
    // ... more lines
  ],
  
  // TODO: BACKEND - LINE DURATIONS
  lineDurations: [
    4000,    // line 0: displays for 4 seconds
    4000,    // line 1: displays for 4 seconds
    3500,    // line 2: displays for 3.5 seconds
    4500,    // line 3: displays for 4.5 seconds
    // ... per-line timing
  ],
  
  // TODO: BACKEND - LINE TIMINGS (CUMULATIVE)
  lineTimings: [
    0,       // line 0 starts at 0ms
    4000,    // line 1 starts at 4000ms
    8000,    // line 2 starts at 8000ms
    11500,   // line 3 starts at 11500ms
    16000,   // line 4 starts at 16000ms
    // ... cumulative timestamps
  ],
  
  difficulty: "easy",
  maxScore: 100000,
  fileUrl: "/songs/song_42.mp3"
}
```

---

## Client-Side Lyric Calculation

### Formula for Current Line

```javascript
// Get from server
const battleStartTime = lobby.battleStartTime;
const lineDurations = lobby.song.lineDurations;
const lineTimings = lobby.song.lineTimings;
const lyrics = lobby.song.lyrics;

// Calculate elapsed time
const elapsedMs = Date.now() - battleStartTime;

// METHOD 1: Index lookup (most accurate)
const currentLine = lineTimings.findIndex(
  (timing, index) => 
    timing <= elapsedMs && 
    (index === lineTimings.length - 1 || lineTimings[index + 1] > elapsedMs)
);

// METHOD 2: Average duration fallback (if lineTimings not available)
const avgLineDurationMs = lobby.song.durationMs / lyrics.length;
const currentLineFallback = Math.floor(elapsedMs / avgLineDurationMs);

// Use METHOD 1 when lineTimings available
const displayLine = lineTimings ? currentLine : currentLineFallback;

// Clamp to valid range
const safeCurrentLine = Math.min(
  Math.max(0, displayLine),
  lyrics.length - 1
);
```

### Time Skew Tolerance

```javascript
// If client/server clocks differ:
// Allow ±100ms tolerance for network jitter
const TIME_SKEW_TOLERANCE_MS = 100;

// Track server time on join/phase change
const serverTime = phaseChangeMessage.timestamp;
const clientTime = Date.now();
const clockSkew = clientTime - serverTime;

// Adjust all battleStartTime calculations
const adjustedBattleStartTime = battleStartTime - clockSkew;

// Or: implement NTP-like sync for large skews
if (Math.abs(clockSkew) > 500) {
  // Notify user of sync issues
  console.warn("Large clock skew detected, syncing...");
  // Request time sync from server
}
```

---

## Battle Lifecycle Events

### Event: PHASE_CHANGE to IN_BATTLE

Server sends:
```javascript
{
  type: "PHASE_CHANGE",
  payload: {
    phase: "IN_BATTLE",
    startTime: 1705512345000,      // Unix ms - client uses this
    song: SongConfig,               // includes lyrics + lineDurations
    lineDurations: [...],           // or embedded in song
    lineTimings: [...]              // or embedded in song
  }
}
```

Client receives:
```javascript
// Store battle start time
lobby.battleStartTime = payload.startTime;

// Start audio capture
startAudioCapture();

// Effect recalculates currentLine every animation frame
useEffect(() => {
  const animationFrame = requestAnimationFrame(() => {
    const elapsedMs = Date.now() - lobby.battleStartTime;
    const newLine = calculateCurrentLine(elapsedMs);
    setCurrentLine(newLine);
  });
  return () => cancelAnimationFrame(animationFrame);
}, [lobby.battleStartTime, lobby.song.lineTimings]);
```

---

## Player Finish Events

### What Triggers Finish

```
Player finishes when:
  1. currentLine reaches final index (lyrics.length - 1)
  2. Displayed for full lineDurations[lastIndex]
  3. elapsedMs >= expectedEndTime

Player manually finishes:
  - Can send FINISH_BATTLE message early (skip remaining lines)
  - Server notes time and records finish state
```

### Server Tracking

```javascript
// Server-side (pseudocode)
if (player.currentLine >= totalLines - 1 && 
    elapsedMs >= expectedEndTime) {
  finishedPlayers.add(player.id);
  recordFinishTime(player.id, elapsedMs);  // for leaderboard tiebreaker
}

// When all finished or timeout
if (finishedPlayers.size === allPlayers.size || 
    elapsedMs >= expectedEndTime * 1.5) {
  phaseChange("RESULTS");
  broadcastBattleResults({
    players: [...] // sorted by score, then finish time
  });
}
```

---

## Audio Chunk Timestamps

### Timestamp Relativity

```javascript
// ✅ CORRECT: Relative to battle start
const audioChunk = {
  timestamp: Date.now() - battle.battleStartTime,  // ms since battle started
  audioData: pcmSamples,
  userId: currentUserId,
  lobbyId: roomId
};

// ❌ WRONG: Absolute unix time
const badChunk = {
  timestamp: Date.now(),  // absolute - server can't sync!
  audioData: pcmSamples
};
```

### Server-Side Processing

```javascript
// Server receives chunk with relative timestamp
const chunk = {
  timestamp: 2345,      // ms since this player's battle started
  audioData: Float32Array
};

// Server knows:
// - This player's battle start (from their session)
// - What lyric should be playing at timestamp 2345
// - Previous chunks from this player

// Server can correlate:
// - Audio chunk timestamp 2345 -> should be at lyric index 0
// - Analyze if audio matches expected syllable for lyric 0
// - Calculate accuracy/combo/score increment
```

---

## Battle Timeout & Edge Cases

### Timeout Handling

```javascript
// Server sends battle timeout at:
const TIMEOUT_MULTIPLIER = 1.5;
const battleTimeout = startTime + (durationMs * TIMEOUT_MULTIPLIER);

// At timeout, server:
// 1. Stops accepting audio chunks
// 2. Finalizes scores for all players
// 3. Sends BATTLE_RESULTS
// 4. Transitions to RESULTS phase

// This prevents stuck battles if:
// - Player network fails mid-song
// - Audio capture crashes
// - Player machine freezes
```

### What If Client Clock is Wrong?

```
CLIENT BEHIND (clock slower):
  ✓ Might show lyric 1 second late
  ✓ Audio chunks have old timestamps
  ✓ Server discards if too old (> current time)
  → Fix: Slow sync to server time (not jump)

CLIENT AHEAD (clock faster):
  ✓ Might skip lyrics
  ✓ Audio chunks have future timestamps
  ✓ Server has already analyzed lyric for that timestamp
  → Fix: Don't trust client time for scoring

SOLUTION:
  Server calculates score from server-side time
  Client displays based on battleStartTime anchor
  If skew > threshold: request time sync from server
```

---

## Integration Checklist

- [ ] BattleState includes `startedAt` (unix ms)
- [ ] SongConfig includes `lineDurations` array
- [ ] SongConfig includes `lineTimings` array (cumulative)
- [ ] PHASE_CHANGE message includes `startTime`
- [ ] Client calculates currentLine from elapsed time (not interval)
- [ ] Audio chunk timestamps are relative (not absolute)
- [ ] Handle time skew tolerance (±100ms)
- [ ] Server tracks when each player finishes
- [ ] Battle timeout implemented (1.5x duration)
- [ ] LyricsDisplay refactored to accept `battleStartTime`
- [ ] No more fixed 4-second intervals in battle phase
- [ ] Test: All clients show same lyric at same time (with server)

---

## Migration Path: Mock → Real Backend

### BEFORE (Current Mock)
```javascript
// Fixed interval, no server timing
const interval = setInterval(() => {
  setCurrentLine(prev => prev + 1);
}, 4000);
```

### AFTER (Backend Ready)
```javascript
// Timestamp-based, server-driven
useEffect(() => {
  const frame = requestAnimationFrame(() => {
    const elapsedMs = Date.now() - lobby.battleStartTime;
    const newLine = calculateLineFromElapsed(elapsedMs);
    setCurrentLine(newLine);
  });
  return () => cancelAnimationFrame(frame);
}, [lobby.battleStartTime, lobby.song.lineTimings]);
```

### Changes Required
1. Add `battleStartTime` to lobby state (already done ✓)
2. Enhance `SongConfig` with `lineDurations` and `lineTimings`
3. Update `PHASE_CHANGE` message to include timing data
4. Refactor `LyricsDisplay` to use elapsed time calculation
5. Remove fixed 4-second interval logic
6. Add time skew detection and correction

---

## Summary: Battle Timing Authority

| Responsibility | Owner | Notes |
|---|---|---|
| Start time | Server | Sent in PHASE_CHANGE, unix ms |
| Line durations | Server | Per-line timing in SongConfig |
| Line timings | Server | Cumulative timestamps |
| Lyric index calc | Client | From elapsed time + lineTimings |
| Time skew handling | Both | Server authoritative, client adjusts |
| Audio timestamps | Client | Relative to battle start |
| Audio analysis | Server | Correlates audio with expected lyric |
| Finish tracking | Server | Records when players complete |
| Battle timeout | Server | Ends battle at 1.5x duration |

---

*Document Purpose: Define authority boundaries for battle timing and lyric synchronization*  
*Backend Integration Target: Server-driven time-based lyric progression with audio analysis*

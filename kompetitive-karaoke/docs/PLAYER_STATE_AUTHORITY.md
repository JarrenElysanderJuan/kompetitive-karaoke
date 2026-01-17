# Player State Authority & Scoring Model

## Player Object Structure

```javascript
{
  // SERVER-OWNED, IMMUTABLE
  id: "p1",                    // Unique ID assigned by server
  socketId: "socket_abc123",   // Server's WebSocket connection ID
  isHost: true,                // Assigned at lobby creation
  
  // SERVER-OWNED, IMMUTABLE (set at join)
  name: "Alice",               // Player's display name
  connected: true,             // Current connection status
  
  // MUTABLE BY CLIENT (validated by server)
  ready: false,                // Player marking themselves as ready
  
  // CALCULATED BY SERVER (never client-computed)
  score: 542100,               // Total score (from audio analysis)
  combo: 42,                   // Current streak (consecutive correct)
  accuracy: 98.3,              // % of syllables correct (from audio)
  finished: false              // Set by server when player completes lyrics
}
```

---

## Field Authority Matrix

| Field | Authority | Type | When Mutable | Who Updates |
|-------|-----------|------|-------------|-------------|
| `id` | SERVER | string | Never | Server (at join) |
| `name` | SERVER | string | Never | Server (at join) |
| `socketId` | SERVER | string | Never | Server (at connect) |
| `isHost` | SERVER | boolean | Never | Server (at creation) |
| `connected` | SERVER | boolean | Per connection | Server (on connect/disconnect) |
| `ready` | SHARED | boolean | During LOBBY phase | Client sends intent, Server validates |
| `score` | SERVER | number | During battle | Server only (from audio analysis) |
| `combo` | SERVER | number | During battle | Server only (from audio analysis) |
| `accuracy` | SERVER | number | During battle | Server only (from audio analysis) |
| `finished` | SERVER | boolean | During/after battle | Server only (when player finishes) |

---

## Scoring Authority & Responsibility

### Current (Pre-Backend) State
```
❌ WRONG APPROACH:
   Client: "I'll calculate my own score based on timing"
   Result: Cheating, unfairness, score desync
```

### Backend Integration (Correct)
```
✅ CORRECT APPROACH:

1. CLIENT SENDS: Audio chunks (20ms PCM data) with timestamps
   
2. SERVER RECEIVES: Audio data + player ID + lobby ID

3. SERVER ANALYZES:
   - Extract vocal characteristics (pitch, volume, rhythm)
   - Match against expected lyric syllables
   - Measure timing vs expected beat
   - Identify correct vs missed syllables
   
4. SERVER CALCULATES:
   accuracy = (correctSyllables / totalSyllables) * 100
   combo = consecutive correct syllables (resets on miss)
   pointsGained = basePoints * (1.0 + accuracyBonus) * comboMultiplier
   totalScore += pointsGained
   
5. SERVER BROADCASTS: PLAYER_SCORE_UPDATE to all clients
   {
     type: "PLAYER_SCORE_UPDATE",
     payload: {
       playerId: "p1",
       score: 542100,
       combo: 42,
       accuracy: 98.3
     }
   }
   
6. CLIENT RECEIVES: updateScore() call, updates UI
   
7. ALL CLIENTS: See consistent score (no cheating, fair play)
```

---

## Client vs Server Responsibility

### What Client IS Responsible For:
- ✅ Capturing audio from microphone
- ✅ Sending audio chunks to server
- ✅ Displaying lyrics on beat
- ✅ Showing live score updates from server
- ✅ Managing UI state (ready button, battle controls)
- ✅ Rendering results page with server data

### What Client IS NOT Responsible For:
- ❌ Calculating score from audio
- ❌ Determining accuracy
- ❌ Computing combo multipliers
- ❌ Measuring timing precision
- ❌ Determining win/loss/rankings
- ❌ Persisting final scores (server stores)

### What Server IS Responsible For:
- ✅ Audio analysis (pitch, syllable detection)
- ✅ Timing comparison (client audio vs expected lyrics)
- ✅ Score calculation (accuracy, combo, points)
- ✅ Fairness enforcement (validate client timestamps)
- ✅ Final rankings (sort players by score)
- ✅ Persistence (store results in database)
- ✅ Broadcasting updates (all players see same data)

---

## Player State Mutations in Code

### ✅ CORRECT: Use Store Actions

```javascript
// Player marked as ready
setReady(playerId, true);
// Only mutates: { ready: true }

// Server sent score update
updateScore(playerId, 542100, 42, 98.3);
// Only mutates: { score, combo, accuracy }

// Server said battle ended
endBattle();
// Transitions phase, triggering results display
```

### ❌ WRONG: Direct Mutations

```javascript
// NEVER DO THIS
lobby.players[0].score = 1000;  // Direct mutation - breaks reactivity

// NEVER DO THIS
const player = lobby.players.find(p => p.id === currentUserId);
player.score += 10;              // Circumvents server authority

// NEVER DO THIS
players.map(p => ({...p, score: calculateLocalScore(p)}));  // Client math
```

---

## Ready Status Flow

### LOBBY Phase (Only Time "ready" Can Change)

```
CLIENT:
  1. User clicks "Ready" button
  2. setReady(currentUserId, true)
  3. UI shows "Ready" state (optimistic)
  4. Send WebSocket: { type: "SET_READY", payload: { ready: true } }

SERVER:
  5. Receives SET_READY from client
  6. Validates: Is player in LOBBY phase? Is ready value valid?
  7. Updates server player record: ready = true
  8. Broadcasts PLAYER_READY_UPDATE to all clients

ALL CLIENTS (including originator):
  9. Receive PLAYER_READY_UPDATE
  10. setReady(playerId, true)
  11. UI updates to show player is ready
  12. Check: if allPlayersReady, enable "Start Battle" button
```

### IN_BATTLE Phase (ready is LOCKED)

```
❌ ready field is READ-ONLY during battle
   setReady() should return error if called during IN_BATTLE
   ready is only meaningful in LOBBY phase
```

---

## Combo Example

### How Combo Works

```
Lyric: "Hello world everyone"
Expected syllables: [Hel-lo] [world] [ev-ry-one]

Player sings:
  Hel-lo      ✓ correct
  world       ✓ correct  -> combo = 2
  ev-ry-one   ✓ correct  -> combo = 3
  
  SERVER MESSAGE:
    { type: "PLAYER_SCORE_UPDATE", combo: 3, accuracy: 100 }

Player misses next syllable:
  (silence)   ✗ missed   -> combo = 0

  SERVER MESSAGE:
    { type: "PLAYER_SCORE_UPDATE", combo: 0, accuracy: 75 }
```

### Combo Multiplier

```
score = baseScore * (1 + accuracyBonus) * comboMultiplier

Example:
  baseScore = 100
  accuracy = 90% -> accuracyBonus = 0.9
  combo = 5      -> comboMultiplier = 1 + (combo * 0.1) = 1.5
  
  score = 100 * (1 + 0.9) * 1.5 = 100 * 1.9 * 1.5 = 285 points
```

---

## Summary: What Changes with Backend Integration

### BEFORE (Current Mock)
- Client increments own score (cheating possible)
- Server-side is mocked (no real validation)
- No audio analysis (just logs chunks)
- Scores not persisted

### AFTER (Backend Ready)
- Server analyzes audio, calculates score
- Client only displays server-sent values
- Real audio processing (pitch, syllables, timing)
- Scores persisted in database
- Fair multiplayer competition

---

## Integration Checklist for Player State

- [ ] Remove any `lobby.players[i].score = X` direct mutations
- [ ] Ensure `setReady()` only called in LOBBY phase
- [ ] Verify `updateScore()` only called from server messages
- [ ] Check that `combo` and `accuracy` are never calculated client-side
- [ ] Confirm `finished` flag is only set by server
- [ ] Validate `isHost` is read-only in UI (no reassignment)
- [ ] Document player object shape in JSDoc
- [ ] Test: Can't modify `ready` during IN_BATTLE phase
- [ ] Test: Score updates only come from server

---

*Document Purpose: Establish clear authority boundaries for player state mutations*  
*Backend Integration Target: Zero client-side score calculation*

# WebSocket Event Contracts

## Overview

This document defines the complete contract for all WebSocket messages between client and server. It serves as the specification for real backend implementation and ensures compatibility during integration.

**Status:** Ready for Backend Integration  
**Last Updated:** January 17, 2026

---

## Message Format

All WebSocket messages follow this structure:

```javascript
{
  type: "MESSAGE_TYPE",           // Required: identifies message
  payload: { /* message data */ }  // Optional: depends on message type
}
```

**Transmission:**
- Protocol: JSON strings over WebSocket
- Encoding: UTF-8
- Size: Keep messages compact (< 1MB)
- Frequency: Variable (some messages sent 50x/sec during audio streaming)

---

## Client → Server Messages

### 1. JOIN_LOBBY

Join an existing lobby by room code.

```javascript
{
  type: "JOIN_LOBBY",
  payload: {
    roomCode: "A7KQ",          // 4-character room code
    playerName: "Alice"        // Player's display name (1-50 chars)
  }
}
```

**Server Validation:**
- Room code exists and is valid
- Lobby not full (players.length < maxPlayers)
- Player name is not empty and unique in lobby
- Player not already in another room

**Server Response:**
- Success: Broadcast LOBBY_SNAPSHOT to all in lobby
- Failure: Send ERROR message with code + details

**Error Codes:**
- `ROOM_NOT_FOUND`: Room code doesn't exist
- `ROOM_FULL`: Lobby is at max capacity
- `INVALID_PAYLOAD`: Missing required fields
- `ALREADY_IN_ROOM`: Player already in this room

---

### 2. LEAVE_LOBBY

Leave the current lobby.

```javascript
{
  type: "LEAVE_LOBBY"
  // No payload
}
```

**Server Behavior:**
- Remove player from lobby
- If player was host: assign new host or close lobby
- Broadcast updated LOBBY_SNAPSHOT to remaining players

**Edge Cases:**
- Player already left: Ignore
- Last player leaves: Close lobby
- Player in battle leaves: End battle, send results

---

### 3. SET_READY

Mark player as ready (or not ready) for battle.

```javascript
{
  type: "SET_READY",
  payload: {
    ready: true  // boolean
  }
}
```

**Server Validation:**
- Phase must be LOBBY (not IN_BATTLE or RESULTS)
- payload.ready must be boolean

**Server Response:**
- Success: Broadcast PLAYER_READY_UPDATE
- Failure: Send ERROR

**Note:** If all players ready, host can start battle

---

### 4. START_BATTLE

Host requests to start battle.

```javascript
{
  type: "START_BATTLE"
  // No payload
}
```

**Server Validation:**
- Player must be host
- Phase must be LOBBY
- All players must be ready
- Song must be selected
- At least 1 other player in lobby

**Server Response:**
- Success: Broadcast PHASE_CHANGE to IN_BATTLE with startTime
- Failure: Send ERROR

**Server Actions:**
- Generate battle start time (unix ms)
- Reset all players' scores, combo, accuracy
- Send song configuration with lyrics + timings
- Start listening for audio chunks

---

### 5. SELECT_SONG

Host selects a song for the lobby.

```javascript
{
  type: "SELECT_SONG",
  payload: {
    songId: "song_42"  // Song ID from catalog
  }
}
```

**Server Validation:**
- Player must be host
- Phase must be LOBBY
- Song ID exists in catalog
- Song is available (not deprecated)

**Server Response:**
- Success: Broadcast LOBBY_SNAPSHOT with new song
- Failure: Send ERROR

**Error Codes:**
- `PERMISSION_DENIED`: Player is not host
- `INVALID_OPERATION`: Not in LOBBY phase
- `SONG_NOT_FOUND`: Song ID doesn't exist

---

### 6. SCORE_UPDATE

Player sends their current score (optional, may be deprecated if server calculates all).

```javascript
{
  type: "SCORE_UPDATE",
  payload: {
    score: 542100,    // number
    combo: 42,        // number
    accuracy: 98.3    // number (0-100)
  }
}
```

**Server Behavior:**
- Phase must be IN_BATTLE
- Server may validate/override values
- Server calculates authoritative score (client value ignored)
- Broadcast PLAYER_SCORE_UPDATE to all players

**Future:** This message may be removed if server calculates all scores from audio analysis.

---

### 7. FINISH_BATTLE

Player declares they finished the lyrics.

```javascript
{
  type: "FINISH_BATTLE"
  // No payload
}
```

**Server Behavior:**
- Phase must be IN_BATTLE
- Record finish time for this player
- Add player to finishedPlayers set
- If all players finished: trigger battle end
- If timeout reached: trigger battle end

**Note:** Server may auto-finish if lyrics end or timeout

---

### 8. AUDIO_CHUNK

Stream audio data for analysis (20ms chunks during battle).

```javascript
{
  type: "AUDIO_CHUNK",
  payload: {
    timestamp: 2340,              // ms since battle started (relative)
    audioData: "AgD8//8B/Pv/..."  // Base64-encoded Float32Array
  }
}
```

**Details:**
- Frequency: Every 20ms during IN_BATTLE phase
- Payload: ~5KB per chunk (44.1kHz, 20ms, Base64 encoded)
- Total: ~250KB/sec during battle
- Relative timestamp: Always (now - battleStartTime)

**Server Behavior:**
- Phase must be IN_BATTLE
- Timestamp must be recent (within current time window)
- Discard if too old or too far in future
- Accumulate chunks for audio analysis
- Correlate with expected lyric syllables
- Generate PLAYER_SCORE_UPDATE when syllables detected

**Error Codes:**
- `INVALID_OPERATION`: Not in IN_BATTLE phase
- `INVALID_PAYLOAD`: Timestamp out of range

**TODO: BACKEND - Audio Analysis Algorithm:**
```
1. Decode Base64 audioData to Float32Array
2. Extract audio features (pitch, volume, rhythm)
3. Detect syllable boundaries
4. Compare against expected lyrics at this timestamp
5. Calculate:
   - accuracy: % of syllables correct
   - combo: consecutive correct syllables
   - pointsGained: basePoints × (1 + accuracy bonus) × combo multiplier
6. Send PLAYER_SCORE_UPDATE with new totals
```

---

## Server → Client Messages

### 1. LOBBY_SNAPSHOT

Full lobby state (sent on join or significant changes).

```javascript
{
  type: "LOBBY_SNAPSHOT",
  payload: {
    roomId: "abc123",
    roomCode: "A7KQ",
    phase: "LOBBY",
    song: {
      songId: "song_42",
      title: "Twinkle Twinkle",
      artist: "Unknown",
      durationMs: 120000,
      lyrics: ["Twinkle twinkle", "little star", ...],
      lineDurations: [4000, 4000, ...],
      lineTimings: [0, 4000, 8000, ...],
      difficulty: "easy",
      maxScore: 100000,
      fileUrl: "/songs/song_42.mp3"
    },
    players: [
      {
        id: "p1",
        name: "Alice",
        ready: true,
        score: 0,
        combo: 0,
        accuracy: 0,
        finished: false,
        isHost: true,
        connected: true,
        socketId: "socket_abc123"
      },
      {
        id: "p2",
        name: "Bob",
        ready: false,
        score: 0,
        combo: 0,
        accuracy: 0,
        finished: false,
        isHost: false,
        connected: true,
        socketId: "socket_def456"
      }
    ]
  }
}
```

**When Sent:**
- On player join
- After significant state change
- After PLAYER_READY_UPDATE
- After SELECT_SONG

**Client Action:**
- Replace entire lobby state with this snapshot
- Ensures consistency even if messages lost

---

### 2. PLAYER_READY_UPDATE

A player's ready status changed.

```javascript
{
  type: "PLAYER_READY_UPDATE",
  payload: {
    playerId: "p2",
    ready: true
  }
}
```

**Broadcast:** To all players in lobby

**Client Action:**
- Update player's ready status
- Check if all ready (enable "Start" button if host)

---

### 3. PHASE_CHANGE

Lobby phase transitioned.

```javascript
// LOBBY → IN_BATTLE
{
  type: "PHASE_CHANGE",
  payload: {
    phase: "IN_BATTLE",
    startTime: 1705512345000,
    song: { /* SongConfig */ },
    players: [ /* all players with reset scores */ ]
  }
}

// IN_BATTLE → RESULTS
{
  type: "PHASE_CHANGE",
  payload: {
    phase: "RESULTS",
    startTime: null,
    song: null,
    players: [ /* final players with final scores */ ]
  }
}

// RESULTS → LOBBY
{
  type: "PHASE_CHANGE",
  payload: {
    phase: "LOBBY",
    startTime: null,
    song: { /* previous song or null */ },
    players: [ /* reset ready status */ ]
  }
}
```

**Critical for Client:**
- `startTime` (unix ms): Use for battle timing, NOT Date.now()
- `song`: Contains lyrics + lineDurations + lineTimings
- `players`: Current state of all players

**Client Actions (IN_BATTLE):**
1. Set `battleStartTime = payload.startTime`
2. Extract lyrics and timings from song
3. Mount BattlePage component
4. Start audio capture
5. Begin lyric progression calculation

**Client Actions (RESULTS):**
1. Stop audio capture
2. Display final results
3. Show podium (top 3)
4. Show leaderboard

---

### 4. PLAYER_SCORE_UPDATE

A player's score changed.

```javascript
{
  type: "PLAYER_SCORE_UPDATE",
  payload: {
    playerId: "p1",
    score: 542100,
    combo: 42,
    accuracy: 98.3
  }
}
```

**Broadcast:** To all players

**Frequency:** Variable (every syllable detected, maybe 5-20x per second)

**Client Action:**
- Update player's score, combo, accuracy
- Re-sort leaderboard
- Animate score change in UI

---

### 5. BATTLE_RESULTS

Battle ended, final results available.

```javascript
{
  type: "BATTLE_RESULTS",
  payload: {
    players: [
      {
        id: "p1",
        name: "Alice",
        score: 950000,
        combo: 142,
        accuracy: 99.5,
        finished: true,
        finishTime: 120100,
        isHost: true,
        connected: true,
        ready: false,
        socketId: "socket_abc123"
      },
      {
        id: "p2",
        name: "Bob",
        score: 850000,
        combo: 128,
        accuracy: 98.2,
        finished: true,
        finishTime: 121500,
        isHost: false,
        connected: true,
        ready: false,
        socketId: "socket_def456"
      }
    ]
  }
}
```

**Broadcast:** To all players

**Players Sorted By:**
1. Score (descending)
2. Finish time (ascending, tiebreaker)

**Client Action:**
- Stop audio capture
- Call `endBattle()`
- Display results screen with podium
- Show leaderboard with final scores

---

### 6. ERROR

Generic error message.

```javascript
{
  type: "ERROR",
  payload: {
    message: "Room is full, cannot join",
    code: "ROOM_FULL",
    details: {
      maxPlayers: 4,
      currentPlayers: 4
    }
  }
}
```

**Error Codes:**
- `ROOM_NOT_FOUND`: Lobby doesn't exist
- `ROOM_FULL`: Cannot join, at capacity
- `INVALID_OPERATION`: Operation not valid in current phase
- `PERMISSION_DENIED`: Player lacks permission
- `INVALID_PAYLOAD`: Malformed message
- `SERVER_ERROR`: Unexpected server error
- `SONG_NOT_FOUND`: Song doesn't exist
- `NOT_READY`: Precondition not met
- `ALREADY_IN_ROOM`: Player already in this room
- `TIMEOUT`: Operation exceeded timeout

**Client Action:**
- Show error toast/modal
- Log for debugging
- Optionally retry (depends on error code)

---

## Message Flow Examples

### Complete Battle Flow

```
CLIENT A                   SERVER                   CLIENT B
         |                   |                         |
    connect -------->  accept connection
         |               set A.socketId = socket_1
         |
    JOIN_LOBBY -------> validate room code
         |               A joins "A7KQ"
         |               broadcast LOBBY_SNAPSHOT <------ B joins "A7KQ"
    receive SNAPSHOT        |
      (with B listed)   receive SNAPSHOT
         |                (with A listed)
    SET_READY(true) ---> validate, update A.ready
         |               broadcast PLAYER_READY_UPDATE
      see B ready    <--------- B also ready
         |           |
  A is host,          |
  clicks START    ---> validate: all ready? host?
         |          YES: record startTime = 1705512345000
         |          phase = IN_BATTLE
         |          reset scores
         |          broadcast PHASE_CHANGE
    receive -------->  IN_BATTLE with startTime, song config
    PHASE_CHANGE       battleStartTime = 1705512345000
    startAudio() <------ (same for B)
    calc lyric  |
    send audio  |       accumulate chunks
    chunks -->  |       analyze syllables
         |           detect "Twinkle" → accuracy 95%
         |           broadcast PLAYER_SCORE_UPDATE
    receive -------->  (live score update)
    update UI       |
         |          |  ... continue during battle ...
         |          |
    finish lyrics    record finish time for A
    send FINISH_BATT --> add A to finishedPlayers
         |               B also finishes
         |               both finished → trigger end
         |               calculate final scores
         |               broadcast BATTLE_RESULTS
    receive -------->  (final results with rankings)
    BATTLE_RESULTS      |
    stop audio    <------ (both sides)
    show results  <------ (same for B)
         |               |
```

### Error Flow

```
CLIENT                    SERVER
      |                      |
  JOIN_LOBBY("XYZ") -------> invalid room code
      |                   find("XYZ") returns null
      |                   send ERROR {
      |                     code: "ROOM_NOT_FOUND",
      |                     message: "Room code XYZ not found"
      |                   }
  receive ERROR <----------
  show toast: "Room not found"
      |
  retry or go back
```

---

## Integration Checklist

### Before Backend Integration
- [ ] All message types defined (8 client, 6 server)
- [ ] All payload structures documented
- [ ] Error codes enumerated
- [ ] Examples provided for each message
- [ ] Validation rules specified
- [ ] Broadcast vs point-to-point clarified
- [ ] Frequency/timing noted (e.g., audio 50x/sec)

### During Backend Integration
- [ ] Implement message parsing and validation
- [ ] Add error handling for invalid messages
- [ ] Implement audio analysis pipeline
- [ ] Add message logging for debugging
- [ ] Test each message type in isolation
- [ ] Test complete flow (join → battle → results)
- [ ] Test error cases and edge conditions
- [ ] Verify broadcast to all correct players

### After Backend Integration
- [ ] Monitor message frequency and sizes
- [ ] Optimize payload compression if needed
- [ ] Implement message history/replay for debugging
- [ ] Add rate limiting if necessary
- [ ] Performance profile under load

---

## Summary

| Aspect | Detail |
|--------|--------|
| Protocol | WebSocket over HTTPS |
| Format | JSON strings |
| Encoding | UTF-8 |
| Max Size | < 1MB |
| Audio Frequency | 50 chunks/sec = ~250KB/sec |
| Response Time | < 100ms for critical messages |
| Reliability | All players must receive PHASE_CHANGE |
| Ordering | In-order per connection |

**Total Messages Defined:** 14 (8 client → server, 6 server → client)  
**Error Codes Defined:** 10  
**Payload Examples:** Provided for all  
**Backend Integration Ready:** Yes

---

*Source: Karaoke Multiplayer Design Document v1 + Frontend State Authority Documentation*  
*For Backend: Use this contract as specification, implement validation on server side*

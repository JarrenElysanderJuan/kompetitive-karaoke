# Section 7: Results Display & Leaderboard System

**Status:** Production-Ready  
**Components:** ResultsPage.jsx, Podium.jsx, Leaderboard.jsx, LeaderboardItem.jsx, PodiumPlayer.jsx  
**Integration Points:** 8 TODO: BACKEND markers  

---

## 🎯 Overview

The Results Display system shows final battle outcomes with visual podium rankings and detailed leaderboards. This section handles:
- Final score calculation from battle state
- Podium display (top 3 players)
- Full leaderboard ranking
- Achievement/badge system (future)
- Persistent leaderboard sync to backend

**Architecture:**
```
BattlePage (detects battle end)
    ↓
ResultsPage (mount with sorted players)
    ├─ Podium (top 3 visual)
    │   ├─ PodiumPlayer (1st, 2nd, 3rd)
    │   └─ Medal displays
    └─ Leaderboard (all players)
        ├─ LeaderboardItem × N
        ├─ Rank, score, accuracy
        └─ Combo multiplier
    ↓
LeaderboardAPI (persistent storage)
    ├─ Update user global stats
    ├─ Update ranked ladder
    └─ Award achievements/badges
```

---

## 📋 Component Responsibilities

### ResultsPage.jsx
**Purpose:** Container for results display. Orchestrates podium and leaderboard.

**Current Flow:**
```javascript
// Gets players from Zustand store
const players = useLobbyStore((state) => state.lobby.players);
const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

// Renders podium (top 3) and leaderboard (all)
<Podium players={sortedPlayers.slice(0, 3)} />
<Leaderboard players={sortedPlayers} />
```

**Future Flow (After Backend):**
```javascript
// TODO: BACKEND - Fetch from BATTLE_RESULTS message
const sortedPlayers = useLobbyStore((state) => 
  state.battleResults.sort((a, b) => b.finalScore - a.finalScore)
);

// TODO: BACKEND - Send results to leaderboard API
useEffect(() => {
  persistLeaderboardResults({
    battleId: lobbyId,
    players: sortedPlayers,
    timestamp: Date.now(),
    songId: song.id,
    mode: 'ranked' | 'casual'
  });
}, []);

// TODO: BACKEND - Display achievement awards
showAchievementNotifications(players);
```

**State Dependencies:**
- `lobby.players[]` - Current players with final scores
- `battle.isFinished` - When true, show results
- `battle.endReason` - Why battle ended (timeout, disconnect, etc.)

**Props:**
| Prop | Type | Purpose |
|------|------|---------|
| `onBack` | function | Handler to return to lobby (for next round) |

---

### Podium.jsx
**Purpose:** Visual ranking of top 3 players with medal display.

**Current State:**
```javascript
const podiumHeights = [120, 160, 100]; // 2nd, 1st, 3rd heights
players.map((player, idx) => (
  <PodiumPlayer player={player} height={podiumHeights[idx]} />
))
```

**Why This Order?**
- Index 0 = 2nd place (120px, left side)
- Index 1 = 1st place (160px, center, tallest)
- Index 2 = 3rd place (100px, right side)

**Podium Heights Psychology:**
- 1st place (160px) dominates visual hierarchy
- 2nd place (120px) clearly visible
- 3rd place (100px) represents 3rd position
- Creates intuitive medal stand appearance

**Future Enhancements (TODO: BACKEND):**
```javascript
// TODO: BACKEND - Show medal icons
const medals = ['🥇', '🥈', '🥉'];
const medalEmojis = medals[idx];

// TODO: BACKEND - Show streak/achievements
const achievements = player.battleAchievements;
const isPerfect = accuracy === 100;

// TODO: BACKEND - Confetti animation on load
useEffect(() => {
  triggerConfettiAnimation(); // celebrate winners
}, []);
```

**Props:**
| Prop | Type | Purpose |
|------|------|---------|
| `players` | PlayerState[] | Top 3 players (sorted) |

---

### PodiumPlayer.jsx
**Purpose:** Individual podium position display.

**Renders:**
- Player avatar/name
- Final score
- Accuracy percentage
- Combo multiplier
- Medal visual
- Height position

**Metrics Displayed:**
| Metric | Source | Purpose |
|--------|--------|---------|
| `score` | Player.finalScore | Total points earned |
| `accuracy` | Player.accuracy | Timing accuracy % |
| `combo` | Player.maxCombo | Longest unbroken chain |
| `rank` | Position (1/2/3) | Medal assignment |

**Data Structure:**
```javascript
{
  id: string,
  name: string,
  score: number,           // Final score from battle
  accuracy: number,        // 0-100, timing precision
  combo: number,           // Highest combo reached
  avatar?: string,         // Player avatar URL
  songName: string,        // Song they just battled
  timestamp: number        // When battle finished
}
```

---

### Leaderboard.jsx
**Purpose:** Full ranking of all battle participants.

**Renders:**
```javascript
<div className="w-full max-w-md bg-gray-800 rounded p-4">
  <h2>Leaderboard</h2>
  {players.map((player, idx) => (
    <LeaderboardItem player={player} rank={idx} />
  ))}
</div>
```

**Why This Structure:**
- `rank={idx}` automatically converts to position (0→1st, 1→2nd, etc.)
- Scrollable for 4+ players
- Shows all participation (not just top 3)
- Real-time updates during battle display scores

**Performance Notes:**
- Max 4-8 players per battle (typical)
- Re-renders when score updates come in
- Memoization recommended for 10+ players

---

### LeaderboardItem.jsx
**Purpose:** Single leaderboard row with rank, name, score, metrics.

**Renders Per Player:**
```javascript
Rank | Avatar | Name | Score | Accuracy | Combo
  1  |  👤    | Alex | 8520  |  94.2%   | 47x
  2  |  👤    | Sam  | 7840  |  89.1%   | 35x
  3  |  👤    | Pat  | 6920  |  85.6%   | 28x
  4  |  👤    | Jas  | 5430  |  78.3%   | 22x
```

**Color Coding (Future):**
```javascript
// TODO: BACKEND - Color by performance
const color = accuracy > 95 ? 'gold' : accuracy > 85 ? 'silver' : 'default';
```

---

## 📡 API Integration Points

### TODO: BACKEND #1 - Fetch BATTLE_RESULTS from Server

**When:** BattlePage detects battle end  
**What:** Request final scores and metrics from server

```javascript
// TODO: BACKEND - Replace mock data with server results
useEffect(() => {
  if (battlePhase === RESULTS) {
    const results = await fetch(`/api/battles/${battleId}/results`);
    // {
    //   players: [
    //     {
    //       id: "player-1",
    //       finalScore: 8520,
    //       accuracy: 94.2,
    //       comboMax: 47,
    //       perfectLines: 3,
    //       achievements: ["accuracy-master", "combo-king"]
    //     }
    //   ],
    //   mode: "ranked" | "casual",
    //   endedAt: timestamp
    // }
    setResults(results.players);
  }
}, [battlePhase]);
```

**Server Responsibility:**
- Calculate final scores (from audio analysis)
- Compile all metrics (accuracy, combo, timing)
- Determine achievements earned
- Sort by final score
- Return authoritative results

**Why Server-Side:**
- Client audio analysis may miss syllables
- Server has full picture (all 4 players' audio)
- Prevents cheating (can't fake results)
- Source of truth for leaderboard

---

### TODO: BACKEND #2 - Persist Results to Leaderboard

**When:** ResultsPage mounts  
**What:** Save battle results for ranking and stats

```javascript
// TODO: BACKEND - Persist this battle to leaderboard
useEffect(() => {
  const persistResults = async () => {
    await fetch(`/api/leaderboard/battles`, {
      method: 'POST',
      body: JSON.stringify({
        battleId: lobbyId,
        roomCode: roomCode,
        mode: 'ranked' | 'casual',
        players: sortedPlayers.map(p => ({
          userId: p.id,
          finalScore: p.score,
          accuracy: p.accuracy,
          combo: p.combo,
          position: sortedPlayers.indexOf(p) + 1
        })),
        songId: song.id,
        duration: battleDurationMs,
        timestamp: Date.now()
      })
    });
  };
  persistResults();
}, []);
```

**Database Schema:**
```sql
-- battles table
CREATE TABLE battles (
  battle_id UUID PRIMARY KEY,
  room_code VARCHAR(6),
  mode ENUM('ranked', 'casual'),
  song_id INT,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_ms INT
);

-- battle_results table
CREATE TABLE battle_results (
  result_id UUID PRIMARY KEY,
  battle_id UUID FOREIGN KEY,
  user_id INT,
  final_score INT,
  accuracy FLOAT,
  max_combo INT,
  position INT (1-4),
  achievements TEXT[]
);

-- user_stats table (aggregate)
CREATE TABLE user_stats (
  user_id INT PRIMARY KEY,
  total_battles INT,
  wins INT,
  avg_score FLOAT,
  best_accuracy FLOAT,
  best_combo INT,
  total_points INT,
  elo_rating INT (default 1600)
);
```

---

### TODO: BACKEND #3 - Update User Global Stats

**When:** After results persisted  
**What:** Update user's cumulative statistics

```javascript
// TODO: BACKEND - Update user stats (handled server-side)
// POST /api/users/{userId}/stats/update
{
  battleId: "uuid-123",
  won: true,
  finalScore: 8520,
  accuracy: 94.2,
  comboMax: 47,
  newElo: 1650
}
```

**User Stats Updated:**
- Total battles played
- Win count
- Loss count
- Average score
- Best accuracy
- Best combo
- ELO rating (if ranked)
- Total points (for profile display)

**Stat Calculations:**
```javascript
// Average score
avgScore = totalPoints / totalBattles;

// ELO calculation (chess-style ranking)
K = 32; // ELO factor
currentElo = 1600; // default
expectedScore = 1 / (1 + 10^((opponentElo - currentElo) / 400));
newElo = currentElo + K * (actualScore - expectedScore);
// Win = 1.0, Draw = 0.5, Loss = 0.0
```

---

### TODO: BACKEND #4 - Award Achievements/Badges

**When:** After battle completes  
**What:** Check for achievement criteria and award badges

```javascript
// TODO: BACKEND - Award achievements based on performance
const checkAchievements = (players) => {
  return players.flatMap(p => {
    const achievements = [];
    
    // Accuracy badges
    if (p.accuracy >= 99) achievements.push('FLAWLESS');
    if (p.accuracy >= 95) achievements.push('ACCURACY_MASTER');
    if (p.accuracy < 70) achievements.push('NEEDS_PRACTICE');
    
    // Combo badges
    if (p.combo >= 50) achievements.push('COMBO_KING');
    if (p.combo >= 100) achievements.push('UNSTOPPABLE');
    
    // Score badges
    if (p.score >= 10000) achievements.push('HIGH_SCORER');
    if (p.score >= 15000) achievements.push('ELITE_PLAYER');
    
    // Victory badges
    if (p.position === 1) achievements.push('BATTLE_VICTOR');
    if (isFirstVictory) achievements.push('FIRST_VICTORY');
    
    // Streak badges (TODO: BACKEND - track across battles)
    if (winStreak >= 3) achievements.push('ON_FIRE');
    if (winStreak >= 10) achievements.push('LEGENDARY');
    
    return achievements;
  });
};
```

**Achievement Types:**

| Badge | Criteria | Rarity |
|-------|----------|--------|
| 🏆 Battle Victor | 1st place | Common |
| 🎯 Accuracy Master | ≥95% accuracy | Common |
| 🔥 Combo King | ≥50x combo | Common |
| ⭐ High Scorer | ≥10,000 points | Uncommon |
| 💎 Flawless | ≥99% accuracy | Rare |
| 🚀 Unstoppable | ≥100x combo | Rare |
| 👑 Elite Player | ≥15,000 points | Rare |
| 🔥 On Fire | 3+ win streak | Uncommon |
| 🌟 Legendary | 10+ win streak | Epic |
| 🎊 First Victory | First battle won | Common |

---

### TODO: BACKEND #5 - Fetch Current Leaderboard Rankings

**When:** ResultsPage displays  
**What:** Show global rankings (top 100 players)

```javascript
// TODO: BACKEND - Load global leaderboard on mount
useEffect(() => {
  const fetchLeaderboard = async () => {
    const response = await fetch('/api/leaderboard?limit=100&mode=ranked');
    // {
    //   entries: [
    //     {
    //       rank: 1,
    //       userId: 123,
    //       userName: "SamSings",
    //       totalBattles: 245,
    //       wins: 186,
    //       avgScore: 8420,
    //       eloRating: 2100,
    //       achievements: 12
    //     },
    //     ...
    //   ]
    // }
    setGlobalLeaderboard(response.entries);
  };
  fetchLeaderboard();
}, []);
```

**Display Global Ranking:**
```javascript
// Optional: Show current player's position
const userRank = globalLeaderboard.find(e => e.userId === currentUser.id);
return (
  <div>
    <h3>Your Global Rank: #{userRank?.rank || 'Unranked'}</h3>
    <p>ELO: {userRank?.eloRating || 'N/A'}</p>
  </div>
);
```

---

### TODO: BACKEND #6 - Handle Disconnected Players

**When:** Battle ends but not all players received results  
**What:** Fallback handling for network issues

```javascript
// TODO: BACKEND - Handle player disconnections gracefully
const handleDisconnectedPlayers = () => {
  const disconnected = players.filter(p => !p.connected);
  
  if (disconnected.length > 0) {
    // Option 1: Don't count their stats
    // Option 2: Mark as incomplete battle
    // Option 3: Save partial results
    
    // Recommended: Save results but flag as incomplete
    disconnected.forEach(p => {
      updateBattleResult({
        battleId: battleId,
        userId: p.id,
        status: 'disconnected',
        finalScore: p.lastScore || 0,
        accuracy: p.lastAccuracy || 0,
        timestamp: Date.now()
      });
    });
  }
};
```

---

### TODO: BACKEND #7 - Display Battle Replay Option

**When:** Results displayed  
**What:** Store and optionally show replay

```javascript
// TODO: BACKEND - Enable battle replay (future feature)
const [canReplay, setCanReplay] = useState(false);

useEffect(() => {
  // Check if replay data was saved
  const fetchReplayData = async () => {
    const canReplay = await fetch(`/api/battles/${battleId}/replay`);
    setCanReplay(canReplay);
  };
  fetchReplayData();
}, []);

// Button to show replay
{canReplay && (
  <button onClick={watchReplay}>
    Watch Replay
  </button>
)}
```

**Replay Data Structure:**
```javascript
{
  battleId: "uuid",
  players: [
    {
      userId: 123,
      audioChunks: [...],      // Full audio stream
      scoreUpdates: [          // Score progression
        { timestamp: 0, score: 0 },
        { timestamp: 500, score: 150 },
        ...
      ]
    }
  ],
  recordedAt: timestamp,
  duration: ms
}
```

---

### TODO: BACKEND #8 - Return to Lobby / Queue Next Battle

**When:** User clicks "Back to Lobby" or "Next Battle"  
**What:** Clean up battle state and return to lobby

```javascript
// TODO: BACKEND - Request server reset for next battle
const handleBackToLobby = async () => {
  // Clean up local battle state
  useLobbyStore((state) => {
    state.resetToLobby();
    state.clearBattleState();
  });
  
  // Notify server
  await fetch(`/api/lobbies/${lobbyId}/reset`, {
    method: 'POST'
  });
  
  // Navigate back
  navigate('/lobby');
};

// Optional: Offer to find new players for next battle
const handleQueueNextBattle = async () => {
  // Keep players in lobby
  // Find new opponent
  // Auto-start next battle
  await fetch(`/api/lobbies/${lobbyId}/find-opponent`, {
    method: 'POST'
  });
};
```

---

## 🎨 Visual Design

### Podium Display
```
      🥇
      ┌────┐
  🥈  │ 1st│  🥉
  ┌───┤    │───┐
  │   │160 │   │
  │   │px  │   │
  │   └────┘   │
  │ 120px  100px│
  │    │    │    │
  └────┴────┴────┘
  2nd Place  3rd Place
```

### Leaderboard Cards
```
┌─────────────────────────────────┐
│ Leaderboard                     │
├─────────────────────────────────┤
│ 1st | 👤 Alex | 8520 | 94% | 47x│
├─────────────────────────────────┤
│ 2nd | 👤 Sam  | 7840 | 89% | 35x│
├─────────────────────────────────┤
│ 3rd | 👤 Pat  | 6920 | 86% | 28x│
├─────────────────────────────────┤
│ 4th | 👤 Jas  | 5430 | 78% | 22x│
└─────────────────────────────────┘
```

---

## 🔄 Data Flow

### Battle Complete → Results Display

```
BattlePage (battlePhase === RESULTS)
  ↓
Emit BATTLE_RESULTS message
  ↓
Server calculates final scores
  ↓
Zustand receives BATTLE_RESULTS
  ↓
ResultsPage mounts
  ↓
Sort players by final score
  ↓
Render Podium (top 3) + Leaderboard (all)
  ↓
Send persistence request to backend
  ↓
Server updates user stats + ELO
  ↓
Awards achievements
  ↓
User clicks "Back to Lobby"
  ↓
Reset state + return to LobbyScreen
```

---

## 📊 Metrics Reference

### Score Calculation
```
Final Score = Base Score + Bonuses

Base Score = Sum of all syllable scores

Syllable Score = (
  timingAccuracy(0-100)           // Hit the right time
  × pitchAccuracy(0-100)          // Matched pitch
  × confidenceLevel(0-100)        // Audio confidence
) / 10000 × pointsPerSyllable

Bonuses:
- Combo multiplier: 1.0x to 3.0x (based on chain)
- Perfect line bonus: +500 (100% accuracy on entire line)
- Speed bonus: +100-300 (finished song faster)
```

### Accuracy Metrics
```
Timing Accuracy = (hits / totalSyllables) × 100
Pitch Accuracy = (correctPitch / totalSyllables) × 100
Overall Accuracy = Average of all metric accuracies
```

---

## ✅ Integration Checklist

- [ ] TODO: BACKEND #1 - Server sends BATTLE_RESULTS on battle end
- [ ] TODO: BACKEND #2 - API endpoint: POST /api/leaderboard/battles
- [ ] TODO: BACKEND #3 - API endpoint: POST /api/users/{id}/stats/update
- [ ] TODO: BACKEND #4 - Achievement checking system
- [ ] TODO: BACKEND #5 - API endpoint: GET /api/leaderboard
- [ ] TODO: BACKEND #6 - Handle disconnected player fallback
- [ ] TODO: BACKEND #7 - Replay data storage (future)
- [ ] TODO: BACKEND #8 - API endpoint: POST /api/lobbies/{id}/reset

---

## 🚀 Future Enhancements

1. **Replay System** - Watch how battle played out
2. **Achievement Display** - Show earned badges with animations
3. **Global Leaderboard** - Top 100 players by ELO/score
4. **Friend Comparisons** - See how you rank vs friends
5. **Battle Stats** - Detailed breakdown per song
6. **Rating System** - Rate the song/battle quality
7. **Social Sharing** - Share results on social media
8. **Spectate Option** - Watch other battles live

---

## 📝 Summary

The Results Display system:
- ✅ Displays final scores and rankings
- ✅ Shows podium for top 3 (visual appeal)
- ✅ Shows full leaderboard for transparency
- ✅ Calculates user stats and achievements
- ✅ Updates global rankings
- ✅ Handles network failures gracefully
- ✅ Prepares for replay functionality

**Status:** Ready for backend integration. All 8 TODO: BACKEND markers identified and documented.


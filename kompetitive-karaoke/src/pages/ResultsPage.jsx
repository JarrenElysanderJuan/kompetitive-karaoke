import Podium from "../components/Podium";
import Leaderboard from "../components/Leaderboard";
import { useLobbyStore } from "../store/lobbyStore";
import { useEffect, useState } from "react";

/**
 * RESULTS PAGE - Battle Outcome Display
 *
 * ============================================================================
 * RESPONSIBILITY:
 * ============================================================================
 * Displays final battle results after all players finish singing.
 * Shows visual podium (top 3) and full leaderboard with metrics.
 * Coordinates with backend to persist results and update user stats.
 *
 * ============================================================================
 * CURRENT FLOW (MOCK):
 * ============================================================================
 * 1. BattlePage detects battle end (timeout)
 * 2. Navigates to ResultsPage
 * 3. Gets players from Zustand (already has scores from mock)
 * 4. Sorts by score
 * 5. Displays podium + leaderboard
 * 6. User clicks "Back to Lobby"
 * 7. Clear battle state, return to LobbyScreen
 *
 * ============================================================================
 * FUTURE FLOW (AFTER BACKEND):
 * ============================================================================
 * 1. Server sends BATTLE_RESULTS message with final scores
 * 2. Zustand updates battle state with authoritative scores
 * 3. ResultsPage mounts
 * 4. TODO: BACKEND #1 - Fetch final results (already in state)
 * 5. TODO: BACKEND #2 - Persist to leaderboard API
 * 6. TODO: BACKEND #3 - Update user stats (ELO, wins, etc.)
 * 7. TODO: BACKEND #4 - Award achievements/badges
 * 8. TODO: BACKEND #8 - Request reset for next battle
 *
 * ============================================================================
 * DATA STRUCTURE FROM SERVER:
 * ============================================================================
 * BATTLE_RESULTS message:
 * {
 *   type: 'BATTLE_RESULTS',
 *   battleId: 'uuid-123',
 *   players: [
 *     {
 *       id: 'player-1',
 *       name: 'Alex',
 *       finalScore: 8520,     // Final calculated score
 *       accuracy: 94.2,       // Timing accuracy %
 *       combo: 47,            // Highest combo reached
 *       perfectLines: 3,      // Lines with 100% accuracy
 *       achievements: [       // Badges earned this battle
 *         'ACCURACY_MASTER',
 *         'COMBO_KING'
 *       ]
 *     },
 *     ...
 *   ],
 *   mode: 'ranked' | 'casual',  // Battle mode
 *   endReason: 'timeout' | 'finish',
 *   endedAt: timestamp
 * }
 *
 * ============================================================================
 * STATE AUTHORITY:
 * ============================================================================
 * SERVER-OWNED (Read-only from client):
 * - finalScore (calculated from audio analysis)
 * - accuracy (timing vs pitch precision)
 * - achievements (server-determined rewards)
 *
 * SHARED (Via Zustand):
 * - players[] (from battle state)
 * - battleId (passed through context)
 *
 * CLIENT-ONLY:
 * - isLoading (for API calls)
 * - error (for error display)
 *
 * ============================================================================
 * RENDERING LOGIC:
 * ============================================================================
 * 1. Sort players by finalScore (descending)
 * 2. Top 3 → Podium component (visual ranking)
 * 3. All players → Leaderboard component (detailed stats)
 * 4. Show achievement badges (if earned)
 * 5. Show user's global rank (if available)
 *
 * ============================================================================
 * TODO: BACKEND INTEGRATION POINTS:
 * ============================================================================
 * #1 - Fetch BATTLE_RESULTS from server (already in Zustand)
 * #2 - Persist results to leaderboard (POST /api/leaderboard/battles)
 * #3 - Update user stats (POST /api/users/{id}/stats/update)
 * #4 - Award achievements (checks on server side)
 * #5 - Fetch global leaderboard (GET /api/leaderboard)
 * #6 - Handle disconnected players (display warning)
 * #7 - Offer battle replay (if replay data saved)
 * #8 - Reset for next battle (POST /api/lobbies/{id}/reset)
 *
 * ============================================================================
 */

export default function ResultsPage({ onBack }) {
  // =========================================================================
  // STATE
  // =========================================================================

  // Get players from Zustand - don't override with mock data
  const players = useLobbyStore((state) => state.lobby.players);
  const lobbyId = useLobbyStore((state) => state.lobby.roomId);
  const roomCode = useLobbyStore((state) => state.lobby.roomCode);

  // TODO: BACKEND #1 - Replace mock sort with server results
  // After server sends BATTLE_RESULTS, these will be authoritative
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [globalRank, setGlobalRank] = useState(null);

  // =========================================================================
  // PERSIST RESULTS & UPDATE STATS (On Mount)
  // =========================================================================

  useEffect(() => {
    // TODO: BACKEND #2 - Persist this battle to leaderboard database
    // POST /api/leaderboard/battles
    const persistResults = async () => {
      try {
        setIsLoading(true);
        // const response = await fetch('/api/leaderboard/battles', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     lobbyId: lobbyId,
        //     roomCode: roomCode,
        //     mode: 'ranked',
        //     players: sortedPlayers.map((p, idx) => ({
        //       userId: p.id,
        //       finalScore: p.score,
        //       accuracy: p.accuracy || 0,
        //       combo: p.combo || 0,
        //       position: idx + 1,
        //       achievements: p.achievements || []
        //     })),
        //     timestamp: Date.now()
        //   })
        // });
        // if (!response.ok) throw new Error('Failed to save results');
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // TODO: BACKEND #3 - Update user stats (ELO, wins, etc.)
    // POST /api/users/{userId}/stats/update
    const updateUserStats = async () => {
      try {
        // const currentUser = sortedPlayers[0]; // Winner
        // await fetch(`/api/users/${currentUser.id}/stats/update`, {
        //   method: 'POST',
        //   body: JSON.stringify({
        //     won: true,
        //     finalScore: currentUser.score,
        //     lobbyId: lobbyId
        //   })
        // });
      } catch (err) {
        console.error('Failed to update stats:', err);
      }
    };

    persistResults();
    updateUserStats();
  }, [lobbyId, sortedPlayers, roomCode]);

  // =========================================================================
  // FETCH GLOBAL RANK (On Mount)
  // =========================================================================

  useEffect(() => {
    // TODO: BACKEND #5 - Fetch current player's global rank
    // GET /api/leaderboard/user/{userId}
    const fetchGlobalRank = async () => {
      try {
        // const response = await fetch(`/api/leaderboard/user/${currentUser.id}`);
        // const data = await response.json();
        // setGlobalRank(data.rank);
      } catch (err) {
        console.error('Failed to fetch rank:', err);
      }
    };

    fetchGlobalRank();
  }, []);

  // =========================================================================
  // HANDLE BACK TO LOBBY
  // =========================================================================

  const handleBackToLobby = async () => {
    // TODO: BACKEND #8 - Request server reset for next battle
    // POST /api/lobbies/{lobbyId}/reset
    try {
      // await fetch(`/api/lobbies/${lobbyId}/reset`, {
      //   method: 'POST'
      // });

      // Reset Zustand state using getState()
      useLobbyStore.getState().resetToLobby();

      // Navigate back to lobby
      onBack();
    } catch (err) {
      setError('Failed to reset lobby. Refreshing...');
      window.location.reload();
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white overflow-auto">
      {/* Loading Spinner (Persisting Results) */}
      {isLoading && (
        <div className="mb-8">
          <div className="spinner"></div>
          <p className="text-gray-400 mt-2">Saving results...</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-8 bg-red-600 p-4 rounded">
          <p className="font-bold">Error: {error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Global Rank Display (Future) */}
      {globalRank && (
        <div className="mb-6 text-center">
          <p className="text-gray-400">Your Global Rank</p>
          <p className="text-3xl font-bold text-yellow-400">#{globalRank}</p>
        </div>
      )}

      {/* Podium: top 3 with medal animations */}
      <Podium players={sortedPlayers.slice(0, 3)} />

      {/* Full leaderboard with all metrics */}
      <Leaderboard players={sortedPlayers} />

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        {/* Back Button */}
        <button
          onClick={handleBackToLobby}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold transition"
        >
          Back to Lobby
        </button>

        {/* TODO: BACKEND #7 - Watch Replay (future) */}
        {/* <button
          onClick={watchReplay}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded font-bold transition"
        >
          Watch Replay
        </button> */}

        {/* TODO: BACKEND - Queue Next Battle (optional) */}
        {/* <button
          onClick={handleQueueNext}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded font-bold transition"
        >
          Next Battle
        </button> */}
      </div>

      {/* Achievement Badges (Future) */}
      {/* TODO: BACKEND #4 - Display achievements earned this battle */}
      {/* {sortedPlayers[0].achievements && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Achievements Earned</h3>
          <div className="flex flex-wrap gap-4">
            {sortedPlayers[0].achievements.map(ach => (
              <Badge key={ach} achievement={ach} />
            ))}
          </div>
        </div>
      )} */}
    </div>
  );
}
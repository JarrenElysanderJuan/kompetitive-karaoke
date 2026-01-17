import { useState, useEffect, useCallback } from "react";
import LyricsDisplay from "../components/LyricsDisplay";
import ScoreBoard from "../components/ScoreBoard";
import ScoreCardSidebar from "../components/ScoreCardSidebar";
import { useMockWebSocket } from "../hooks/UseMockWebSocket";
import { useAudioCapture } from "../hooks/useAudioCapture";
import { useLobbyStore, LOBBY_PHASES } from "../store/lobbyStore";

/**
 * BattlePage: Main battle view during IN_BATTLE phase
 * 
 * RESPONSIBILITIES:
 *   1. Coordinate audio capture (mic → chunks → server)
 *   2. Display lyrics synchronized with server's battleStartTime
 *   3. Receive and display score updates from server
 *   4. Handle battle end conditions
 * 
 * CURRENT FLOW (Mock):
 *   1. Component mounts → startCapture() → mic opens
 *   2. User sings → audio chunks generated
 *   3. onAudioChunk → handleAudioChunk (mock WebSocket)
 *   4. Mock scores players every 2 seconds (random)
 *   5. LyricsDisplay progresses every 4 seconds (fixed)
 *   6. After all lyrics: battle ends, navigate to ResultsPage
 *   7. stopCapture() on unmount → mic closes
 * 
 * FUTURE FLOW (With Backend):
 *   1. Component mounts → startCapture() → mic opens
 *   2. Phase is IN_BATTLE
 *   3. Audio chunks: onAudioChunk → WebSocket.send(AUDIO_CHUNK)
 *   4. Server flow:
 *      - Receives audio chunks (timestamp, audioData, userId)
 *      - Analyzes audio: extract syllables, pitch, timing
 *      - Correlates with expected lyrics at timestamp
 *      - Calculates: accuracy, combo, score
 *      - Broadcasts: PLAYER_SCORE_UPDATE to all clients
 *   5. Client receives PLAYER_SCORE_UPDATE:
 *      - Updates player score in store
 *      - ScoreCardSidebar re-renders with new scores
 *      - Real-time leaderboard updates
 *   6. Lyric progression:
 *      - Uses battleStartTime from server
 *      - currentLine = Math.floor((Date.now() - battleStartTime) / avgLineDuration)
 *      - All clients show same lyric at same time
 *   7. Battle ends when:
 *      - Last lyric displayed and duration exceeded, OR
 *      - Server sends FINISH_BATTLE message, OR
 *      - User presses "End Battle" button (manual end)
 *   8. Server sends BATTLE_RESULTS with final scores
 *   9. Navigate to ResultsPage
 *   10. stopCapture() on unmount
 * 
 * TIMING SYNCHRONIZATION:
 * 
 *   All 4 players start singing at exact same lyric:
 *   ┌─────────────────────────────────────────┐
 *   │ Server: battleStartTime = 1704067300000 │
 *   │ Broadcast to all 4 clients              │
 *   └─────────────────────────────────────────┘
 *             │ T=0ms
 *             ├─→ Client A: (Date.now() - 1704067300000) = ~0ms  → Line 0
 *             ├─→ Client B: (Date.now() - 1704067300000) = ~2ms  → Line 0 (≈same)
 *             ├─→ Client C: (Date.now() - 1704067300000) = ~1ms  → Line 0
 *             └─→ Client D: (Date.now() - 1704067300000) = ~3ms  → Line 0
 *   
 *   After 5 seconds:
 *   ┌──────────────────────────────────────────┐
 *   │ All 4 on same lyric (≤100ms variance)   │
 *   │ Audio submitted from same epoch         │
 *   │ Server can correlate 4 audio streams     │
 *   └──────────────────────────────────────────┘
 * 
 * SCORE UPDATE FLOW (Real-time):
 * 
 *   1. Client sends audio chunk with timestamp
 *      {
 *        type: AUDIO_CHUNK,
 *        payload: {
 *          timestamp: 1340,  // ms since battleStart
 *          audioData: Base64EncodedPCM,
 *          userId: "user-123"
 *        }
 *      }
 *   
 *   2. Server receives and analyzes
 *      - Determines which lyric was being sung
 *      - Extracts pitch, confidence, timing
 *      - Compares with expected lyric
 *      - Calculates: points = timing_accuracy × pitch_match × confidence
 *   
 *   3. Server broadcasts score update
 *      {
 *        type: PLAYER_SCORE_UPDATE,
 *        payload: {
 *          userId: "user-123",
 *          scoreIncrement: 250,  // Points for this chunk
 *          totalScore: 5000,
 *          combo: 12,
 *          accuracy: 95,  // 0-100%
 *          timestamp: serverTime
 *        }
 *      }
 *   
 *   4. All clients receive and update display
 *      - Store: players[index].score += scoreIncrement
 *      - ScoreCardSidebar: re-renders with new scores
 *      - Real-time leaderboard updates live
 * 
 * BATTLE END CONDITIONS:
 * 
 *   Condition 1: All lyrics shown
 *   - currentLine reaches lyrics.length - 1
 *   - After 4-second display time
 *   - Component calls onEnd()
 *   - Transition to ResultsPage
 * 
 *   Condition 2: Server timeout
 *   - If no audio received for 30+ seconds
 *   - Server sends: FINISH_BATTLE { reason: "timeout" }
 *   - Client calls onEnd()
 * 
 *   Condition 3: User manual end
 *   - Player clicks "End Battle" button
 *   - Sends: POST /api/lobbies/{id}/finish-battle
 *   - Server ends battle, calculates final scores
 * 
 *   Condition 4: Host ends battle
 *   - Host can end battle early
 *   - Server stops accepting audio
 *   - Sends BATTLE_RESULTS to all clients
 * 
 * TODO: BACKEND
 *   1. POST /api/lobbies/{roomId}/audio-chunk endpoint
 *      - Validates: roomId, userId, timestamp, audioData
 *      - Queues for audio analysis
 *      - Acknowledges receipt immediately
 * 
 *   2. Implement audio analysis pipeline
 *      - Extract syllables from audio
 *      - Match with expected lyrics
 *      - Calculate accuracy, combo, score
 *      - Broadcast PLAYER_SCORE_UPDATE every 100-200ms
 * 
 *   3. Implement battle timeout handling
 *      - Track last audio chunk per player
 *      - If > 30 seconds idle: send FINISH_BATTLE
 *      - Or: broadcast FINISH_BATTLE when all done
 * 
 *   4. Server-driven battle end
 *      - Song duration tracking
 *      - When exceeded: send FINISH_BATTLE
 *      - Broadcast BATTLE_RESULTS with final scores
 * 
 *   5. Real-time scoring broadcasts
 *      - Every 100-200ms: analyze recent chunks
 *      - Calculate incremental score
 *      - Broadcast PLAYER_SCORE_UPDATE to room
 *      - All clients see live leaderboard
 */

function BattlePage({ onEnd }) {
  // Initialize mock WebSocket
  const { handleAudioChunk } = useMockWebSocket();

  // Grab players and client info from the store
  const players = useLobbyStore((state) => state.lobby.players);
  const updateScore = useLobbyStore((state) => state.updateScore);
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const lobby = useLobbyStore((state) => state.lobby);

  // Audio capture callback - package chunks with metadata only during IN_BATTLE phase
  const onAudioChunk = useCallback(
    (chunk) => {
      // Only send audio chunks during the battle phase
      // Server will ignore/reject chunks from non-battle phases
      if (lobby.phase === LOBBY_PHASES.IN_BATTLE) {
        handleAudioChunk({
          ...chunk,
          userId: currentUserId,
          lobbyId: lobby.roomId,
          // TODO: BACKEND - Add battleStartTime so server can validate timestamps
          // battleStartTime: lobby.battleStartTime
        });
      }
    },
    [currentUserId, lobby.roomId, lobby.phase, handleAudioChunk]
  );

  // Initialize audio capture with proper error handling
  const { isCapturing, error: audioError, startCapture, stopCapture } =
    useAudioCapture(onAudioChunk, { 
      chunkDurationMs: 20,
      debugLogging: false  // Set to true for development
    });

  // Start audio capture when BattlePage mounts, stop on unmount
  useEffect(() => {
    startCapture();
    return () => {
      stopCapture();
    };
  }, []); // Empty dependency - only run once on mount/unmount

  // Only log audio capture errors, don't spam console with normal logs
  useEffect(() => {
    if (audioError) {
      console.error("🎤 Audio error:", audioError);
      // TODO: BACKEND - Show error UI, allow user to retry or continue without audio
    }
  }, [audioError]);

  // Lyrics for the battle
  const [currentLine, setCurrentLine] = useState(0);
  const [lyrics] = useState([
    "Twinkle, twinkle, little star",
    "How I wonder what you are",
    "Up above the world so high",
    "Like a diamond in the sky",
  ]);
  
  // TODO: BACKEND - Replace with actual song data from server
  // const song = useLobbyStore((state) => state.lobby.song);
  // const lyrics = song?.lyrics || [];
  // const lineDurations = song?.lineDurations || [];
  // const battleStartTime = lobby?.battleStartTime || Date.now();

  // Current player object
  const currentPlayer = players.find((p) => p.id === currentUserId) || {
    id: currentUserId,
    name: "Player",
    score: 0,
  };

  // Memoize setScore to avoid dependency issues in LyricsDisplay
  // TODO: BACKEND - This function shouldn't be used!
  // Scores come from server via PLAYER_SCORE_UPDATE messages
  const handleSetScore = useCallback((updater) => {
    const currentPlayer = players.find(p => p.id === currentUserId);
    if (!currentPlayer) return;
    const newScore = updater(currentPlayer.score);
    updateScore(currentUserId, newScore);
  }, [players, currentUserId, updateScore]);

  // Wrap onEnd to stop audio capture when battle ends
  const handleBattleEnd = useCallback((result) => {
    console.log("🎬 Battle ended, stopping audio capture");
    stopCapture();
    
    // TODO: BACKEND - Send finish-battle message to server
    // POST /api/lobbies/{roomId}/finish-battle { userId, finalScore }
    
    if (onEnd) {
      onEnd(result);
    }
  }, [onEnd, stopCapture]);

  return (
    <div className="w-screen h-screen bg-gray-900 flex items-center justify-center p-6 text-white">
      {/* Audio capture status indicator - always recording during battle */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isCapturing ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-sm text-gray-300">
          🎤 {isCapturing ? 'Recording' : 'Not Recording'}
        </span>
      </div>

      {/* Audio error display */}
      {audioError && (
        <div className="absolute top-4 right-4 bg-red-600 p-3 rounded">
          Microphone Error: {audioError}
        </div>
      )}

      <div className="flex w-full max-w-6xl gap-6">
        {/* Main lyrics & current player score */}
        <div className="flex-1 flex flex-col items-center">
          <LyricsDisplay
            lyrics={lyrics}
            currentLine={currentLine}
            setCurrentLine={setCurrentLine}
            setScore={handleSetScore}
            onEnd={handleBattleEnd}
          />
          <ScoreBoard
            currentLine={currentLine}
            totalLines={lyrics.length}
            score={currentPlayer.score}
          />
        </div>

        {/* Sidebar showing all player scores */}
        <ScoreCardSidebar />
      </div>
    </div>
  );
}

export default BattlePage;

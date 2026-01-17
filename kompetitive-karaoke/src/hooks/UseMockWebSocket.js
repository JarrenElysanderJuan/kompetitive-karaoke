/**
 * Mock WebSocket Implementation
 * 
 * Simulates server-side message handling during development/testing.
 * This hook is a placeholder that will be replaced with real WebSocket when backend ready.
 * 
 * CURRENT BEHAVIOR (Mock):
 *   - Simulates audio chunk transmission (logs only, no analysis)
 *   - Randomly increments other players' scores
 *   - No real audio analysis
 *   - No persistence
 * 
 * FUTURE BEHAVIOR (Real WebSocket):
 *   - Send audio chunks to real server
 *   - Listen for PLAYER_SCORE_UPDATE messages (from server analysis)
 *   - Handle PHASE_CHANGE messages
 *   - Handle BATTLE_RESULTS messages
 *   - Implement reconnection logic
 * 
 * MESSAGE TYPES (see src/constants/wsMessages.js):
 *   
 *   CLIENT SENDS:
 *     - AUDIO_CHUNK: every 20ms with audio data
 *     - SCORE_UPDATE: player's current score (may be deprecated)
 *     - FINISH_BATTLE: when lyrics end
 *   
 *   CLIENT RECEIVES (via mock or real WebSocket):
 *     - PLAYER_SCORE_UPDATE: server analyzed audio, sent new score
 *     - PHASE_CHANGE: phase transitioned (LOBBY → IN_BATTLE → RESULTS)
 *     - BATTLE_RESULTS: battle ended, final results
 *     - ERROR: validation or server error
 * 
 * INTEGRATION SEAM:
 *   Replace handleAudioChunk(), startMockSimulation() with real WebSocket implementation
 *   Keep component interface (props, store updates) the same
 *   
 * TODO: BACKEND
 *   - Swap mock for real WebSocket client
 *   - Implement proper message parsing
 *   - Add error handling for disconnection
 *   - Implement reconnection with exponential backoff
 *   - Validate incoming messages against wsMessages contract
 */

import { useEffect } from "react";
import { useLobbyStore } from "../store/lobbyStore";
import { MESSAGE_TYPES } from "../constants/wsMessages";

/*
 * Mock WebSocket hook
 * Simulates server updates during battle (score updates, etc.)
 * Also queues audio chunks for "transmission"
 */
export function useMockWebSocket() {
  const lobby = useLobbyStore((state) => state.lobby);
  const updateScore = useLobbyStore((state) => state.updateScore);
  const setReady = useLobbyStore((state) => state.setReady);

  // Handle incoming audio chunks
  const handleAudioChunk = (chunk) => {
    // TODO: BACKEND - Replace with real WebSocket send
    // Mock behavior: log the chunk
    console.log("📤 Audio chunk queued for transmission:", {
      timestamp: chunk.timestamp,
      audioDataLength: chunk.audioData.length,
      sampleRate: 44100,
    });

    // Real implementation would be:
    // const wsMessage = {
    //   type: MESSAGE_TYPES.AUDIO_CHUNK,
    //   payload: {
    //     timestamp: chunk.timestamp,
    //     audioData: btoa(chunk.audioData)  // base64 encode
    //   }
    // };
    // ws.send(JSON.stringify(wsMessage));
    
    // Server would then:
    // 1. Receive AUDIO_CHUNK message
    // 2. Validate timestamp is in current window
    // 3. Analyze audio for syllables, pitch, timing
    // 4. Calculate score increment
    // 5. Broadcast PLAYER_SCORE_UPDATE to all players
  };

  // Simulate other players scoring
  useEffect(() => {
    if (lobby.phase !== "IN_BATTLE") return;

    // TODO: BACKEND - Remove this simulation, listen for real PLAYER_SCORE_UPDATE messages
    // const onPlayerScoreUpdate = (message) => {
    //   if (message.type === MESSAGE_TYPES.PLAYER_SCORE_UPDATE) {
    //     updateScore(
    //       message.payload.playerId,
    //       message.payload.score,
    //       message.payload.combo,
    //       message.payload.accuracy
    //     );
    //   }
    // };
    // ws.addEventListener('message', (event) => {
    //   const message = JSON.parse(event.data);
    //   onPlayerScoreUpdate(message);
    // });

    const interval = setInterval(() => {
      // Randomly simulate other players scoring
      lobby.players.forEach((p) => {
        if (!p.ready) return; // skip unready
        const increment = Math.floor(Math.random() * 50);
        updateScore(p.id, p.score + increment);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [lobby.phase, updateScore]);

  return {
    handleAudioChunk,
  };
}

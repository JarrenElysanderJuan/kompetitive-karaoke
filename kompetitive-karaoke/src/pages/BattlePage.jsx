import { useState, useEffect, useCallback, useRef } from "react";
import { float32ToBase64 } from "../utils/audioUtils";
import LyricsDisplay from "../components/LyricsDisplay";
import ScoreBoard from "../components/ScoreBoard";
import ScoreCardSidebar from "../components/ScoreCardSidebar";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAudioCapture } from "../hooks/useAudioCapture";
import { useLobbyStore, LOBBY_PHASES } from "../store/lobbyStore";

/**
 * BattlePage: Main battle view during LOADING and IN_BATTLE phases
 * 
 * Flow:
 * 1. LOADING: Fetches MP3, buffers it, sends PLAYER_LOADED.
 * 2. WAITING: Shows "Ready! Waiting for others..." after loading.
 * 3. COUNTDOWN: Server sends IN_BATTLE + battleStartTime, shows countdown.
 * 4. SINGING: Precise playback start at battleStartTime.
 */

function BattlePage({ onEnd }) {
  const { send, isConnected } = useWebSocket();
  const lobby = useLobbyStore((state) => state.lobby);
  const players = lobby.players;
  const currentUserId = useLobbyStore((state) => state.currentUserId);
  const song = lobby.song;

  // Local state for loading/sync
  const [isLoaded, setIsLoaded] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const audioRef = useRef(null);
  const hasStartedPlayback = useRef(false);

  // Audio capture callback
  const onAudioChunk = useCallback(
    (chunk) => {
      if (lobby.phase !== LOBBY_PHASES.IN_BATTLE || !isConnected) return;

      const audio = audioRef.current;
      let relativeTimestamp = 0;

      // Use actual audio time if available, fallback to wall clock sync
      if (audio && audio.currentTime > 0) {
        relativeTimestamp = audio.currentTime * 1000;
      } else {
        const battleStartTime = lobby.battleStartTime || Date.now();
        relativeTimestamp = Date.now() - battleStartTime;
      }

      if (relativeTimestamp < 0) return; // Don't send chunks during countdown

      send({
        type: 'AUDIO_CHUNK',
        roomId: lobby.roomId,
        userId: currentUserId,
        timestamp: relativeTimestamp,
        audioData: float32ToBase64(chunk.audioData),
        sampleRate: 44100,
        channelCount: 1,
      });
    },
    [currentUserId, lobby.roomId, lobby.phase, lobby.battleStartTime, isConnected, send]
  );

  const { isCapturing, error: audioError, startCapture, stopCapture } =
    useAudioCapture(onAudioChunk, {
      chunkDurationMs: 100,
      debugLogging: false
    });

  // 1. PRE-LOADING PHASE
  useEffect(() => {
    if (!song?.mp3 || isLoaded) return;

    console.log(`[Loading] Pre-loading audio: ${song.mp3}`);
    const audio = new Audio(`http://localhost:3000/songs/${song.mp3}`);
    audio.preload = "auto";

    const handleCanPlayThrough = () => {
      console.log(`[Loading] Audio buffered and ready.`);
      setIsLoaded(true);
      send({
        type: 'PLAYER_LOADED',
        roomId: lobby.roomId,
        userId: currentUserId
      });
    };

    const handleLoadError = (e) => {
      console.error(`[Loading] Audio load failed for ${song.mp3}:`, e);
      setIsLoaded(true);
      send({
        type: 'PLAYER_LOADED',
        roomId: lobby.roomId,
        userId: currentUserId
      });
    };

    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleLoadError);
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleLoadError);

      // Only clear if the component is actually unmounting or song changes
      if (audioRef.current !== audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [song?.mp3, lobby.roomId, currentUserId, send, isLoaded]);

  // 2. COUNTDOWN & START SYNC
  useEffect(() => {
    if (lobby.phase === LOBBY_PHASES.IN_BATTLE && lobby.battleStartTime && isLoaded) {
      const timer = setInterval(() => {
        const now = Date.now();
        const diff = lobby.battleStartTime - now;

        if (diff <= 0) {
          clearInterval(timer);
          setCountdown(null);

          if (!hasStartedPlayback.current && audioRef.current) {
            console.log("[Battle] SYNC START!");
            audioRef.current.play().catch(e => console.error("Playback failed:", e));
            startCapture();
            hasStartedPlayback.current = true;
          }
        } else {
          setCountdown(Math.ceil(diff / 1000));
        }
      }, 50);

      return () => clearInterval(timer);
    }
  }, [lobby.phase, lobby.battleStartTime, isLoaded, startCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [stopCapture]);

  const currentPlayer = players.find((p) => p.id === currentUserId) || {
    id: currentUserId,
    name: "Player",
    score: 0,
  };

  const handleBattleEnd = useCallback((result) => {
    console.log("🎬 Battle ended, stopping audio capture");
    stopCapture();
    if (onEnd) onEnd(result);
  }, [onEnd, stopCapture]);

  if (lobby.phase === LOBBY_PHASES.LOADING || !isLoaded) {
    return (
      <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="text-4xl font-bold mb-4 animate-pulse">
          {isLoaded ? "Ready! Waiting for others..." : "Loading Song Assets..."}
        </div>
        {!isLoaded && (
          <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-loading-bar"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-900 flex items-center justify-center p-6 text-white relative">
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-9xl font-black animate-ping">
            {countdown}
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isCapturing ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-sm text-gray-300">
          🎤 {isCapturing ? 'Recording' : 'Standby'}
        </span>
      </div>

      <div className="flex w-full max-w-6xl gap-6">
        <div className="flex-1 flex flex-col items-center">
          <LyricsDisplay
            lyrics={song?.lyrics || []}
            lineTimings={song?.lineTimings || []}
            battleStartTime={lobby.battleStartTime}
            audioRef={audioRef}
            onEnd={handleBattleEnd}
          />
          <ScoreBoard score={currentPlayer.score} />
        </div>
        <ScoreCardSidebar />
      </div>
    </div>
  );
}

export default BattlePage;

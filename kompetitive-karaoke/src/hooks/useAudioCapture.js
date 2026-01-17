import { useEffect, useRef, useCallback, useState } from "react";
import { AudioChunker } from "../utils/audioChunker";

/**
 * Hook for live microphone audio capture and chunking
 * 
 * Usage:
 * const { isCapturing, error, startCapture, stopCapture } = useAudioCapture(onChunk);
 * 
 * @param {Function} onChunk - Callback when a complete audio chunk is ready
 *                             Signature: (chunk) => void
 *                             chunk = { timestamp, audioData, userId, lobbyId }
 * @param {Object} options - Configuration
 *   - chunkDurationMs: milliseconds per chunk (default 20ms)
 * @returns {Object} - { isCapturing, error, startCapture, stopCapture }
 */
export function useAudioCapture(onChunk, options = {}) {
  const { chunkDurationMs = 20 } = options;

  // State for UI updates
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);

  // Refs to maintain state across renders
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const processorRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunkerRef = useRef(null);
  const captureStartTimeRef = useRef(null);
  const isCapturingRef = useRef(false);

  // Update capturing state
  const updateCapturingState = useCallback((capturing) => {
    isCapturingRef.current = capturing;
    setIsCapturing(capturing);
  }, []);

  /**
   * Start audio capture from microphone
   */
  const startCapture = useCallback(async () => {
    try {
      setError(null);
      // Request microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      mediaStreamRef.current = mediaStream;

      // Create audio context
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Initialize chunker
      const chunker = new AudioChunker(chunkDurationMs);
      chunker.sampleRate = audioContext.sampleRate;
      chunkerRef.current = chunker;

      // Create source and analyser
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      // Use periodic polling instead of deprecated ScriptProcessorNode
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      captureStartTimeRef.current = Date.now();
      const pollInterval = setInterval(() => {
        if (!isCapturingRef.current) {
          clearInterval(pollInterval);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        
        // Convert to Float32 for processing
        const samples = new Float32Array(dataArray.length);
        for (let i = 0; i < dataArray.length; i++) {
          samples[i] = (dataArray[i] - 128) / 128;
        }

        // Process samples into chunks
        for (const chunk of chunker.processFrames(
          samples,
          Date.now() - captureStartTimeRef.current
        )) {
          if (onChunk) {
            onChunk(chunk);
          }
        }
      }, chunkDurationMs);

      processorRef.current = pollInterval; // Store interval ID for cleanup

      updateCapturingState(true);
    } catch (err) {
      const message =
        err.name === "NotAllowedError"
          ? "Microphone access denied"
          : err.message;
      setError(message);
      console.error("Audio capture error:", err);
      updateCapturingState(false);
    }
  }, [chunkDurationMs, onChunk, updateCapturingState]);

  /**
   * Stop audio capture and clean up resources
   */
  const stopCapture = useCallback(() => {
    updateCapturingState(false);

    // Stop the polling interval
    if (processorRef.current && typeof processorRef.current === 'number') {
      clearInterval(processorRef.current);
      processorRef.current = null;
    }

    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // Clean up analyser
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [updateCapturingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCapturingRef.current) {
        stopCapture();
      }
    };
  }, [stopCapture]);

  return {
    isCapturing,
    error,
    startCapture,
    stopCapture,
  };
}

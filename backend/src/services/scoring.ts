/**
 * SCORING ENGINE
 * 
 * Deterministic score calculation from audio chunks.
 * All clients receive same score for same audio (server-driven).
 */

import type { Lobby } from '../types/state.js';

/**
 * Deterministic scoring algorithm
 * 
 * MUST BE DETERMINISTIC:
 * - Same audio chunks → Same score every time
 * - No randomness (except where explicitly randomized)
 * - All 4 clients get identical updates
 * 
 * STRATEGY:
 * - Parse Base64 audio data
 * - Simulate frequency analysis (mock for now)
 * - Calculate score based on frequency patterns
 * - Return score, accuracy, combo
 */

interface FrequencyAnalysis {
  dominantFrequency: number;
  energyLevel: number;
  noiseFloor: number;
}

/**
 * Parse Base64 audio data and perform basic frequency analysis
 * 
 * NOTE: This is a mock implementation. Real implementation would:
 * - Decode Base64 to Float32Array
 * - Run FFT to get frequency spectrum
 * - Detect syllable onsets
 * - Extract pitch (fundamental frequency)
 * - Compare against expected lyric pitch
 */
function analyzeAudioChunk(audioData: string, _referenceFrequency: number): FrequencyAnalysis {
  // Deterministic hash of audio data (ensures same audio → same analysis)
  let hash = 0;
  for (let i = 0; i < audioData.length; i++) {
    const char = audioData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate deterministic but varied results from hash
  const absHash = Math.abs(hash);
  const dominantFrequency = 200 + (absHash % 800); // 200-1000 Hz range
  const energyLevel = (absHash % 10000) / 10000; // 0-1
  const noiseFloor = ((absHash >> 10) % 10000) / 10000; // 0-1

  return {
    dominantFrequency,
    energyLevel,
    noiseFloor,
  };
}

/**
 * Calculate timing accuracy
 * 
 * Perfect timing: timestamp aligns with expected lyric timing
 * Window: ±200ms around expected timing
 */
function calculateTimingAccuracy(timestamp: number, expectedLineStart: number, lineDuration: number): number {
  const lineEnd = expectedLineStart + lineDuration;
  const windowStart = expectedLineStart - 200;
  const windowEnd = lineEnd + 200;

  // Outside window: 0% accuracy
  if (timestamp < windowStart || timestamp > windowEnd) {
    return 0;
  }

  // Inside window: calculate how close to center
  const lineCenter = expectedLineStart + lineDuration / 2;
  const distanceFromCenter = Math.abs(timestamp - lineCenter);
  const maxDistance = lineDuration / 2 + 200;

  return Math.max(0, (1 - distanceFromCenter / maxDistance) * 100);
}

/**
 * Calculate pitch accuracy
 * 
 * Compare detected frequency against reference frequency
 * Tolerance: ±1 semitone (5.6% frequency variation)
 */
function calculatePitchAccuracy(detectedFreq: number, referenceFreq: number): number {
  if (referenceFreq === 0) return 0;

  const ratio = detectedFreq / referenceFreq;
  const semitones = 12 * Math.log2(ratio);

  // ±1 semitone tolerance
  if (Math.abs(semitones) <= 1) {
    return 100 - Math.abs(semitones) * 50; // 50-100%
  }

  // ±2 semitones: reduced accuracy
  if (Math.abs(semitones) <= 2) {
    return 50 - Math.abs(semitones - 1) * 25; // 0-50%
  }

  return 0;
}

/**
 * Calculate confidence from audio energy and noise floor
 */
function calculateConfidence(energyLevel: number, noiseFloor: number): number {
  const snr = energyLevel / (noiseFloor + 0.01); // SNR (signal-to-noise ratio)
  
  // If SNR > 3: high confidence
  if (snr > 3) return 100;
  
  // If SNR > 1: medium confidence
  if (snr > 1) return snr * 30;
  
  // Low SNR: low confidence
  return Math.max(10, snr * 30);
}

/**
 * Calculate score for a batch of audio chunks (100-200ms window)
 * 
 * Returns: { score: number, accuracy: number, combo: number }
 */
export function calculateBatchScore(
  audioChunks: Array<{ timestamp: number; audioData: string }>,
  currentLineIndex: number,
  lineDurations: number[],
  song: { lyrics: string[] }
): { score: number; accuracy: number; combo: number } {
  if (audioChunks.length === 0) {
    return { score: 0, accuracy: 0, combo: 0 };
  }

  // Expected timing for current line
  let expectedLineStart = 0;
  for (let i = 0; i < currentLineIndex; i++) {
    expectedLineStart += lineDurations[i] || 0;
  }
  const lineDuration = lineDurations[currentLineIndex] || 4000;

  // Analyze all chunks in batch
  let totalTimingAccuracy = 0;
  let totalPitchAccuracy = 0;
  let totalConfidence = 0;
  let validChunks = 0;

  for (const chunk of audioChunks) {
    // Simple reference frequency (simulate lyric pitch)
    // Real implementation: extract from expected lyric
    const referenceFrequency = 300 + currentLineIndex * 20; // Varies per line

    const analysis = analyzeAudioChunk(chunk.audioData, referenceFrequency);
    const timingAccuracy = calculateTimingAccuracy(chunk.timestamp, expectedLineStart, lineDuration);
    const pitchAccuracy = calculatePitchAccuracy(analysis.dominantFrequency, referenceFrequency);
    const confidence = calculateConfidence(analysis.energyLevel, analysis.noiseFloor);

    totalTimingAccuracy += timingAccuracy;
    totalPitchAccuracy += pitchAccuracy;
    totalConfidence += confidence;
    validChunks++;
  }

  if (validChunks === 0) {
    return { score: 0, accuracy: 0, combo: 0 };
  }

  // Average metrics
  const avgTimingAccuracy = totalTimingAccuracy / validChunks;
  const avgPitchAccuracy = totalPitchAccuracy / validChunks;
  const avgConfidence = totalConfidence / validChunks;

  // Calculate score
  // Base points per syllable (assume ~3-4 syllables per line)
  const basePointsPerSyllable = 50;
  const syllablesInLine = Math.ceil(song.lyrics[currentLineIndex]?.length / 5) || 3;

  const baseScore = (avgTimingAccuracy * avgPitchAccuracy * avgConfidence / 10000) * basePointsPerSyllable * syllablesInLine;

  // Combo: assume +1 for each valid chunk (will be calculated per-player based on hits)
  const combo = validChunks;

  // Overall accuracy (0-100)
  const accuracy = (avgTimingAccuracy + avgPitchAccuracy) / 2;

  return {
    score: Math.round(baseScore),
    accuracy: Math.round(accuracy),
    combo,
  };
}

/**
 * Process all audio chunks in a lobby battle and update scores
 * Called periodically (every 100-200ms) during battle
 * 
 * TODO: PRODUCTION - Optimize chunk processing for large batches
 */
export function updateBattleScores(lobby: Lobby): Map<string, { score: number; accuracy: number; combo: number }> {
  const updates = new Map<string, { score: number; accuracy: number; combo: number }>();

  if (!lobby.battle.song || !lobby.battle.battleStartTime) {
    return updates;
  }

  const elapsedMs = Date.now() - lobby.battle.battleStartTime;
  let currentLineIndex = 0;
  let timeAccumulated = 0;

  // Find current line based on elapsed time
  for (let i = 0; i < lobby.battle.song.lineDurations.length; i++) {
    timeAccumulated += lobby.battle.song.lineDurations[i];
    if (timeAccumulated > elapsedMs) {
      currentLineIndex = i;
      break;
    }
  }

  // Process chunks for each player
  for (const [userId, buffer] of lobby.battle.currentAudioChunks) {
    if (buffer.chunks.length === 0) continue;

    const scoreUpdate = calculateBatchScore(
      buffer.chunks,
      currentLineIndex,
      lobby.battle.song.lineDurations,
      lobby.battle.song
    );

    updates.set(userId, scoreUpdate);

    // Mark as calculated (don't re-process)
    buffer.scoreCalculated = true;
    buffer.chunks = []; // Clear for next batch
  }

  return updates;
}

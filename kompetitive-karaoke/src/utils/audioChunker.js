/**
 * Audio chunking utility
 * Converts a stream of audio samples into fixed-size chunks with metadata
 */

export class AudioChunker {
  constructor(chunkDurationMs = 20) {
    this.chunkDurationMs = chunkDurationMs;
    this.sampleRate = 44100; // will be set when stream starts
  }

  /**
   * Calculate chunk size based on sample rate and duration
   */
  getChunkSize() {
    return Math.ceil((this.sampleRate * this.chunkDurationMs) / 1000);
  }

  /**
   * Buffer samples and yield complete chunks
   * @param {Float32Array} samples - Raw audio samples (PCM)
   * @returns {Generator<{timestamp: number, audioData: Float32Array}>}
   */
  *processFrames(samples, startTimestampMs = 0) {
    const chunkSize = this.getChunkSize();
    let buffer = new Float32Array(chunkSize);
    let bufferIndex = 0;
    let chunkIndex = 0;

    for (let i = 0; i < samples.length; i++) {
      buffer[bufferIndex++] = samples[i];

      if (bufferIndex === chunkSize) {
        const timestamp = startTimestampMs + (chunkIndex * this.chunkDurationMs);
        yield {
          timestamp,
          audioData: new Float32Array(buffer),
        };

        buffer = new Float32Array(chunkSize);
        bufferIndex = 0;
        chunkIndex++;
      }
    }
  }
}

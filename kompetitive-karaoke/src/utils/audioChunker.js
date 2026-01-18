/**
 * Audio chunking utility
 * Converts a stream of audio samples into fixed-size chunks with metadata
 */

export class AudioChunker {
  constructor(chunkDurationMs = 20) {
    this.chunkDurationMs = chunkDurationMs;
    this.sampleRate = 44100;
    this.buffer = null;
    this.bufferIndex = 0;
    this.chunkIndex = 0;
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
   * @param {number} currentTimestampMs - Current absolute audio time (optional)
   * @returns {Generator<{timestamp: number, audioData: Float32Array}>}
   */
  *processFrames(samples, currentTimestampMs = 0) {
    const chunkSize = this.getChunkSize();

    // Initialize buffer if needed
    if (!this.buffer || this.buffer.length !== chunkSize) {
      this.buffer = new Float32Array(chunkSize);
      this.bufferIndex = 0;
    }

    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.bufferIndex++] = samples[i];

      if (this.bufferIndex === chunkSize) {
        // Calculate timestamp for this chunk
        // If we are continuous, we can use chunkIndex * duration
        // Or use the context time passed in?
        // Let's stick to accumulating duration

        yield {
          timestamp: this.chunkIndex * this.chunkDurationMs, // logical time
          audioData: new Float32Array(this.buffer), // copy
        };

        // Reset buffer
        this.buffer = new Float32Array(chunkSize);
        this.bufferIndex = 0;
        this.chunkIndex++;
      }
    }
  }
}

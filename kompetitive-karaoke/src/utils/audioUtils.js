
/**
 * Convert Float32Array to Base64 string
 * Used for sending raw audio PCM data over JSON WebSockets
 */
export function float32ToBase64(float32Array) {
    // Get raw bytes
    const uint8Array = new Uint8Array(float32Array.buffer);

    // Convert to binary string
    // Use a chunked approach to avoid stack overflow with large arrays
    let binary = '';
    const len = uint8Array.byteLength;
    const CHUNK_SIZE = 0x8000; // 32k chunks

    for (let i = 0; i < len; i += CHUNK_SIZE) {
        const chunk = uint8Array.subarray(i, Math.min(i + CHUNK_SIZE, len));
        binary += String.fromCharCode.apply(null, chunk);
    }

    // Convert to Base64
    return window.btoa(binary);
}

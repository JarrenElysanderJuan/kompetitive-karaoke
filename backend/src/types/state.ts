/**
 * GAME STATE TYPES
 * 
 * Backend representations of lobbies, players, and battles.
 * These are the server-authoritative versions.
 */

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  combo: number;
  accuracy: number;
  connected: boolean;
  isHost: boolean;
  isLoaded: boolean; // Has pre-loaded the audio
  lastAudioChunkTimestamp?: number; // for timeout detection
}

export interface Song {
  id: string;
  name: string;
  lyrics: string[];
  lineDurations: number[]; // time each line displays (ms)
  lineTimings: number[]; // cumulative timestamps
  duration: number; // total song duration (ms)
  notes: Array<{
    pitch: number;      // Frequency in Hz
    start: number;      // Start time (ms)
    duration: number;   // Duration (ms)
    lyric: string;      // Syllable text
  }>;
  mp3?: string;       // filename relative to songs/ dir
  cover?: string;     // filename relative to songs/ dir
}

export interface BattleState {
  phase: 'LOBBY' | 'LOADING' | 'IN_BATTLE' | 'RESULTS';
  battleStartTime: number | null; // unix ms when battle started
  song: Song | null;
  currentAudioChunks: Map<string, AudioChunkBuffer>; // playerId → chunks
}

export interface AudioChunkBuffer {
  chunks: Array<{
    timestamp: number; // relative to battleStartTime
    audioData: string; // Base64
  }>;
  scoreCalculated: boolean; // whether we've calculated score for latest batch
}

export interface Lobby {
  id: string;
  code: string; // 6-char room code
  name: string;
  hostId: string;
  maxPlayers: number;
  players: Map<string, Player>; // userId → Player
  createdAt: number; // unix ms
  battle: BattleState;
}

export interface GameState {
  lobbies: Map<string, Lobby>; // roomId → Lobby
  userLobbies: Map<string, string>; // userId → roomId (for quick lookup)
}

export const mockLobby = {
  roomId: "abc123",
  roomName: "Rock Stars",
  hostId: "p1",
  phase: "LOBBY", // can be LOBBY, BATTLE, RESULTS
  song: {
    songId: "song1",
    title: "Twinkle Twinkle",
    artist: "Traditional",
    lyrics: [
      "Twinkle, twinkle, little star",
      "How I wonder what you are",
      "Up above the world so high",
      "Like a diamond in the sky",
    ],
    duration: 16, // seconds
    bpm: 60,
  },
  players: [
    { id: "p1", name: "Alice", ready: true, score: 0 },
    { id: "p2", name: "Bob", ready: true, score: 0 },
    { id: "p3", name: "Charlie", ready: true, score: 0 },
    { id: "p4", name: "Dana", ready: true, score: 0 },
  ],
};

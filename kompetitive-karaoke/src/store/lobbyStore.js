// store/lobbyStore.js
import { create } from "zustand";

export const useLobbyStore = create((set, get) => ({
  // --- Lobby & Players ---
  lobby: {
    roomId: null,
    roomCode: null,
    name: null,
    maxPlayers: 4,
    phase: "LOBBY", // "LOBBY" | "IN_BATTLE" | "RESULTS"
    song: null,     // { songId, title, fileUrl, durationMs, difficulty }
    players: [],    // { id, name, ready, score }
  },
  
  setLobby: (lobby) => set({ lobby }),

    // Client-only: current user info stored separately
    currentUserId: null,
    currentUserName: null,
    setCurrentUserId: (id) => set({ currentUserId: id }),
    setCurrentUserName: (name) => set({ currentUserName: name }),


  addPlayer: (player) =>
    set((state) => ({
      lobby: { ...state.lobby, players: [...state.lobby.players, player] },
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      lobby: {
        ...state.lobby,
        players: state.lobby.players.filter((p) => p.id !== playerId),
      },
    })),

  setReady: (playerId, ready) =>
    set((state) => ({
      lobby: {
        ...state.lobby,
        players: state.lobby.players.map((p) =>
          p.id === playerId ? { ...p, ready } : p
        ),
      },
    })),

  setSong: (song) =>
    set((state) => ({
      lobby: { ...state.lobby, song },
    })),

  startBattle: () =>
    set((state) => ({ lobby: { ...state.lobby, phase: "IN_BATTLE" } })),

  endBattle: () =>
    set((state) => ({ lobby: { ...state.lobby, phase: "RESULTS" } })),

  updateScore: (playerId, score) =>
    set((state) => ({
      lobby: {
        ...state.lobby,
        players: state.lobby.players.map((p) =>
          p.id === playerId ? { ...p, score } : p
        ),
      },
    })),

  // --- Results ---
  setResults: (results) =>
    set((state) => ({
      lobby: { ...state.lobby, players: results },
    })),
}));

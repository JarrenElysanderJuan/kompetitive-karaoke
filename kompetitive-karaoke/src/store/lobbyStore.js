
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

  // --- Lobby Management ---
  createLobby: (roomName, maxPlayers = 4) =>
    set(() => {
      const id = Math.random().toString(36).substring(2, 8).toUpperCase();
      const state = get();
      return {
        lobby: {
          roomId: id,
          roomCode: id,
          name: roomName,
          maxPlayers,
          phase: "LOBBY",
          song: null,
          players: [
            {
              id: state.currentUserId,
              name: state.currentUserName,
              ready: false,
              score: 0,
              combo: 0,
              accuracy: 0,
              finished: false,
              isHost: true,
              socketId: null,
              connected: true,
            },
          ],
          hostId: state.currentUserId,
        },
      };
    }),

  joinLobby: (mockLobby) =>
    set(() => {
      const state = get();
      // Check if player already in lobby
      if (!mockLobby.players.find((p) => p.id === state.currentUserId)) {
        mockLobby.players.push({
          id: state.currentUserId,
          name: state.currentUserName,
          ready: false,
          score: 0,
          combo: 0,
          accuracy: 0,
          finished: false,
          isHost: false,
          socketId: null,
          connected: true,
        });
      }

      return { lobby: mockLobby };
    }),
}));

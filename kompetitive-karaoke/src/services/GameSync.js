/**
 * Game Synchronization Service
 * 
 * Acts as the bridge between WebSocketService and Zustand Store.
 * Listens to all WebSocket events and dispatches corresponding Store actions.
 * Ensures events are processed EXACTLY ONCE per application instance.
 */

import { getWebSocketService } from './WebSocketService';
import { useLobbyStore, LOBBY_PHASES } from '../store/lobbyStore';

let isInitialized = false;

export function initializeGameSync() {
    if (isInitialized) return () => { };
    isInitialized = true;

    const service = getWebSocketService();
    // Access store getState/setState via vanilla Zustand API if needed, 
    // or use the hooks inside components. 
    // For this service, we'll use the store's vanilla API (getState/setState/actions)
    // Note: useLobbyStore is a hook, but useLobbyStore.getState() gives access outside components.

    const store = useLobbyStore.getState();

    console.log('[GameSync] Initializing synchronization layer...');

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handleLobbySnapshot = (message) => {
        console.log('[GameSync] LOBBY_SNAPSHOT:', message);
        useLobbyStore.getState().setLobby({
            roomId: message.roomId,
            roomCode: message.roomCode,
            name: message.roomName,
            maxPlayers: message.maxPlayers,
            phase: message.phase,
            hostId: message.hostId,
            players: message.players || [],
            song: message.song || null,
            availableSongs: message.availableSongs || [],
            battleStartTime: message.battleStartTime || null,
        });
    };

    const handlePlayerJoined = (message) => {
        console.log('[GameSync] PLAYER_JOINED:', message);
        useLobbyStore.getState().addPlayer(message.player);
    };

    const handlePlayerLeft = (message) => {
        console.log('[GameSync] PLAYER_LEFT:', message);
        useLobbyStore.getState().removePlayer(message.playerId);
    };

    const handlePlayerReadyUpdate = (message) => {
        console.log('[GameSync] PLAYER_READY_UPDATE:', message);
        useLobbyStore.getState().setReady(message.playerId, message.isReady);
    };

    const handlePhaseChange = (message) => {
        console.log('[GameSync] PHASE_CHANGE:', message);
        const store = useLobbyStore.getState();

        if (message.newPhase === LOBBY_PHASES.LOADING) {
            useLobbyStore.getState().setLobby({
                ...useLobbyStore.getState().lobby,
                phase: LOBBY_PHASES.LOADING,
                song: message.song || useLobbyStore.getState().lobby.song
            });
        } else if (message.newPhase === LOBBY_PHASES.IN_BATTLE) {
            useLobbyStore.getState().setLobby({
                ...useLobbyStore.getState().lobby,
                phase: LOBBY_PHASES.IN_BATTLE,
                battleStartTime: message.battleStartTime || useLobbyStore.getState().lobby.battleStartTime,
                song: message.song || useLobbyStore.getState().lobby.song
            });
        } else if (message.newPhase === LOBBY_PHASES.RESULTS) {
            useLobbyStore.getState().endBattle();
        } else if (message.newPhase === LOBBY_PHASES.LOBBY) {
            useLobbyStore.getState().resetToLobby();
        }
    };

    const handlePlayerScoreUpdate = (message) => {
        console.log('[GameSync] SCORE_UPDATE:', message.playerId, message.newScore);
        useLobbyStore.getState().updateScore(message.playerId, message.newScore, message.combo, message.accuracy);
    };

    const handleBattleResults = (message) => {
        console.log('[GameSync] BATTLE_RESULTS:', message);
        const store = useLobbyStore.getState();
        store.setResults(message.players);
        store.endBattle(); // Ensure we transition to results
    };

    const handleError = (message) => {
        console.error('[GameSync] Server error:', message);
        useLobbyStore.getState().setConnectionError({ code: message.code, message: message.message });
    };

    // ========================================================================
    // LIFECYCLE HANDLERS
    // ========================================================================

    const cleanupConnect = service.onConnect(() => {
        console.log('[GameSync] Connected');
        useLobbyStore.getState().setConnectionState('connected');
        useLobbyStore.getState().setConnectionError(null);
    });

    const cleanupDisconnect = service.onDisconnect(() => {
        console.log('[GameSync] Disconnected');
        useLobbyStore.getState().setConnectionState('disconnected');
    });

    const cleanupError = service.onError((err) => {
        console.error('[GameSync] Connection Error:', err);
        useLobbyStore.getState().setConnectionError({
            code: 'CONNECTION_ERROR',
            message: err.message || 'Connection error'
        });
    });

    // ========================================================================
    // REGISTER LISTENERS
    // ========================================================================

    service.on('LOBBY_SNAPSHOT', handleLobbySnapshot);
    service.on('PLAYER_JOINED', handlePlayerJoined);
    service.on('PLAYER_LEFT', handlePlayerLeft);
    service.on('PLAYER_READY_UPDATE', handlePlayerReadyUpdate);
    service.on('PHASE_CHANGE', handlePhaseChange);
    service.on('PLAYER_SCORE_UPDATE', handlePlayerScoreUpdate);
    service.on('BATTLE_RESULTS', handleBattleResults);
    service.on('ERROR', handleError);

    // Initial connection attempt
    useLobbyStore.getState().setConnectionState('connecting');
    service.connect().catch(err => {
        console.error('[GameSync] Initial connection failed:', err);
        useLobbyStore.getState().setConnectionError({
            code: 'CONNECTION_FAILED',
            message: 'Failed to connect to server'
        });
    });

    // Return cleanup function (unlikely to be used in App, but good practice)
    return () => {
        service.off('LOBBY_SNAPSHOT', handleLobbySnapshot);
        service.off('PLAYER_JOINED', handlePlayerJoined);
        service.off('PLAYER_LEFT', handlePlayerLeft);
        service.off('PLAYER_READY_UPDATE', handlePlayerReadyUpdate);
        service.off('PHASE_CHANGE', handlePhaseChange);
        service.off('PLAYER_SCORE_UPDATE', handlePlayerScoreUpdate);
        service.off('BATTLE_RESULTS', handleBattleResults);
        service.off('ERROR', handleError);

        cleanupConnect();
        cleanupDisconnect();
        cleanupError();
        isInitialized = false;
    };
}

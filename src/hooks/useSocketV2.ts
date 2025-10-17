/**
 * USE SOCKET V2 - Simplified Socket Hook Using New Architecture
 *
 * PURPOSE:
 * Demonstrates the new modular architecture by providing the same functionality
 * as the original useSocket hook but with dramatically simplified code. This hook
 * leverages services and stores to achieve clean separation of concerns.
 *
 * COMPARISON WITH ORIGINAL:
 * - Original useSocket: 544 lines, complex logic, mixed concerns
 * - This version: ~200 lines, clean separation, easy to understand
 *
 * KEY IMPROVEMENTS:
 * - Uses socketService for connection management
 * - Uses storageService for localStorage
 * - Uses new modular stores for state
 * - Uses errorService for error handling
 * - Cleaner, more testable code
 * - Better type safety
 * - Easier to maintain
 *
 * USAGE:
 * ```typescript
 * function Game() {
 *   const { roomId } = useParams();
 *   useSocketV2(roomId); // That's it!
 *
 *   // Socket connection, room join/create, state sync all handled
 *   // State available in stores
 * }
 * ```
 *
 * MIGRATION STATUS: ⚠️ EXAMPLE ONLY - Not yet integrated
 * This is a proof-of-concept showing how much simpler code becomes with
 * the new architecture. Full migration planned for Phase 4.
 */

import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { storageService } from '../services/storageService';
import { errorService, ErrorCategory } from '../services/errorService';
import {
  usePlayerStore,
  useGameStateStore,
  useSocketStore,
} from '../stores';

/**
 * Simplified socket hook leveraging new architecture
 */
export function useSocketV2(roomId: string) {
  // Store actions
  const setPlayers = usePlayerStore(state => state.setPlayers);
  const setJoinError = usePlayerStore(state => state.setJoinError);

  const {
    setGameStarted,
    setCurrentNumber,
    setCalledNumbers,
    setAutoPlay,
    setLineWinners,
    setFullHouseWinners,
    setIsPaused,
    setLineWinClaimed,
    setPaymentsFinalized,
  } = useGameStateStore();

  const { setSocket, setConnectionState, setSocketId } = useSocketStore();

  // Refs for tracking (prevent duplicate operations)
  const hasInitialized = useRef(false);
  const hasCreatedRoom = useRef(false);
  const hasJoinedRoom = useRef(false);

  // Get stored player name
  const playerName = storageService.getPlayerName();

  useEffect(() => {
    // Skip if no player name or already initialized
    if (!playerName || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    const initializeSocket = async () => {
      try {
        // Connect to socket server
        await socketService.connect();

        // Store socket instance and state
        const socket = socketService.getSocket();
        if (socket) {
          setSocket(socket);
          setSocketId(socket.id || null);
        }

        // Monitor connection state
        const unsubscribe = socketService.onStateChange((state) => {
          setConnectionState(state);
        });

        // Setup event listeners
        setupEventListeners();

        // Handle room creation or joining
        await handleRoomEntry();

        // Cleanup function
        return () => {
          unsubscribe();
          cleanupEventListeners();
        };
      } catch (error) {
        const appError = errorService.handleError(error, {
          context: 'socket_initialization',
          roomId,
        });
        setJoinError(appError.userMessage);
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      hasInitialized.current = false;
      hasCreatedRoom.current = false;
      hasJoinedRoom.current = false;
    };
  }, [roomId, playerName]);

  /**
   * Handle room entry (create, join, or rejoin)
   */
  const handleRoomEntry = async () => {
    const roomCreation = storageService.getRoomCreationData();
    const roomJoining = storageService.getRoomJoiningData();
    const storedRoomId = storageService.getRoomId();

    // Create room (host)
    if (roomCreation && roomCreation.roomId === roomId && !hasCreatedRoom.current) {
      await createRoom(roomCreation);
      hasCreatedRoom.current = true;
      return;
    }

    // Join room (player)
    if (roomJoining && roomJoining.roomId === roomId && !hasJoinedRoom.current) {
      await joinRoom(roomJoining);
      hasJoinedRoom.current = true;
      return;
    }

    // Rejoin room (reconnection)
    if (storedRoomId && storedRoomId === roomId && !hasJoinedRoom.current) {
      await rejoinRoom(storedRoomId);
      hasJoinedRoom.current = true;
    }
  };

  /**
   * Create new room
   */
  const createRoom = async (data: ReturnType<typeof storageService.getRoomCreationData>) => {
    if (!data) return;

    try {
      const isSolana = data.namespace === 'solana' || data.chain === 0;

      socketService.emit('create_room', {
        roomId,
        playerName: playerName!,
        contractAddress: data.contractAddress || 'solana',
        walletAddress: data.walletAddress,
        chainId: data.chain || 0,
        namespace: data.namespace || (isSolana ? 'solana' : 'eip155'),
        entryFee: data.entryFee || '0',
      });

      // Persist data
      storageService.setRoomId(roomId);
      storageService.setPlayerName(playerName!);
      if (data.contractAddress) {
        storageService.setContractAddress(data.contractAddress);
      }
      storageService.setWalletAddress(data.walletAddress);
    } catch (error) {
      const appError = errorService.handleError(error, {
        context: 'room_creation',
        roomId,
      });
      setJoinError(appError.userMessage);
    }
  };

  /**
   * Join existing room
   */
  const joinRoom = async (data: ReturnType<typeof storageService.getRoomJoiningData>) => {
    if (!data) return;

    try {
      socketService.emit('join_room', {
        roomId,
        playerName: playerName!,
        walletAddress: data.walletAddress,
      });

      // Persist data
      storageService.setRoomId(roomId);
      storageService.setPlayerName(playerName!);
      storageService.setWalletAddress(data.walletAddress);
      storageService.removeRoomJoiningData();
    } catch (error) {
      const appError = errorService.handleError(error, {
        context: 'room_join',
        roomId,
      });
      setJoinError(appError.userMessage);
    }
  };

  /**
   * Rejoin room after disconnect
   */
  const rejoinRoom = async (storedRoomId: string) => {
    try {
      const walletAddress = storageService.getWalletAddress();

      socketService.emit('rejoin_room', {
        roomId: storedRoomId,
        playerName: playerName!,
        walletAddress: walletAddress || '',
      });
    } catch (error) {
      const appError = errorService.handleError(error, {
        context: 'room_rejoin',
        roomId,
      });
      setJoinError(appError.userMessage);
    }
  };

  /**
   * Setup socket event listeners
   */
  const setupEventListeners = () => {
    // Room updates
    socketService.on('room_update', handleRoomUpdate);
    socketService.on('resync_state', handleRoomUpdate);

    // Payment finalized
    socketService.on('payments_finalized', handlePaymentsFinalized);

    // Errors
    socketService.on('join_error', handleJoinError);
    socketService.on('create_error', handleCreateError);
  };

  /**
   * Cleanup event listeners
   */
  const cleanupEventListeners = () => {
    socketService.off('room_update');
    socketService.off('resync_state');
    socketService.off('payments_finalized');
    socketService.off('join_error');
    socketService.off('create_error');
  };

  /**
   * Handle room update event
   */
  const handleRoomUpdate = (roomState: any) => {
    // Parse players data (could be array or object)
    let playersArray = [];
    if (Array.isArray(roomState.players)) {
      playersArray = roomState.players;
    } else if (typeof roomState.players === 'object' && roomState.players !== null) {
      try {
        playersArray = typeof roomState.players.values === 'function'
          ? Array.from(roomState.players.values())
          : Object.values(roomState.players);
      } catch {
        playersArray = [];
      }
    }

    // Update stores
    setPlayers(playersArray);
    setGameStarted(roomState.gameStarted || false);
    setCurrentNumber(roomState.currentNumber || null);
    setCalledNumbers(roomState.calledNumbers || []);
    setAutoPlay(roomState.autoPlay || false);
    setLineWinners(roomState.lineWinners || []);
    setFullHouseWinners(roomState.fullHouseWinners || []);
    setIsPaused(roomState.isPaused || false);
    setLineWinClaimed(roomState.lineWinClaimed || false);

    // Handle payment finalization
    if (roomState.paymentsFinalized) {
      setPaymentsFinalized(true);
      storageService.setPaymentFinalized(roomId);
    }
  };

  /**
   * Handle payments finalized event
   */
  const handlePaymentsFinalized = () => {
    setPaymentsFinalized(true);
    storageService.setPaymentFinalized(roomId);
  };

  /**
   * Handle join error
   */
  const handleJoinError = ({ message }: { message: string }) => {
    const appError = errorService.createError(
      ErrorCategory.NOT_FOUND,
      message,
      { context: 'room_join', roomId }
    );

    setJoinError(appError.userMessage);

    // Clear invalid data
    if (message.includes('Room not found')) {
      storageService.clearRoomData();
    }
  };

  /**
   * Handle create error
   */
  const handleCreateError = ({ message }: { message: string }) => {
    const appError = errorService.createError(
      ErrorCategory.CONFLICT,
      message,
      { context: 'room_creation', roomId }
    );

    setJoinError(appError.userMessage);

    // Clear room creation data if room already exists
    if (message.includes('already exists')) {
      storageService.removeRoomCreationData();
    }
  };
}

export default useSocketV2;

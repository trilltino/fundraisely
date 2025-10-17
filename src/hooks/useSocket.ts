/**
 * USE SOCKET HOOK - WebSocket Connection & Room Lifecycle Management
 *
 * PURPOSE:
 * This React hook establishes and manages the WebSocket connection between the client
 * and the Node.js server. It handles the complete room lifecycle including room creation,
 * joining, reconnection, and state synchronization. This is the ONLY hook that directly
 * interacts with Socket.io, making it the central communication bridge between frontend
 * and backend.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Establishes singleton Socket.io connection to WebSocket server
 * - Handles room creation for hosts (with Solana contract address)
 * - Handles room joining for players
 * - Manages reconnection when connection drops
 * - Syncs all game state from server to Zustand store
 * - Persists critical data to localStorage for reconnection
 * - Listens to ALL server events and updates React state accordingly
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Called by Game.tsx on mount with roomId parameter
 *   - Returns socket instance for use by other hooks (useGame)
 *   - Updates useGameStore with ALL server data (players, game state, winners)
 *   - Manages localStorage for persistence across page refreshes
 *   - Coordinates room creation/joining based on localStorage flags
 *
 * WebSocket Server Integration:
 *   - Connects to VITE_SOCKET_URL (default: http://localhost:3001)
 *   - Emits: create_room, join_room, rejoin_room
 *   - Listens: room_update, resync_state, payments_finalized, errors
 *   - Handles connect/disconnect/reconnect lifecycle
 *   - Singleton pattern ensures one connection per client
 *
 * Solana Program Coordination:
 *   - Passes Solana contract address during room creation
 *   - Stores wallet address for transaction signing
 *   - Tracks payment finalization status from blockchain
 *   - Distinguishes Solana rooms from EVM rooms (namespace field)
 *   - Pattern: Create Solana room -> Store contract address -> Join via socket
 *
 * KEY RESPONSIBILITIES:
 * 1. Connection Management: Establish, maintain, reconnect socket
 * 2. Room Creation: Emit create_room with Solana/EVM contract details
 * 3. Room Joining: Emit join_room for non-host players
 * 4. Reconnection: Emit rejoin_room when connection drops
 * 5. State Sync: Update Zustand store with ALL server broadcasts
 * 6. localStorage: Persist/retrieve room data for reconnection
 * 7. Error Handling: Display errors, clear invalid localStorage
 * 8. Payment Tracking: Monitor when Solana transactions complete
 *
 * LIFECYCLE FLOW:
 *
 * NEW HOST (Creating Room):
 * 1. User creates Solana room on blockchain
 * 2. Frontend stores roomCreation data in localStorage
 * 3. Navigate to /game/:roomId
 * 4. useSocket hook runs
 * 5. Detects roomCreation in localStorage
 * 6. Socket connects -> emit 'create_room' with contract address
 * 7. Server creates room -> broadcasts 'room_update'
 * 8. Hook updates Zustand store with room state
 *
 * NEW PLAYER (Joining Room):
 * 1. User enters room code and verifies room exists
 * 2. Frontend stores roomJoining data in localStorage
 * 3. Navigate to /game/:roomId
 * 4. useSocket hook runs
 * 5. Detects roomJoining in localStorage
 * 6. Socket connects -> emit 'join_room'
 * 7. Server adds player -> broadcasts 'room_update'
 * 8. Hook updates Zustand store with room state
 *
 * RECONNECTION (After Page Refresh):
 * 1. User refreshes page or loses connection
 * 2. useSocket hook runs with same roomId
 * 3. Detects roomId/playerName in localStorage (no roomCreation/Joining)
 * 4. Socket reconnects -> emit 'rejoin_room'
 * 5. Server re-adds player -> broadcasts 'resync_state'
 * 6. Hook syncs all game state from server
 *
 * SOCKET.IO EVENTS:
 *
 * Emitted to Server:
 *   - create_room: {roomId, playerName, contractAddress, walletAddress, chainId, namespace, entryFee}
 *   - join_room: {roomId, playerName, walletAddress}
 *   - rejoin_room: {roomId, playerName, walletAddress}
 *
 * Received from Server:
 *   - connect: Socket successfully connected
 *   - room_update: Complete room state (players, game status, winners)
 *   - resync_state: Full state resync after reconnection
 *   - payments_finalized: Solana prize distribution complete
 *   - join_error: Failed to join room (room not found, game started, etc.)
 *   - create_error: Failed to create room (already exists, etc.)
 *   - connect_error: Connection failed
 *   - disconnect: Connection lost
 *
 * LOCALSTORAGE KEYS:
 *
 * Room Creation (Host):
 *   - roomCreation: JSON object with {roomId, walletAddress, contractAddress, chain, namespace, entryFee}
 *   - Set by: CreateRoomCard component after Solana transaction
 *   - Cleared by: This hook after successful room creation
 *
 * Room Joining (Player):
 *   - roomJoining: JSON object with {roomId, walletAddress}
 *   - Set by: JoinRoomCard component after verification
 *   - Cleared by: This hook after successful join
 *
 * Persistence (Both):
 *   - roomId: Current room ID string
 *   - playerName: Current player's display name
 *   - walletAddress: Current player's wallet address
 *   - contractAddress: Solana contract address (host only)
 *   - payment_finalized_{roomId}: Boolean flag for payment status
 *
 * ERROR HANDLING:
 *
 * join_error:
 *   - "Room not found": Clears localStorage, navigates to landing
 *   - "Game already started": Shows error, prevents join
 *
 * create_error:
 *   - "Room already exists": Clears roomCreation, allows rejoin
 *
 * connect_error:
 *   - Network issues: Shows "Failed to connect" error
 *   - Socket.io will auto-retry with exponential backoff
 *
 * SINGLETON PATTERN:
 * - socketInstance created ONCE at module level
 * - autoConnect: false to control connection timing
 * - reconnection: true with 5 attempts, 1s delay
 * - All hook instances share same socket connection
 * - Prevents duplicate connections from multiple components
 *
 * REF USAGE:
 * - socketRef: Stores socket instance (doesn't trigger re-render)
 * - roomCreatedRef: Prevents duplicate create_room emissions
 * - hasRejoinedRef: Prevents duplicate rejoin_room emissions
 * - Reset in cleanup to allow re-entry to same room
 *
 * SOLANA vs EVM ROOM CREATION:
 *
 * Solana Rooms:
 *   - namespace: 'solana' or omitted
 *   - chainId: 0 or omitted
 *   - contractAddress: Optional (can be 'solana' placeholder)
 *   - Only requires: walletAddress
 *
 * EVM Rooms:
 *   - namespace: 'eip155'
 *   - chainId: Required (e.g., 1 for Ethereum mainnet)
 *   - contractAddress: Required (deployed contract address)
 *   - Requires: contractAddress, walletAddress, chainId
 *
 * STATE SYNC PATTERN:
 * - Server emits 'room_update' to all players in room
 * - Hook receives update and calls multiple Zustand setters
 * - Player data converted from Map to Array if needed
 * - All state updates happen synchronously in one pass
 * - React batches re-renders for performance
 *
 * PAYMENTS FINALIZATION:
 * - Server emits 'payments_finalized' after Solana transaction
 * - Hook sets paymentsFinalized flag in Zustand store
 * - Also persists to localStorage for page refresh scenarios
 * - Used by UI to show "Prizes Distributed" message
 * - Prevents duplicate prize distribution
 *
 * DEBUGGING:
 * - Extensive console.log statements with [useSocket] and [Socket] prefixes
 * - Logs connection state, emitted events, received data
 * - Helps trace room lifecycle issues
 * - Can be filtered in browser console by prefix
 *
 * USAGE EXAMPLE:
 * ```typescript
 * function Game() {
 *   const { roomId } = useParams();
 *   const socket = useSocket(roomId);
 *
 *   // socket is now available for useGame hook
 *   const { gameState, callNumber } = useGame(socket, roomId);
 *
 *   return <div>Game content</div>;
 * }
 * ```
 *
 * PERFORMANCE NOTES:
 * - Singleton socket prevents multiple connections
 * - useEffect runs only when roomId or playerName changes
 * - Does NOT disconnect on unmount (allows reconnection)
 * - Cleanup only resets refs, keeps socket alive
 * - localStorage reads/writes are synchronous but fast
 *
 * RELATED FILES:
 * - server/handlers/socketHandler.js - Server-side event handlers
 * - server/managers/RoomManager.js - Server-side room state
 * - src/hooks/useGame.ts - Uses socket for game events
 * - src/store/gameStore.ts - Updated by this hook
 * - src/components/CreateRoomCard.tsx - Sets roomCreation localStorage
 * - src/components/JoinRoomCard.tsx - Sets roomJoining localStorage
 */

// src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Singleton socket instance
const socketInstance = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false,
});

export function useSocket(roomId: string) {
  console.log('[useSocket] [LAUNCH] useEffect triggered', { roomId });

  const {
    setSocket,
    playerName,
    setPlayers,
    setGameStarted,
    setCurrentNumber,
    setCalledNumbers,
    setAutoPlay,
    setJoinError,
    setLineWinners,
    setFullHouseWinners,
    setIsPaused,
    setLineWinClaimed,
    setPaymentsFinalized,
  } = useGameStore();

  const socketRef = useRef<Socket | null>(socketInstance);
  const roomCreatedRef = useRef(false);
  const hasRejoinedRef = useRef(false);

  useEffect(() => {
    console.log('[useSocket] [LAUNCH] useEffect triggered', { roomId, playerName });

    if (!playerName) {
      console.warn('[useSocket]  No player name set, skipping socket connection');
      return;
    }

    console.log('[useSocket]  Initializing socket', { roomId, playerName });

    const roomCreationString = localStorage.getItem('roomCreation');
    const roomJoiningString = localStorage.getItem('roomJoining');
    console.log('[useSocket] [PACKAGE] LocalStorage data', {
      roomCreationString,
      roomJoiningString,
    });

    let roomCreationData = null;
    let roomJoiningData = null;

    try {
      if (roomCreationString) {
        roomCreationData = JSON.parse(roomCreationString);
        console.log('[useSocket] [COMPLETE] Parsed roomCreationData', roomCreationData);
      }
      if (roomJoiningString) {
        roomJoiningData = JSON.parse(roomJoiningString);
        console.log('[useSocket] [COMPLETE] Parsed roomJoiningData', roomJoiningData);
      }
    } catch (e) {
      console.error('[useSocket] [ERROR] Error parsing localStorage data', e);
      localStorage.removeItem('roomCreation');
      localStorage.removeItem('roomJoining');
      return;
    }

    const newSocket = socketRef.current;
    if (!newSocket) {
      console.error('[useSocket] [ERROR] Socket not initialized');
      return;
    }

    if (!newSocket.connected) {
      console.log('[useSocket]  Connecting socket');
      newSocket.connect();
    }
    setSocket(newSocket);
    console.log('[useSocket] [COMPLETE] Socket set in store', { socketId: newSocket.id });

    newSocket.on('connect', () => {
      console.log('[Socket] [COMPLETE] Connected', { socketId: newSocket.id });

      const storedRoomId = localStorage.getItem('roomId');
      const storedPlayerName = localStorage.getItem('playerName');
      const storedWalletAddress = localStorage.getItem('walletAddress') || roomCreationData?.walletAddress || roomJoiningData?.walletAddress || null;
      console.log('[Socket]  Stored data', {
        storedRoomId,
        storedPlayerName,
        storedWalletAddress,
      });

      // Create Room
      if (
        roomCreationData &&
        roomCreationData.roomId === roomId &&
        !roomCreatedRef.current
      ) {
        // For Solana, contractAddress is optional (room is created on-chain first)
        const isSolana = roomCreationData.namespace === 'solana' || roomCreationData.chain === 0;
        const hasRequiredFields = isSolana
          ? roomCreationData.walletAddress // Solana only needs wallet
          : roomCreationData.contractAddress && roomCreationData.walletAddress && roomCreationData.chain; // EVM needs all fields

        if (hasRequiredFields) {
          const createRoomData = {
            roomId,
            playerName,
            contractAddress: roomCreationData.contractAddress || 'solana', // Use 'solana' marker for Solana rooms
            walletAddress: roomCreationData.walletAddress,
            chainId: roomCreationData.chain || 0,
            namespace: roomCreationData.namespace || (isSolana ? 'solana' : 'eip155'),
            entryFee: roomCreationData.entryFee || '0',
          };
          console.log('[Socket]  Emitting create_room', createRoomData);
          newSocket.emit('create_room', createRoomData);
          localStorage.setItem('roomId', roomId);
          localStorage.setItem('playerName', playerName);
          if (roomCreationData.contractAddress) {
            localStorage.setItem('contractAddress', roomCreationData.contractAddress);
          }
          localStorage.setItem('walletAddress', roomCreationData.walletAddress);
          roomCreatedRef.current = true;
          console.log('[Socket] [COMPLETE] Room creation emitted', { roomCreatedRef: roomCreatedRef.current });
        } else {
          console.error('[Socket] [ERROR] Invalid roomCreationData fields', roomCreationData);
        }
      }
      // Join Room
      else if (
        roomJoiningData &&
        roomJoiningData.roomId === roomId &&
        !hasRejoinedRef.current
      ) {
        console.log('[Socket]  Emitting join_room', {
          roomId,
          playerName,
          walletAddress: roomJoiningData.walletAddress,
        });
        newSocket.emit('join_room', {
          roomId,
          playerName,
          walletAddress: roomJoiningData.walletAddress,
        });
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('walletAddress', roomJoiningData.walletAddress);
        localStorage.removeItem('roomJoining');
        hasRejoinedRef.current = true;
        console.log('[Socket] [COMPLETE] Join attempt completed', { hasRejoinedRef: hasRejoinedRef.current });
      }
      // Rejoin Room
      else if (
        !roomCreationData &&
        !roomJoiningData &&
        storedRoomId &&
        storedPlayerName &&
        !hasRejoinedRef.current
      ) {
        console.log('[Socket]  Emitting rejoin_room', {
          roomId: storedRoomId,
          playerName: storedPlayerName,
          walletAddress: storedWalletAddress,
        });
        newSocket.emit('rejoin_room', {
          roomId: storedRoomId,
          playerName: storedPlayerName,
          walletAddress: storedWalletAddress,
        });
        hasRejoinedRef.current = true;
        console.log('[Socket] [COMPLETE] Rejoin attempt completed', { hasRejoinedRef: hasRejoinedRef.current });
      }
      else {
        console.warn('[Socket]  No valid roomCreation, roomJoining, or rejoin data', { roomId });
      }
    });

    // Room Update
    newSocket.on('room_update', (roomState) => {
      console.log('[Socket] [PACKAGE] Received room_update', roomState);

      if (Array.isArray(roomState.players)) {
        console.log('[Socket] [COMPLETE] Setting players (array)', roomState.players);
        setPlayers(roomState.players);
      } else if (typeof roomState.players === 'object' && roomState.players !== null) {
        try {
          const playersArray =
            typeof roomState.players.values === 'function'
              ? Array.from(roomState.players.values())
              : Object.values(roomState.players);
          console.log('[Socket] [COMPLETE] Setting players (converted object)', playersArray);
          setPlayers(playersArray);
        } catch (e) {
          console.error('[Socket] [ERROR] Error converting players data', e);
          setPlayers([]);
        }
      } else {
        console.warn('[Socket]  Invalid players data, setting empty array');
        setPlayers([]);
      }

      console.log('[Socket]  Updating game state', {
        gameStarted: roomState.gameStarted,
        currentNumber: roomState.currentNumber,
        calledNumbers: roomState.calledNumbers,
        autoPlay: roomState.autoPlay,
        lineWinners: roomState.lineWinners,
        fullHouseWinners: roomState.fullHouseWinners,
        isPaused: roomState.isPaused,
        lineWinClaimed: roomState.lineWinClaimed,
        paymentsFinalized: roomState.paymentsFinalized,
      });

      setGameStarted(roomState.gameStarted || false);
      setCurrentNumber(roomState.currentNumber || null);
      setCalledNumbers(roomState.calledNumbers || []);
      setAutoPlay(roomState.autoPlay || false);
      setLineWinners(roomState.lineWinners || []);
      setFullHouseWinners(roomState.fullHouseWinners || []);
      setIsPaused(roomState.isPaused || false);
      setLineWinClaimed(roomState.lineWinClaimed || false);

      // Do not clear roomCreation here to preserve walletAddress
      if (roomState.paymentsFinalized) {
        console.log('[Socket] [MONEY] Payments finalized, updating state and localStorage');
        setPaymentsFinalized(true);
        const roomId = localStorage.getItem('roomId');
        if (roomId) {
          localStorage.setItem(`payment_finalized_${roomId}`, 'true');
        }
      }
    });

    // Resync After Reconnect
    newSocket.on('resync_state', (resyncData) => {
      console.log('[Socket]  Received resync_state', resyncData);

      if (Array.isArray(resyncData.players)) {
        console.log('[Socket] [COMPLETE] Setting players for resync', resyncData.players);
        setPlayers(resyncData.players);
      }

      console.log('[Socket]  Updating resync game state', {
        gameStarted: resyncData.gameStarted,
        currentNumber: resyncData.currentNumber,
        calledNumbers: resyncData.calledNumbers,
        autoPlay: resyncData.autoPlay,
        lineWinners: resyncData.lineWinners,
        fullHouseWinners: resyncData.fullHouseWinners,
        isPaused: resyncData.isPaused,
        lineWinClaimed: resyncData.lineWinClaimed,
        paymentsFinalized: resyncData.paymentsFinalized,
      });

      setGameStarted(resyncData.gameStarted || false);
      setCurrentNumber(resyncData.currentNumber || null);
      setCalledNumbers(resyncData.calledNumbers || []);
      setAutoPlay(resyncData.autoPlay || false);
      setLineWinners(resyncData.lineWinners || []);
      setFullHouseWinners(resyncData.fullHouseWinners || []);
      setIsPaused(resyncData.isPaused || false);
      setLineWinClaimed(resyncData.lineWinClaimed || false);

      if (resyncData.paymentsFinalized) {
        console.log('[Socket] [MONEY] Resync payments finalized, updating state and localStorage');
        setPaymentsFinalized(true);
        localStorage.setItem(`payment_finalized_${roomId}`, 'true');
      }
    });

    // Payments Finalized
    newSocket.on('payments_finalized', (data) => {
      console.log('[Socket] [MONEY] Received payments_finalized', data);
      setPaymentsFinalized(true);
      const roomId = localStorage.getItem('roomId');
      if (roomId) {
        console.log('[Socket] [COMPLETE] Setting payment_finalized in localStorage', { roomId });
        localStorage.setItem(`payment_finalized_${roomId}`, 'true');
      }
    });

    // Errors
    newSocket.on('join_error', ({ message }) => {
      console.error('[Socket] [ERROR] join_error', { message });
      setJoinError(message);
      if (message.includes('Room not found')) {
        console.log('[Socket] ️ Clearing localStorage due to Room not found');
        localStorage.removeItem('roomId');
        localStorage.removeItem('roomCreation');
        localStorage.removeItem('roomJoining');
      }
    });

    newSocket.on('create_error', ({ message }) => {
      console.error('[Socket] [ERROR] create_error', { message });
      setJoinError(message);
      if (message.includes('already exists')) {
        console.log('[Socket] ️ Clearing roomCreation due to room already exists');
        localStorage.removeItem('roomCreation');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] [ERROR] connect_error', error);
      setJoinError('Failed to connect to the server. Please try again later.');
    });

    // Add listener for unexpected disconnections
    newSocket.on('disconnect', (reason) => {
      console.error('[Socket]  Disconnected', { reason, roomId, playerName, socketId: newSocket.id });
      console.log('[Socket]  Socket state at disconnect', {
        connected: newSocket.connected,
        disconnected: newSocket.disconnected,
        active: newSocket.active,
      });
    });

    return () => {
      console.log('[useSocket]  Cleaning up useEffect', { roomId });
      console.log('[useSocket]  Keeping socket connected for reconnection', { socketId: newSocket.id });
      // Do not disconnect socket to allow reconnection
      hasRejoinedRef.current = false;
      console.log('[useSocket] [COMPLETE] Cleanup complete', { hasRejoinedRef: hasRejoinedRef.current });
    };
  }, [roomId, playerName]);

  console.log('[useSocket] ↩️ Returning socket', { socketId: socketRef.current?.id });
  return socketRef.current;
}
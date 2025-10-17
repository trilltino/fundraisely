/**
 * SOCKET SERVICE - Clean Socket.io Abstraction Layer
 *
 * PURPOSE:
 * Provides a clean, type-safe abstraction over Socket.io for real-time communication
 * between client and server. Separates socket connection logic from business logic,
 * enables testing with mock sockets, and provides consistent error handling.
 *
 * ROLE IN APPLICATION:
 * - Manages Socket.io connection lifecycle
 * - Provides type-safe emit/listen methods
 * - Handles reconnection with exponential backoff
 * - Centralizes socket event definitions
 * - Enables easy mocking for tests
 * - Provides connection state tracking
 *
 * KEY FEATURES:
 * - Singleton socket connection
 * - Type-safe event emissions
 * - Automatic reconnection
 * - Event listener management
 * - Connection state observable
 * - Error handling integration
 *
 * USAGE:
 * ```typescript
 * // Connect
 * await socketService.connect();
 *
 * // Emit events
 * socketService.emit('create_room', { roomId, playerName });
 *
 * // Listen to events
 * socketService.on('room_update', (data) => {
 *   console.log('Room updated:', data);
 * });
 *
 * // Remove listener
 * socketService.off('room_update', handler);
 *
 * // Disconnect
 * socketService.disconnect();
 * ```
 */

import { io, Socket } from 'socket.io-client';
import { errorService, ErrorCategory } from './errorService';

// Socket event types for type safety
export interface SocketEvents {
  // Client -> Server
  create_room: {
    roomId: string;
    playerName: string;
    contractAddress?: string;
    walletAddress: string;
    chainId?: number;
    namespace?: string;
    entryFee?: string;
  };
  join_room: {
    roomId: string;
    playerName: string;
    walletAddress: string;
  };
  rejoin_room: {
    roomId: string;
    playerName: string;
    walletAddress: string;
  };
  start_game: {
    roomId: string;
  };
  player_ready: {
    roomId: string;
  };
  call_number: {
    roomId: string;
  };
  toggle_auto_play: {
    roomId: string;
  };
  pause_game: {
    roomId: string;
  };
  unpause_game: {
    roomId: string;
  };
  player_line_won: {
    roomId: string;
  };
  player_full_house_won: {
    roomId: string;
  };
  update_card: {
    roomId: string;
    card: any[];
  };
  new_game: {
    roomId: string;
  };

  // Server -> Client
  room_update: {
    roomId: string;
    players: any[];
    gameStarted?: boolean;
    currentNumber?: number | null;
    calledNumbers?: number[];
    autoPlay?: boolean;
    lineWinners?: Array<{ id: string; name: string }>;
    fullHouseWinners?: Array<{ id: string; name: string }>;
    isPaused?: boolean;
    lineWinClaimed?: boolean;
    paymentsFinalized?: boolean;
  };
  resync_state: {
    roomId: string;
    players: any[];
    gameStarted?: boolean;
    currentNumber?: number | null;
    calledNumbers?: number[];
    autoPlay?: boolean;
    lineWinners?: Array<{ id: string; name: string }>;
    fullHouseWinners?: Array<{ id: string; name: string }>;
    isPaused?: boolean;
    lineWinClaimed?: boolean;
    paymentsFinalized?: boolean;
  };
  number_called: {
    currentNumber: number;
    calledNumbers: number[];
  };
  auto_play_update: {
    autoPlay: boolean;
  };
  game_paused: Record<string, never>;
  game_unpaused: Record<string, never>;
  line_winners_proposed: {
    winners: Array<{ id: string; name: string }>;
  };
  line_winners_declared: {
    winners: Array<{ id: string; name: string }>;
  };
  full_house_winners_proposed: {
    winners: Array<{ id: string; name: string }>;
  };
  full_house_winners_declared: {
    winners: Array<{ id: string; name: string }>;
  };
  payments_finalized: {
    roomId: string;
  };
  join_error: {
    message: string;
  };
  create_error: {
    message: string;
  };
}

// Connection state
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

// Connection state listener
export type ConnectionStateListener = (state: ConnectionState) => void;

class SocketService {
  private socket: Socket | null = null;
  private url: string;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private stateListeners: Set<ConnectionStateListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private readonly debug = import.meta.env.DEV;

  constructor() {
    this.url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  }

  /**
   * Log debug message
   */
  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[SocketService] ${message}`, data || '');
    }
  }

  /**
   * Update connection state and notify listeners
   */
  private setState(newState: ConnectionState): void {
    if (this.connectionState !== newState) {
      this.connectionState = newState;
      this.log(`State changed: ${newState}`);
      this.stateListeners.forEach(listener => listener(newState));
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.log('[COMPLETE] Connected', { socketId: this.socket?.id });
      this.setState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      this.log(' Disconnected', { reason });
      this.setState(ConnectionState.DISCONNECTED);

      if (reason === 'io server disconnect') {
        // Server explicitly disconnected, don't auto-reconnect
        this.log('Server disconnected client');
      } else {
        // Connection lost, will auto-reconnect
        this.setState(ConnectionState.RECONNECTING);
      }
    });

    this.socket.on('connect_error', (error) => {
      this.log('[ERROR] Connection error', error);
      this.setState(ConnectionState.ERROR);

      errorService.handleError(error, {
        context: 'socket_connection',
      });

      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.log('Max reconnect attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.log(' Reconnected', { attemptNumber });
      this.setState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.log(' Reconnecting...', { attemptNumber });
      this.setState(ConnectionState.RECONNECTING);
    });

    this.socket.on('reconnect_failed', () => {
      this.log('[ERROR] Reconnection failed');
      this.setState(ConnectionState.ERROR);
    });
  }

  /**
   * Connect to socket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        this.log('Already connected');
        resolve();
        return;
      }

      this.setState(ConnectionState.CONNECTING);
      this.log(`Connecting to ${this.url}`);

      // Create socket if it doesn't exist
      if (!this.socket) {
        this.socket = io(this.url, {
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
          autoConnect: false,
        });

        this.setupListeners();
      }

      // Setup one-time listeners for connection result
      this.socket.once('connect', () => {
        resolve();
      });

      this.socket.once('connect_error', (error) => {
        reject(errorService.createError(
          ErrorCategory.NETWORK,
          `Failed to connect to server: ${error.message}`,
          { context: 'socket_connection' }
        ));
      });

      // Initiate connection
      this.socket.connect();
    });
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (!this.socket) return;

    this.log('Disconnecting');
    this.socket.disconnect();
    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Emit event to server (type-safe)
   */
  emit<K extends keyof SocketEvents>(
    event: K,
    data: SocketEvents[K]
  ): void {
    if (!this.socket?.connected) {
      const error = errorService.createError(
        ErrorCategory.NETWORK,
        'Socket not connected',
        { context: 'socket_emit', event }
      );
      this.log('[ERROR] Cannot emit, not connected', { event });
      throw error;
    }

    this.log(` Emit: ${event}`, data);
    this.socket.emit(event, data);
  }

  /**
   * Listen to server events (type-safe)
   */
  on<K extends keyof SocketEvents>(
    event: K,
    handler: (data: SocketEvents[K]) => void
  ): void {
    if (!this.socket) {
      this.log('[ERROR] Cannot listen, socket not initialized');
      return;
    }

    this.log(` Listening: ${event}`);
    this.socket.on(event as string, handler);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SocketEvents>(
    event: K,
    handler?: (data: SocketEvents[K]) => void
  ): void {
    if (!this.socket) return;

    this.log(` Stop listening: ${event}`);
    if (handler) {
      this.socket.off(event as string, handler);
    } else {
      this.socket.off(event as string);
    }
  }

  /**
   * Listen to event once
   */
  once<K extends keyof SocketEvents>(
    event: K,
    handler: (data: SocketEvents[K]) => void
  ): void {
    if (!this.socket) {
      this.log('[ERROR] Cannot listen, socket not initialized');
      return;
    }

    this.log(` Listening once: ${event}`);
    this.socket.once(event as string, handler);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Get underlying socket instance (for advanced use cases)
   * Use sparingly - prefer using the service methods
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Reconnect manually
   */
  reconnect(): Promise<void> {
    this.disconnect();
    return this.connect();
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;

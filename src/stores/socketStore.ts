/**
 * SOCKET STORE - Socket Connection State Management
 *
 * PURPOSE:
 * Manages socket.io connection state separately from game/player state.
 * Provides reactive connection status tracking for UI components.
 *
 * ROLE IN APPLICATION:
 * - Tracks socket connection status
 * - Stores socket instance reference
 * - Provides connection state to components
 * - Enables connection monitoring
 *
 * KEY FEATURES:
 * - Clean socket state management
 * - Connection status tracking
 * - Socket instance storage
 * - Type-safe updates
 *
 * USAGE:
 * ```typescript
 * import { useSocketStore } from '@/stores/socketStore';
 *
 * function ConnectionStatus() {
 *   const isConnected = useSocketStore(state => state.isConnected);
 *   const connectionState = useSocketStore(state => state.connectionState);
 *
 *   return (
 *     <div>
 *       Status: {connectionState}
 *       {!isConnected && <button onClick={reconnect}>Reconnect</button>}
 *     </div>
 *   );
 * }
 * ```
 */

import { create } from 'zustand';
import type { Socket } from 'socket.io-client';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

export interface SocketStore {
  // Socket instance
  socket: Socket | null;

  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  socketId: string | null;

  // Error state
  connectionError: string | null;

  // Reconnection tracking
  reconnectAttempts: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;

  // Actions
  setSocket: (socket: Socket | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  setIsConnected: (connected: boolean) => void;
  setSocketId: (id: string | null) => void;
  setConnectionError: (error: string | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  updateConnectionTimestamp: (connected: boolean) => void;
  resetSocketStore: () => void;
}

// Initial state factory
const createInitialState = () => ({
  socket: null,
  isConnected: false,
  connectionState: ConnectionState.DISCONNECTED,
  socketId: null,
  connectionError: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
});

export const useSocketStore = create<SocketStore>()((set, get) => ({
  ...createInitialState(),

  // Set socket instance
  setSocket: (socket) => {
    if (get().socket !== socket) {
      set({
        socket,
        socketId: socket?.id || null,
      });
    }
  },

  // Set connection state
  setConnectionState: (connectionState) => {
    if (get().connectionState !== connectionState) {
      set({ connectionState });

      // Auto-update isConnected based on state
      const isConnected = connectionState === ConnectionState.CONNECTED;
      if (get().isConnected !== isConnected) {
        set({ isConnected });
      }
    }
  },

  // Set connected flag
  setIsConnected: (isConnected) => {
    if (get().isConnected !== isConnected) {
      set({ isConnected });

      // Update timestamp
      get().updateConnectionTimestamp(isConnected);
    }
  },

  // Set socket ID
  setSocketId: (socketId) => {
    if (get().socketId !== socketId) {
      set({ socketId });
    }
  },

  // Set connection error
  setConnectionError: (connectionError) => {
    if (get().connectionError !== connectionError) {
      set({ connectionError });
    }
  },

  // Increment reconnect attempts
  incrementReconnectAttempts: () => {
    set({ reconnectAttempts: get().reconnectAttempts + 1 });
  },

  // Reset reconnect attempts
  resetReconnectAttempts: () => {
    if (get().reconnectAttempts !== 0) {
      set({ reconnectAttempts: 0 });
    }
  },

  // Update connection timestamp
  updateConnectionTimestamp: (connected) => {
    if (connected) {
      set({ lastConnectedAt: Date.now() });
    } else {
      set({ lastDisconnectedAt: Date.now() });
    }
  },

  // Reset to initial state (preserve socket instance)
  resetSocketStore: () => {
    const { socket } = get();
    set({
      ...createInitialState(),
      socket, // Preserve socket connection
    });
  },
}));

export default useSocketStore;

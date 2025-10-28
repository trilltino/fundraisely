/**
 * Quiz Socket Hook - Real-Time Game Coordination via WebSocket
 *
 * **Purpose:**
 * Establishes and manages a persistent WebSocket connection to the coordination server for
 * real-time quiz game events. This hook provides the Socket.io client instance used by quiz
 * components to send/receive game state updates.
 *
 * **Architecture Context:**
 * ```
 * ┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
 * │  React Client   │ ◄─────► │  Node.js Server  │ ◄─────► │ Solana Program  │
 * │  (useQuizSocket)│  Socket │  (socketHandler) │   RPC   │ (fundraisely)   │
 * └─────────────────┘         └──────────────────┘         └─────────────────┘
 *      Game State               Event Coordination          Financial State
 *      Player Lists             Room Management             Fee Collection
 *      Round Progress           Web3 Verification           Prize Distribution
 * ```
 *
 * **Separation of Concerns:**
 * - **WebSocket (this hook)**: Real-time game coordination, player presence, round progression
 * - **Blockchain RPC**: Financial operations (entry fees, prize distribution) via useFundraiselyContract
 *
 * This separation ensures:
 * 1. Game can run even if blockchain temporarily unavailable
 * 2. Server can verify Web3 payments without slowing down game flow
 * 3. Atomic fund distribution happens only at game end
 *
 * **Connection Lifecycle:**
 * 1. **Mount**: Auto-connects to VITE_SOCKET_URL on component mount
 * 2. **Reconnection**: Automatically reconnects on disconnect (Socket.io built-in)
 * 3. **Unmount**: Disconnects cleanly when component unmounts
 *
 * **Connection States:**
 * - `null` - Not connected yet (initial state or disconnected)
 * - `Socket` - Connected and ready to send/receive events
 *
 * **Event Handling:**
 * The returned Socket instance is used by components to:
 * - Listen for game events: `socket.on('roundStart', handler)`
 * - Emit player actions: `socket.emit('submitAnswer', data)`
 * - Join rooms: `socket.emit('joinRoom', roomId)`
 *
 * **Common Events (examples):**
 * - Server → Client: 'roundStart', 'questionRevealed', 'playerJoined', 'gameEnded'
 * - Client → Server: 'joinRoom', 'submitAnswer', 'purchaseExtra', 'leaveRoom'
 *
 * **Security Notes:**
 * - All sensitive operations (payments, winner declaration) are blockchain-based
 * - Socket only coordinates game flow, not financial state
 * - Server validates Web3 signatures before allowing join (see socketHandler.js)
 *
 * **Type Safety:**
 * Currently uses `any` for event payloads. TODO: Add Zod schemas for type-safe events.
 *
 * **Integration Points:**
 * - Used by: `QuizChallengePage.tsx`, `JoinQuizModal.tsx`, `Game.tsx`
 * - Server: `server/handlers/socketHandler.js`
 * - Environment: Requires `VITE_SOCKET_URL` in .env
 *
 * @returns Socket.io client instance if connected, null if disconnected
 *
 * @example
 * ```typescript
 * // In a quiz component
 * const socket = useQuizSocket();
 *
 * useEffect(() => {
 *   if (!socket) return;
 *
 *   // Listen for game events
 *   socket.on('roundStart', (data) => {
 *     console.log('Round started:', data.roundNumber);
 *   });
 *
 *   // Join a room
 *   socket.emit('joinRoom', { roomId: 'abc123', playerName: 'Alice' });
 *
 *   // Cleanup
 *   return () => {
 *     socket.off('roundStart');
 *   };
 * }, [socket]);
 * ```
 *
 * @example
 * // Conditional rendering based on connection status
 * ```typescript
 * const socket = useQuizSocket();
 *
 * if (!socket) {
 *   return <div>Connecting to game server...</div>;
 * }
 *
 * return <QuizGame socket={socket} />;
 * ```
 *
 * @module useQuizSocket
 * @category Quiz Hooks
 */

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Establishes a persistent WebSocket connection for real-time quiz game coordination.
 *
 * **Connection Behavior:**
 * - Auto-connects on mount using `VITE_SOCKET_URL` from environment
 * - Reconnects automatically if connection drops (Socket.io default: infinite retries)
 * - Disconnects cleanly on unmount to prevent memory leaks
 *
 * **State Management:**
 * - Returns `null` until connection established (prevents premature event emissions)
 * - Updates to `Socket` instance on successful connection
 * - Resets to `null` on disconnect (allows UI to show reconnecting state)
 *
 * **Environment Configuration:**
 * Requires `.env` variable:
 * ```
 * VITE_SOCKET_URL=http://localhost:3000  # Development
 * VITE_SOCKET_URL=https://api.example.com # Production
 * ```
 *
 * **Reconnection Strategy:**
 * Socket.io handles reconnection automatically with exponential backoff:
 * - Initial delay: 1000ms
 * - Max delay: 5000ms
 * - Randomization factor: 0.5
 *
 * @returns Socket.io client instance when connected, null when disconnected
 *
 * @see {@link https://socket.io/docs/v4/client-options/} Socket.io client options
 * @see {@link server/handlers/socketHandler.js} Server-side event handlers
 */
export const useQuizSocket = (): Socket | null => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket: Socket = io(import.meta.env.VITE_SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('[QuizSocket] [COMPLETE] Connected:', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.warn('[QuizSocket] [ERROR] Disconnected');
      setSocket(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
};







/**
 * SOCKET EVENT HANDLER - Real-Time Game Coordination Logic
 *
 * PURPOSE:
 * This module implements all Socket.io event handlers for the Fundraisely game server.
 * It orchestrates the complete lifecycle of multiplayer game rooms from creation through
 * completion, managing player connections, readiness states, and game phase transitions.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Registers and processes all client-initiated Socket.io events
 * - Enforces game rules and state transitions (lobby -> game -> complete)
 * - Coordinates player synchronization across all connected clients in a room
 * - Manages connection lifecycle (connect, join, disconnect, reconnect)
 * - Provides real-time feedback for all game actions via socket emissions
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Socket.io Events (Received):
 *   - create_room: Host creates new game room with Solana contract address
 *   - join_room: Players join existing room (pre-game lobby)
 *   - toggle_ready: Players signal readiness to start game
 *   - start_game: Host initiates game start (triggers frontend Solana transaction)
 *   - game_over: Host signals game completion (triggers frontend prize distribution)
 *   - disconnect: Automatic cleanup when player connection drops
 *
 * Frontend Socket.io Events (Emitted):
 *   - room_created: Confirms successful room creation
 *   - room_update: Real-time room state broadcast to all players
 *   - game_started: Signals all clients to begin gameplay
 *   - game_ended: Signals game completion with winner data
 *   - *_error: Error feedback for failed operations
 *
 * Solana Program Coordination:
 *   - This handler does NOT interact with Solana blockchain directly
 *   - Room creation includes contractAddress reference for frontend use
 *   - start_game event triggers frontend to submit "start game" transaction
 *   - game_over event triggers frontend to submit "distribute prizes" transaction
 *   - Server validates game state, frontend executes financial transactions
 *
 * KEY RESPONSIBILITIES:
 * 1. Event Registration: Binds all socket events to handler functions
 * 2. Input Validation: Validates all client data before processing
 * 3. Rate Limiting: Prevents abuse using RateLimiter for sensitive operations
 * 4. Room Management: Delegates state changes to RoomManager
 * 5. Authorization: Ensures only hosts can perform privileged actions
 * 6. State Broadcasting: Emits room_update to synchronize all clients
 * 7. Error Handling: Provides descriptive error messages to clients
 * 8. Cleanup: Removes disconnected players and empty rooms
 *
 * DATA FLOW:
 * 1. Client emits Socket.io event (e.g., create_room)
 * 2. Handler validates input and checks rate limits
 * 3. RoomManager updates in-memory state
 * 4. emitRoomUpdate() broadcasts new state to all room participants
 * 5. Frontend receives room_update and re-renders UI
 *
 * RATE LIMITING PATTERN:
 * - Uses per-socket, per-action rate limiting via RateLimiter
 * - create_room: 3 attempts per 60 seconds
 * - join_room: 5 attempts per 30 seconds
 * - Prevents spam and abuse without requiring authentication
 *
 * ROOM MANAGER INTEGRATION:
 * - All state mutations delegate to RoomManager methods
 * - Handler focuses on socket I/O, RoomManager handles game logic
 * - Clean separation: handler = transport layer, manager = business logic
 */

// server/handlers/socketHandler.js
import { RoomManager } from '../managers/RoomManager.js';
import { RateLimiter } from '../utils/rateLimiter.js';

const roomManager = new RoomManager();
const rateLimiter = new RateLimiter();

/**
 * Setup all socket event handlers
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle room creation
    socket.on('create_room', (data) => {
      try {
        // Rate limiting
        if (rateLimiter.isRateLimited(socket.id, 'create_room', 3, 60000)) {
          socket.emit('create_error', { message: 'Too many room creation attempts' });
          return;
        }

        const { roomId, playerName, walletAddress, contractAddress, entryFee } = data;

        // Validate input
        if (!roomId || !walletAddress) {
          socket.emit('create_error', { message: 'Missing required fields' });
          return;
        }

        // Create room
        const room = roomManager.createRoom(
          roomId,
          socket.id,
          walletAddress,
          contractAddress,
          entryFee
        );

        // Add creator as first player
        roomManager.addPlayer(roomId, socket.id, {
          wallet: walletAddress,
          name: playerName || 'Host',
          isHost: true,
        });

        // Join socket room
        socket.join(roomId);

        // Emit success and room state
        socket.emit('room_created', { roomId });
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Create room error:', error);
        socket.emit('create_error', { message: error.message });
      }
    });

    // Handle joining room
    socket.on('join_room', (data) => {
      try {
        // Rate limiting
        if (rateLimiter.isRateLimited(socket.id, 'join_room', 5, 30000)) {
          socket.emit('join_error', { message: 'Too many join attempts' });
          return;
        }

        const { roomId, playerName, walletAddress } = data;

        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit('join_error', { message: 'Room not found' });
          return;
        }

        if (room.gameStarted) {
          socket.emit('join_error', { message: 'Game already started' });
          return;
        }

        // Add player
        roomManager.addPlayer(roomId, socket.id, {
          wallet: walletAddress,
          name: playerName || 'Player',
          isHost: false,
        });

        // Join socket room
        socket.join(roomId);

        // Emit room state
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('join_error', { message: error.message });
      }
    });

    // Handle toggle ready
    socket.on('toggle_ready', ({ roomId }) => {
      try {
        roomManager.toggleReady(roomId, socket.id);
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Toggle ready error:', error);
      }
    });

    // Handle start game
    socket.on('start_game', ({ roomId }) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Verify host
        const player = room.players.get(socket.id);
        if (!player || !player.isHost) {
          socket.emit('error', { message: 'Only host can start game' });
          return;
        }

        roomManager.startGame(roomId);
        io.to(roomId).emit('game_started', { roomId });
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Start game error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle game over
    socket.on('game_over', ({ roomId, winners }) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player || !player.isHost) {
          socket.emit('error', { message: 'Only host can end game' });
          return;
        }

        roomManager.endGame(roomId, winners);
        io.to(roomId).emit('game_ended', { roomId, winners });
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Game over error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);

      // Remove player from all rooms
      for (const room of roomManager.getAllRooms()) {
        if (room.players.has(socket.id)) {
          roomManager.removePlayer(room.roomId, socket.id);
          emitRoomUpdate(io, room.roomId);
        }
      }
    });
  });

  console.log('Socket handlers initialized');
}

/**
 * Emit room update to all clients in room
 */
function emitRoomUpdate(io, roomId) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const serialized = roomManager.serializeRoom(room);
  io.to(roomId).emit('room_update', serialized);
}

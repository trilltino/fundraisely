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

  console.log('✅ Socket handlers initialized');
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

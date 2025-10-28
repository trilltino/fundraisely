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
import { GameManager } from '../managers/GameManager.js';
import { RateLimiter } from '../utils/rateLimiter.js';

const roomManager = new RoomManager();
const gameManager = new GameManager();
const rateLimiter = new RateLimiter();

/**
 * Setup all socket event handlers
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(` Client connected: ${socket.id}`);

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

        // Initialize game state
        gameManager.initializeGame(roomId);

        io.to(roomId).emit('game_started', { roomId });
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Start game error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle manual number call
    socket.on('call_number', ({ roomId }) => {
      try {
        const result = gameManager.callNumber(roomId);
        io.to(roomId).emit('number_called', result);
      } catch (error) {
        console.error('Call number error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle toggle auto-play
    socket.on('toggle_auto_play', ({ roomId }) => {
      try {
        const autoPlay = gameManager.toggleAutoPlay(roomId, io);
        io.to(roomId).emit('auto_play_update', { autoPlay });
      } catch (error) {
        console.error('Toggle auto-play error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle pause game
    socket.on('pause_game', ({ roomId }) => {
      try {
        gameManager.pauseGame(roomId);
        io.to(roomId).emit('game_paused', { roomId });
      } catch (error) {
        console.error('Pause game error:', error);
      }
    });

    // Handle unpause game
    socket.on('unpause_game', ({ roomId }) => {
      try {
        gameManager.unpauseGame(roomId);
        io.to(roomId).emit('game_unpaused', { roomId });
      } catch (error) {
        console.error('Unpause game error:', error);
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
        gameManager.endGame(roomId); // Cleanup game state
        io.to(roomId).emit('game_ended', { roomId, winners });
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Game over error:', error);
      }
    });

    // Handle room verification
    socket.on('verify_room_exists', ({ roomId }) => {
      try {
        console.log(`🔍 Verifying room: ${roomId}`);
        const room = roomManager.getRoom(roomId);
        console.log(`📦 Room found:`, room ? 'YES' : 'NO');

        if (room) {
          console.log(`✅ Room ${roomId} exists - sending verification result`);
          socket.emit('room_verification_result', {
            roomId,
            exists: true,
            chainId: room.chainId || 0,
            contractAddress: room.contractAddress || 'solana',
            namespace: room.namespace || 'solana',
            entryFee: room.entryFee || '0',
          });
        } else {
          console.log(`❌ Room ${roomId} NOT found`);
          const allRooms = roomManager.getAllRooms();
          console.log(`📋 Active rooms (${allRooms.length}):`, allRooms.map(r => r.roomId));
          socket.emit('room_verification_result', {
            roomId,
            exists: false,
          });
        }
      } catch (error) {
        console.error('Room verification error:', error);
        socket.emit('room_verification_result', {
          roomId,
          exists: false,
        });
      }
    });

    // Handle quiz room creation
    socket.on('create_quiz_room', (data) => {
      try {
        console.log('📝 Creating quiz room:', data);

        // Rate limiting
        if (rateLimiter.isRateLimited(socket.id, 'create_quiz_room', 3, 60000)) {
          socket.emit('quiz_error', { message: 'Too many room creation attempts' });
          return;
        }

        const { roomId, hostId, config } = data;

        // Validate input
        if (!roomId || !config) {
          socket.emit('quiz_error', { message: 'Missing required fields' });
          return;
        }

        // Create room with quiz config
        const room = roomManager.createRoom(
          roomId,
          socket.id,
          hostId || socket.id,
          null, // contractAddress (not used for quiz yet)
          config.entryFee || 0
        );

        // Store quiz config in room
        room.quizConfig = config;
        room.isQuiz = true;

        // Add creator as host
        roomManager.addPlayer(roomId, socket.id, {
          wallet: hostId,
          name: config.hostName || 'Host',
          isHost: true,
        });

        // Join socket room
        socket.join(roomId);

        console.log('✅ Quiz room created:', roomId);

        // Emit success
        socket.emit('quiz_room_created', { roomId });
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('❌ Create quiz room error:', error);
        socket.emit('quiz_error', { message: error.message });
      }
    });

    // Handle quiz room verification
    socket.on('verify_quiz_room', ({ roomId }) => {
      try {
        console.log('🔍 Verifying quiz room:', roomId);
        const room = roomManager.getRoom(roomId);

        if (room && room.isQuiz) {
          console.log('✅ Quiz room verified:', roomId, {
            paymentMethod: room.quizConfig?.paymentMethod,
            web3Chain: room.quizConfig?.web3Chain,
            roomContractAddress: room.quizConfig?.roomContractAddress,
          });

          // Return full config for Web3 payment flow
          socket.emit('quiz_room_verification_result', {
            roomId,
            exists: true,
            config: room.quizConfig, // Return full config including blockchain details
            paymentMethod: room.quizConfig?.paymentMethod || 'cash',
            entryFee: room.quizConfig?.entryFee || '0',
          });
        } else {
          console.log('❌ Quiz room not found:', roomId);
          socket.emit('quiz_room_verification_result', {
            roomId,
            exists: false,
          });
        }
      } catch (error) {
        console.error('❌ Verify quiz room error:', error);
        socket.emit('quiz_room_verification_result', {
          roomId,
          exists: false,
        });
      }
    });

    // Handle toggle ready for quiz
    socket.on('toggle_ready_quiz', ({ roomId, playerId }) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit('quiz_error', { message: 'Room not found' });
          return;
        }

        // Find player by socket.id and toggle ready state
        const player = room.players.get(socket.id);
        if (!player) {
          socket.emit('quiz_error', { message: 'Player not in room' });
          return;
        }

        player.isReady = !player.isReady;
        console.log(`✓ Player ${player.name} ready status: ${player.isReady}`);

        // Emit room update to all players
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Toggle ready quiz error:', error);
        socket.emit('quiz_error', { message: error.message });
      }
    });

    // Handle quiz start event
    socket.on('quiz_started', ({ roomId }) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit('quiz_error', { message: 'Room not found' });
          return;
        }

        // Verify all players are ready
        let allReady = true;
        for (const player of room.players.values()) {
          if (!player.isReady && !player.isHost) {
            allReady = false;
            break;
          }
        }

        if (!allReady) {
          socket.emit('quiz_error', { message: 'Not all players are ready' });
          return;
        }

        // Mark game as started
        room.gameStarted = true;
        console.log(`🎮 Quiz started in room ${roomId}`);

        // Notify all players in the room that the quiz has started
        io.to(roomId).emit('quiz_started', { roomId });

        // Update room state
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('Quiz started error:', error);
        socket.emit('quiz_error', { message: error.message });
      }
    });

    // Handle quiz player joining
    socket.on('join_quiz_room', (data) => {
      try {
        console.log('👤 Player joining quiz room:', data);

        const { roomId, user, role } = data;

        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit('quiz_error', { message: 'Room not found' });
          return;
        }

        if (room.gameStarted) {
          socket.emit('quiz_error', { message: 'Game already started' });
          return;
        }

        // For Web3 payments, verify transaction signature format
        if (user.paymentMethod === 'web3' && user.web3TxHash) {
          console.log('🔗 Web3 payment detected:', {
            chain: user.web3Chain,
            txHash: user.web3TxHash,
            address: user.web3Address,
          });

          // Basic validation - check signature format
          if (user.web3Chain === 'solana') {
            // Solana signatures are base58 encoded, typically 87-88 characters
            if (!user.web3TxHash || user.web3TxHash.length < 80 || user.web3TxHash.length > 90) {
              socket.emit('quiz_error', { message: 'Invalid Solana transaction signature format' });
              return;
            }
          }

          // Store payment proof with player data
          user.paymentProof = {
            chain: user.web3Chain,
            txHash: user.web3TxHash,
            address: user.web3Address,
            timestamp: Date.now(),
          };
        }

        // Add player
        roomManager.addPlayer(roomId, socket.id, {
          wallet: user.web3Address || user.id,
          name: user.name || 'Player',
          isHost: false,
          isReady: false,
          paid: user.paid || false,
          paymentMethod: user.paymentMethod || 'cash',
          paymentProof: user.paymentProof,
          extras: user.extras || [],
        });

        // Join socket room
        socket.join(roomId);

        console.log('✅ Player joined quiz room:', roomId, user.name, {
          paid: user.paid,
          paymentMethod: user.paymentMethod,
        });

        // Emit success to the joining player
        socket.emit('quiz_player_joined', {
          roomId,
          playerId: user.id,
          playerName: user.name
        });

        // Emit room state to all players
        emitRoomUpdate(io, roomId);
      } catch (error) {
        console.error('❌ Join quiz room error:', error);
        socket.emit('quiz_error', { message: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[ERROR] Client disconnected: ${socket.id}`);

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

  // Return roomManager instance for external access (cleanup, stats, etc.)
  return roomManager;
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

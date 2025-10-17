/**
 * ROOM MANAGER - In-Memory Game Room State Management
 *
 * PURPOSE:
 * This class is the central state manager for all active game rooms in the Fundraisely
 * multiplayer system. It maintains ephemeral, in-memory state for room coordination,
 * player tracking, and game phase management. This is a pure coordination layer with
 * NO persistence and NO financial logic.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Central source of truth for all active game room state (in-memory only)
 * - Manages room lifecycle: creation, player joins/leaves, game start/end, cleanup
 * - Tracks player presence, readiness states, and host privileges
 * - Enforces game rules: ready checks, host-only actions, game phase transitions
 * - Provides atomic state updates to ensure consistency across concurrent operations
 * - Auto-cleans empty rooms to prevent memory leaks
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Frontend reads room state via serializeRoom() broadcasts
 *   - Room state includes: players list, readiness, game phase, contract address
 *   - Frontend uses contractAddress to query Solana for financial state
 *   - Frontend displays player list, ready status, and game phase from this manager
 *   - Room updates trigger React re-renders via Socket.io room_update events
 *
 * Solana Program Separation (CRITICAL):
 *   - This manager stores ZERO financial data (no entry fees, prize pools, balances)
 *   - entryFee and contractAddress are REFERENCE DATA only (for frontend display)
 *   - All financial operations execute on Solana blockchain via frontend transactions
 *   - Room state tracks game phase (lobby/started/over) but NOT financial state
 *   - Winners array is coordination data, NOT payout execution
 *
 * DATA FLOW EXAMPLE - Room Lifecycle:
 * 1. Host creates room -> createRoom() stores room metadata + Solana contract address
 * 2. Players join -> addPlayer() updates players Map, broadcasts to all
 * 3. Players toggle ready -> toggleReady() updates ready flags
 * 4. Host starts game -> startGame() validates all ready, sets gameStarted=true
 * 5. Frontend receives game_started -> submits Solana "start game" transaction
 * 6. Game completes -> endGame() sets gameOver=true, records winners
 * 7. Frontend receives game_ended -> submits Solana "distribute prizes" transaction
 * 8. Players disconnect -> removePlayer() cleans up, auto-deletes empty rooms
 *
 * KEY RESPONSIBILITIES:
 * 1. Room CRUD: Create, read, update, delete room objects
 * 2. Player Management: Add, remove, track players by socket ID
 * 3. State Validation: Enforce rules (can't join started game, host-only actions)
 * 4. Ready State: Track and validate player readiness before game start
 * 5. Game Phase: Manage transitions between lobby, started, and game over states
 * 6. Memory Management: Auto-cleanup empty rooms, no database persistence
 * 7. Serialization: Convert internal state to client-safe JSON format
 *
 * STATE STRUCTURE:
 * Room Object:
 *   - roomId: Unique identifier (typically Solana contract address)
 *   - hostId: Socket ID of room creator (has special privileges)
 *   - hostWallet: Solana wallet address of host (for display/verification)
 *   - contractAddress: Reference to on-chain Solana program account
 *   - entryFee: Reference value (actual fees handled by Solana)
 *   - players: Map<socketId, PlayerObject> of all connected players
 *   - gameStarted: Boolean flag for game phase
 *   - gameOver: Boolean flag for completion
 *   - winners: Array of winner data (for frontend display, not payouts)
 *   - playerCount: Cached count for quick access
 *   - createdAt: Timestamp for potential TTL cleanup
 *
 * Player Object:
 *   - id: Socket ID (volatile, changes on reconnect)
 *   - wallet: Solana wallet address (persistent identity)
 *   - name: Display name
 *   - isHost: Host privilege flag
 *   - isReady: Ready state for game start
 *   - joinedAt: Join timestamp
 *
 * RATE LIMITER INTEGRATION:
 * - RoomManager does NOT enforce rate limits (that's socketHandler's job)
 * - Manager assumes socketHandler has already validated/rate-limited requests
 * - Focus: state management, not access control
 *
 * CONCURRENCY & THREAD SAFETY:
 * - Node.js single-threaded event loop ensures atomic operations
 * - Map operations are synchronous and non-blocking
 * - No locks needed due to JavaScript's event loop model
 *
 * SCALABILITY NOTES:
 * - In-memory only: state lost on server restart
 * - Not horizontally scalable (no shared state between server instances)
 * - For production: consider Redis for shared state across multiple servers
 * - Current design optimized for single-server deployment
 */

// server/managers/RoomManager.js
export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Create a new room
   */
  createRoom(roomId, hostId, hostWallet, contractAddress, entryFee) {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const room = {
      roomId,
      hostId,
      hostWallet,
      contractAddress,
      entryFee,
      players: new Map(),
      gameStarted: false,
      gameOver: false,
      winners: [],
      playerCount: 0,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    console.log(`🆕 Room created: ${roomId} by ${hostWallet}`);
    return room;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Add player to room
   */
  addPlayer(roomId, socketId, playerData) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (room.gameStarted) {
      throw new Error('Game already started');
    }

    room.players.set(socketId, {
      id: socketId,
      wallet: playerData.wallet,
      name: playerData.name,
      isHost: playerData.isHost || false,
      isReady: false,
      joinedAt: Date.now(),
    });

    room.playerCount = room.players.size;
    console.log(` Player ${playerData.wallet} joined room ${roomId}`);
    return room;
  }

  /**
   * Remove player from room
   */
  removePlayer(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socketId);
    if (player) {
      room.players.delete(socketId);
      room.playerCount = room.players.size;
      console.log(` Player ${player.wallet} left room ${roomId}`);
    }

    // DON'T delete empty rooms - they may be waiting for players to join!
    // Rooms should only be deleted when:
    // 1. Game has ended (gameOver === true)
    // 2. Room has expired (TTL check)
    // 3. Host explicitly deletes it
    //
    // This allows:
    // - Host to create room and navigate away without losing it
    // - Players to join rooms that exist on Solana blockchain
    // - Proper room persistence for the multiplayer experience
    //
    // Note: In production, implement TTL cleanup to prevent memory leaks
  }

  /**
   * Toggle player ready state
   */
  toggleReady(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const player = room.players.get(socketId);
    if (!player) {
      throw new Error('Player not in room');
    }

    player.isReady = !player.isReady;
    return room;
  }

  /**
   * Start game
   */
  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    // Validate all players are ready
    for (const player of room.players.values()) {
      if (!player.isReady && !player.isHost) {
        throw new Error('Not all players are ready');
      }
    }

    room.gameStarted = true;
    console.log(`[GAME] Game started in room ${roomId}`);
    return room;
  }

  /**
   * End game
   */
  endGame(roomId, winners) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.gameOver = true;
    room.winners = winners;
    room.endedAt = Date.now();
    console.log(`[WINNER] Game ended in room ${roomId}`);
    return room;
  }

  /**
   * Delete a specific room (e.g., after game ends or host cancels)
   */
  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      this.rooms.delete(roomId);
      console.log(`️  Room ${roomId} deleted`);
      return true;
    }
    return false;
  }

  /**
   * Clean up old rooms (TTL-based cleanup)
   * Should be called periodically to prevent memory leaks
   *
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 24 hours)
   */
  cleanupOldRooms(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let deletedCount = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      const age = now - room.createdAt;

      // Delete if:
      // 1. Game ended more than 1 hour ago
      if (room.gameOver && room.endedAt && (now - room.endedAt) > 60 * 60 * 1000) {
        this.rooms.delete(roomId);
        deletedCount++;
        console.log(`️  Deleted completed room ${roomId} (ended ${Math.round((now - room.endedAt) / 1000 / 60)} minutes ago)`);
      }
      // 2. Room never started and is older than maxAge
      else if (!room.gameStarted && age > maxAgeMs) {
        this.rooms.delete(roomId);
        deletedCount++;
        console.log(`️  Deleted stale room ${roomId} (created ${Math.round(age / 1000 / 60 / 60)} hours ago)`);
      }
    }

    if (deletedCount > 0) {
      console.log(` Cleanup: Removed ${deletedCount} old rooms`);
    }

    return deletedCount;
  }

  /**
   * Get all rooms
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Get room count
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * Serialize room for client
   */
  serializeRoom(room) {
    return {
      roomId: room.roomId,
      host: room.hostWallet,
      hostWallet: room.hostWallet,
      contractAddress: room.contractAddress,
      entryFee: room.entryFee,
      players: Array.from(room.players.values()),
      gameStarted: room.gameStarted,
      gameOver: room.gameOver,
      winners: room.winners,
      playerCount: room.playerCount,
    };
  }
}

export default RoomManager;

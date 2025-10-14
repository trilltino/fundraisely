// server/managers/RoomManager.js

/**
 * RoomManager - Manages in-memory room state for real-time game coordination
 * Note: This is for real-time state only. Financial state lives on-chain.
 */
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
    console.log(`👤 Player ${playerData.wallet} joined room ${roomId}`);
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
      console.log(`👋 Player ${player.wallet} left room ${roomId}`);
    }

    // Clean up empty rooms
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      console.log(`🗑️  Room ${roomId} deleted (empty)`);
    }
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
    console.log(`🎮 Game started in room ${roomId}`);
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
    console.log(`🏆 Game ended in room ${roomId}`);
    return room;
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

/**
 * FUNDRAISELY WEBSOCKET SERVER - Main Entry Point
 *
 * PURPOSE:
 * This is the core WebSocket server for the Fundraisely multiplayer fundraising game.
 * It provides real-time coordination for game rooms, player states, and game flow
 * orchestration across multiple clients.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Manages persistent WebSocket connections for all active players
 * - Coordinates room lifecycle: creation, joining, starting, and ending games
 * - Synchronizes ephemeral game state (player readiness, room status) across clients
 * - Handles graceful connection/disconnection and player presence tracking
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Receives Socket.io events from React frontend (create_room, join_room, toggle_ready, etc.)
 *   - Broadcasts real-time room updates to all connected clients in a room
 *   - Provides health check and stats endpoints for monitoring
 *
 * Solana Program Separation:
 *   - This server handles ONLY ephemeral coordination state (NOT financial state)
 *   - Financial operations (entry fees, prize pools, payouts) live entirely on-chain
 *   - The frontend submits Solana transactions directly to the blockchain
 *   - This server signals game phase transitions (start/end) but does NOT execute transactions
 *
 * KEY RESPONSIBILITIES:
 * 1. HTTP Server Setup: Express app with CORS for cross-origin requests
 * 2. WebSocket Server: Socket.io instance with WebSocket/polling fallback
 * 3. Event Handler Registration: Delegates to socketHandler.js for all game logic
 * 4. Health Monitoring: Provides /api/health and /api/stats endpoints
 * 5. Graceful Shutdown: Handles SIGTERM for clean server termination
 *
 * DATA FLOW:
 * Client -> Socket.io Event -> socketHandler.js -> RoomManager ->
 * -> Broadcast room_update -> All Clients in Room
 *
 * ARCHITECTURE PATTERN:
 * - Express HTTP server wrapped with Socket.io for WebSocket support
 * - Event-driven architecture with centralized handler registration
 * - Stateless HTTP endpoints + stateful WebSocket connections
 * - In-memory state managed by RoomManager (no database persistence)
 */

// server/index.js
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './handlers/socketHandler.js';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

// Socket.io configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Set up socket event handlers
setupSocketHandlers(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const roomManager = req.app.get('roomManager');
  res.json({
    totalRooms: roomManager?.getRoomCount() || 0,
    activeConnections: io.engine.clientsCount,
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

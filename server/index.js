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

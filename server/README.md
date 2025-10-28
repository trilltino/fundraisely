# WebSocket Server

This directory contains the Node.js WebSocket server for real-time game coordination.

## Overview

The WebSocket server is the **central coordinator** for all real-time multiplayer game functionality in Fundraisely. It manages:
- Room creation and joining
- Player connections and disconnections
- Number calling for Bingo games
- Question distribution for Quiz games
- Winner verification and announcements
- Game state synchronization across all connected clients

**Technology Stack:**
- **Node.js** - JavaScript runtime
- **Express** - HTTP server framework
- **Socket.io** - WebSocket library for real-time bidirectional communication
- **CORS** - Cross-origin resource sharing for frontend communication

## Architecture

```
server/
├── index.js                    # Server entry point and configuration
├── handlers/
│   └── socketHandler.js        # WebSocket event handlers
├── .env                        # Environment variables (gitignored)
├── .env.example                # Environment template (safe to commit)
└── package.json                # Server dependencies
```

## Why a WebSocket Server?

**Blockchain Limitations:**
Solana smart contracts handle **financial** operations (payments, prize distribution), but **cannot** handle:
- Real-time event broadcasting (e.g., "number called")
- Ephemeral game state (current number, player ready status)
- Sub-second coordination (auto-play every 3 seconds)
- Player presence (connected/disconnected)

**Solution:** WebSocket server manages **game coordination**, while blockchain manages **money**.

**Division of Responsibilities:**

| Concern | Handled By | Reason |
|---------|------------|--------|
| Entry fee payment | Blockchain | Financial transaction, needs transparency |
| Prize distribution | Blockchain | Financial transaction, trustless |
| Room metadata | Blockchain | Permanent record, verification |
| Number calling | WebSocket | Real-time, ephemeral, high frequency |
| Player ready status | WebSocket | Ephemeral, changes frequently |
| Winner verification | WebSocket | Instant feedback, then blockchain claim |
| Player chat (future) | WebSocket | Real-time, ephemeral |

## Server Files

### index.js
**Server entry point** - Initializes Express and Socket.io.

**Responsibilities:**
- Create HTTP server with Express
- Attach Socket.io to server
- Configure CORS for frontend communication
- Set up WebSocket connection handling
- Start server on configured port

**Key Configuration:**
```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:5173', // Vite dev server
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

**Port:** 3001 (configurable via environment variable)

**Startup:**
```bash
node server/index.js
```

---

### handlers/socketHandler.js
**WebSocket event handlers** - Core game coordination logic.

**Responsibilities:**
- Handle client connections and disconnections
- Manage room state (in-memory storage)
- Process game events (create room, join room, call number, etc.)
- Broadcast updates to all players in a room
- Validate actions (e.g., only host can call numbers)

**In-Memory Data Structure:**
```javascript
const rooms = {
  'ROOM123': {
    id: 'ROOM123',
    host: 'socket-id-1',
    players: [
      { id: 'socket-id-1', name: 'Alice', isHost: true, ready: true },
      { id: 'socket-id-2', name: 'Bob', isHost: false, ready: false }
    ],
    gameState: 'waiting', // waiting | playing | paused | ended
    calledNumbers: [5, 12, 23],
    currentNumber: 23,
    isPaused: false,
    lineWinners: [],
    fullHouseWinners: [],
    lineWinClaimed: false,
    // ... more state
  }
};
```

**Key Events Handled:**

#### Bingo Events

**Room Management:**
- `create_room` - Host creates a new room
  - Validates host connection
  - Generates unique room code (6 chars)
  - Initializes room state
  - Adds host to room
  - Emits `room_created` to host

- `join_room` - Player joins existing room
  - Validates room exists
  - Checks room not full
  - Adds player to room
  - Broadcasts `player_joined` to all players in room

- `leave_room` - Player leaves room
  - Removes player from room
  - If host leaves, assigns new host or closes room
  - Broadcasts `player_left` to remaining players

**Gameplay:**
- `call_number` - Host calls a Bingo number
  - Validates caller is host
  - Validates number not already called (1-75)
  - Updates room state (calledNumbers, currentNumber)
  - Broadcasts `number_called` to all players

- `toggle_auto_play` - Host toggles auto-play mode
  - Starts/stops auto-play timer (calls number every 3 seconds)
  - Broadcasts `auto_play_toggled` to all players

- `pause_game` - Host pauses the game
  - Sets isPaused = true
  - Stops auto-play
  - Broadcasts `game_paused` to all players

- `unpause_game` - Host resumes the game
  - Sets isPaused = false
  - Resumes auto-play if was active
  - Broadcasts `game_unpaused` to all players

**Winner Management:**
- `claim_line_win` - Player claims line win
  - Validates player has winning line
  - Adds player to lineWinners
  - Broadcasts `line_winner_declared` to all players
  - Sets lineWinClaimed = true

- `claim_full_house_win` - Player claims full house
  - Validates player has full house (all 25 numbers marked)
  - Adds player to fullHouseWinners
  - Broadcasts `full_house_winner_declared` to all players
  - Ends game (gameState = 'ended')

**Player Status:**
- `toggle_ready` - Player toggles ready status
  - Updates player ready state
  - Broadcasts `player_ready_changed` to all players

- `start_game` - Host starts the game
  - Validates all players are ready
  - Sets gameState = 'playing'
  - Broadcasts `game_started` to all players

#### Quiz Events

- `create_quiz` - Host creates quiz
- `join_quiz` - Player joins quiz
- `start_quiz` - Host starts quiz
- `submit_answer` - Player submits answer
- `purchase_lifeline` - Player buys lifeline
- `next_question` - Host advances to next question
- `end_quiz` - Host ends quiz

---

## Real-Time Communication Flow

### Example: Calling a Bingo Number

1. **Host clicks "Call Number" button** in frontend
2. **Frontend emits** `call_number` event via Socket.io
3. **Server receives** event in `socketHandler.js`
4. **Server validates**:
   - Caller is host of the room
   - Room is in 'playing' state
   - Number not already called
5. **Server updates** room state:
   - Add number to calledNumbers array
   - Set currentNumber to new number
6. **Server broadcasts** `number_called` event to **all players** in room
7. **All clients receive** event and update UI:
   - Display new number
   - Update number history
   - Enable marking on cards (if number on card)

**Code Flow:**
```
Frontend: socket.emit('call_number', { roomId, number })
  ↓
Server: io.on('call_number', (data) => { ... })
  ↓
Server: rooms[roomId].calledNumbers.push(number)
  ↓
Server: io.to(roomId).emit('number_called', { number, calledNumbers })
  ↓
All Clients: socket.on('number_called', (data) => { updateUI(data) })
```

---

## Room State Management

**In-Memory Storage:**
All room state is stored in-memory (JavaScript object). This means:
- ✅ **Fast**: No database queries
- ✅ **Simple**: No ORM or schemas
- ❌ **Ephemeral**: State lost on server restart
- ❌ **Single Server**: No multi-server support (yet)

**Future Enhancement:** Persistent storage (Redis, MongoDB) for:
- Room recovery after server restart
- Multi-server load balancing
- Historical game data

---

## Auto-Play Implementation

**Auto-Play** is a server-side timer that automatically calls Bingo numbers every 3 seconds.

**Implementation:**
```javascript
const autoPlayTimers = {};

function startAutoPlay(roomId) {
  autoPlayTimers[roomId] = setInterval(() => {
    const room = rooms[roomId];
    if (room.isPaused) return; // Skip if paused

    const uncalledNumbers = getUncalledNumbers(room);
    if (uncalledNumbers.length === 0) {
      stopAutoPlay(roomId); // All numbers called
      return;
    }

    const randomNumber = uncalledNumbers[Math.floor(Math.random() * uncalledNumbers.length)];
    callNumber(roomId, randomNumber);
  }, 3000);
}

function stopAutoPlay(roomId) {
  if (autoPlayTimers[roomId]) {
    clearInterval(autoPlayTimers[roomId]);
    delete autoPlayTimers[roomId];
  }
}
```

**Features:**
- Calls number every 3 seconds
- Respects pause state
- Stops when all numbers called
- Stops when host toggles off

---

## Connection Management

**Connection Lifecycle:**
1. **Client connects**: Socket.io establishes connection
2. **Client joins room**: Emits `join_room` with room code
3. **Client receives updates**: Listens to room events
4. **Client disconnects**: Socket.io detects disconnect
5. **Server cleans up**: Removes player from room, broadcasts `player_left`

**Reconnection Handling:**
Socket.io automatically handles reconnections with exponential backoff. When a client reconnects:
- Client re-emits `join_room` to rejoin
- Server adds client back to room
- Client receives current game state

---

## Environment Configuration

### .env.example
Template for environment variables (safe to commit):

```env
# The Giving Block API Key (for charity search)
TGB_API_KEY=your_api_key_here

# Server Port
PORT=3001

# CORS Origin (frontend URL)
CORS_ORIGIN=http://localhost:5173

# Log Level
RUST_LOG=info
```

### .env
Actual environment variables (gitignored):

```env
TGB_API_KEY=actual_api_key_here
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

---

## Running the Server

### Development

**Option 1: Run server independently**
```bash
cd server
node index.js
```

**Option 2: Run with frontend (recommended)**
```bash
# From project root
npm run dev
# This runs: concurrently "vite" "npm run server"
```

### Production

```bash
# Install dependencies
cd server
npm install

# Start server
NODE_ENV=production node index.js
```

**Production Considerations:**
- Use process manager (PM2, systemd)
- Enable logging (Winston, Bunyan)
- Add monitoring (Datadog, New Relic)
- Set up health checks
- Configure rate limiting
- Enable compression
- Use reverse proxy (Nginx)

---

## Error Handling

The server handles errors gracefully:

**Socket Errors:**
```javascript
socket.on('error', (error) => {
  console.error('[Socket Error]', error);
  socket.emit('error', { message: 'An error occurred' });
});
```

**Room Validation:**
```javascript
if (!rooms[roomId]) {
  socket.emit('error', { message: 'Room not found' });
  return;
}
```

**Permission Checks:**
```javascript
if (socket.id !== room.host) {
  socket.emit('error', { message: 'Only host can perform this action' });
  return;
}
```

---

## Security Considerations

**Current Implementation:**
- CORS configured for frontend origin
- Basic validation on events
- No authentication (trust wallet signatures from blockchain)

**Production Recommendations:**
- [ ] Add rate limiting (socket.io-rate-limiter)
- [ ] Validate room codes (prevent enumeration)
- [ ] Add authentication (JWT tokens)
- [ ] Sanitize user inputs (player names, messages)
- [ ] Add request size limits
- [ ] Enable HTTPS/WSS (secure WebSockets)
- [ ] Add DDoS protection (Cloudflare, AWS Shield)

---

## Testing

**Manual Testing:**
1. Start server: `npm run server`
2. Open multiple browser tabs with frontend
3. Create room in tab 1 (host)
4. Join room in tabs 2-3 (players)
5. Test gameplay: call numbers, claim wins, etc.

**Future: Automated Testing**
- Unit tests for event handlers (Jest)
- Integration tests for room flow (Socket.io client)
- Load testing (Artillery, k6)

---

## Logging

**Current:**
Console logs for debugging:
```javascript
console.log('[Socket] Client connected:', socket.id);
console.log('[Room] Created room:', roomId);
console.log('[Game] Number called:', number);
```

**Production:**
Use structured logging library (Winston):
```javascript
logger.info('Client connected', { socketId: socket.id });
logger.info('Room created', { roomId, hostId });
logger.info('Number called', { roomId, number });
```

---

## Performance Notes

**Scalability:**
- Current: Single server, in-memory state
- Supports: ~100-1000 concurrent users
- Bottleneck: Memory (room state), CPU (broadcasting)

**Future Optimizations:**
- [ ] Use Redis for shared state (multi-server)
- [ ] Implement room sharding (distribute rooms across servers)
- [ ] Add caching (frequently accessed data)
- [ ] Use WebSocket compression
- [ ] Implement pub/sub for broadcasts (Redis Pub/Sub)

---

## Integration with Frontend

**Frontend Socket Hook:**
```typescript
// src/hooks/useSocket.ts
import { io, Socket } from 'socket.io-client';

export function useSocket(roomId: string): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket'],
      reconnection: true,
    });

    newSocket.emit('join_room', { roomId });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  return socket;
}
```

**Usage in Component:**
```typescript
const socket = useSocket(roomId);

// Emit event
socket?.emit('call_number', { roomId, number: 42 });

// Listen to event
useEffect(() => {
  socket?.on('number_called', (data) => {
    console.log('Number called:', data.number);
  });
}, [socket]);
```

---

## Integration with Blockchain

The WebSocket server **does not directly interact** with the Solana blockchain. Instead:

1. **Frontend handles blockchain transactions**:
   - Create room → Blockchain transaction (initialize_room)
   - Join room → Blockchain transaction (join_room)
   - Claim prize → Blockchain transaction (claim_prize)

2. **Frontend emits socket events after successful transactions**:
   ```typescript
   // Create room on blockchain
   await program.methods.initializeRoom(...).rpc();

   // Then notify server via WebSocket
   socket.emit('create_room', { roomId, host, ... });
   ```

3. **Server manages ephemeral game state** only:
   - No financial data
   - No blockchain calls
   - Just coordination and real-time updates

**Why this separation?**
- **Security**: Server cannot access wallets or sign transactions
- **Simplicity**: Server doesn't need Solana dependencies
- **Scalability**: Server focuses on real-time communication

---

## Related Documentation

- [Frontend Architecture](../src/README.md)
- [Bingo Components](../src/components/bingo/README.md)
- [Quiz Components](../src/components/Quiz/README.md)
- [useSocket Hook](../src/hooks/useSocket.ts)
- [Solana Program](../solana-program/README.md)

---

## Future Enhancements

- [ ] Persistent storage (Redis, MongoDB)
- [ ] Multi-server support (horizontal scaling)
- [ ] Authentication and authorization
- [ ] Rate limiting and DDoS protection
- [ ] Structured logging (Winston)
- [ ] Monitoring and alerting (Datadog, Prometheus)
- [ ] Chat functionality (player messaging)
- [ ] Admin dashboard (view all rooms, kick players)
- [ ] Analytics (game statistics, player behavior)
- [ ] Replay system (record and replay games)

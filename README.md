# Fundraisely

A decentralized fundraising platform built on Solana that combines gaming with charitable giving. Players participate in Bingo and Quiz games with entry fees that automatically distribute to charities, hosts, and winners through smart contracts.

## Overview

Fundraisely enables transparent, trustless fundraising through blockchain-enforced fund distribution. The platform supports multiple game modes with configurable prize structures while ensuring a minimum 40% allocation to charitable causes.

## Architecture

### Backend (Node.js + Rust)

**WebSocket Server (Port 3001)**
- Real-time game coordination
- Room and player state management
- Game phase orchestration
- Number calling system
- Winner declaration
- Rate limiting and security

**HTTP Server (Port 3002)**
- Charity search via The Giving Block API
- Donation address resolution
- Health monitoring
- CORS handling

### Frontend (React + TypeScript)

**Pages**
- Landing page
- Bingo game room
- Quiz challenge hub
- Quiz waiting room
- Quiz gameplay
- Pitch deck presentation

**Core Components**
- Bingo card (5x5 grid)
- Number caller
- Player roster
- Game controls
- Win effects
- Quiz wizard (8-step creation)
- Host dashboard
- Wallet integration

**State Management**
- Zustand stores for game state
- Socket connection management
- Player and room data
- UI state
- Quiz configuration

### Solana Program (Anchor/Rust)

**On-chain smart contract**
- Program ID: DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
- Deployed on Solana Devnet
- Handles all financial transactions
- Enforces economic constraints
- Trustless fund distribution

## Features

### Backend Features

**Room Management**
- Room creation with host assignment
- Player joining with validation
- Ready status tracking
- Game phase transitions
- Room expiration and cleanup
- Memory management with TTL

**Game Logic**
- Bingo number pool (1-75)
- Manual and automatic number calling
- Auto-play with 3-second intervals
- Pause and resume functionality
- Win detection and verification
- Host-only action enforcement

**Real-time Communication**
- Socket.io event handling
- Room state broadcasting
- Player synchronization
- Disconnection handling
- Error propagation

**Security**
- Rate limiting (3 room creates/60s, 5 joins/30s)
- Input validation
- Host verification
- Game phase validation
- API key protection

**Charity Integration**
- Search charities by name
- Retrieve donation addresses
- Support for multiple tokens
- The Giving Block API integration

### Frontend Features

**Bingo Game**
- 5x5 interactive card
- Live number calling
- Called numbers history
- Auto-play toggle
- Manual number calling
- Pause/unpause controls
- Line and full house detection
- Win celebrations with confetti
- Multi-winner support
- Dynamic prize pool calculation
- Entry fee configuration
- Max players: 1000 / entry_fee

**Prize Distribution (Bingo)**
- Total Intake = Real Players × Entry Fee
- Host Reward: 25% of total intake
- Player Pool: 60% of total intake
- Line Prize: 30% of player pool
- Full House Prize: 70% of player pool

**Quiz Game**
- 8-step creation wizard
- Host and player workflows
- Multiple choice questions
- Text input answers
- Countdown timer
- Auto-submission
- Immediate feedback
- Round transitions
- Clue/lifeline system
- Team-based mode
- Cash or Web3 payment
- Fundraising extras (hints, extra time, second chances)
- Payment reconciliation

**Wallet Integration**
- Solana Wallet Adapter
- Multiple wallet support (Phantom, Magic Eden, etc.)
- Balance display
- USDC minting (testnet)
- Transaction signing
- SPL token transfers

**User Experience**
- Responsive design (mobile, tablet, desktop)
- Framer Motion animations
- Real-time state synchronization
- Navigation guards
- Access control
- Error boundaries
- Toast notifications
- Modal dialogs
- Loading states

### Solana Program Features

**Instructions**
- initialize: Platform setup
- initialize_token_registry: Token allowlist setup
- add_approved_token: Add allowed SPL token
- remove_approved_token: Remove allowed token
- init_pool_room: Create pool-based room
- init_asset_room: Create asset-based room
- add_prize_asset: Deposit prize tokens
- join_room: Player entry
- declare_winners: Winner declaration
- end_room: Fund distribution
- recover_room: Abandoned room recovery

**Room Types**

**Pool Room**
- Prizes calculated from entry fee pool
- Entry fee distribution:
  - Platform: 20% (fixed)
  - Host: 0-5% (configurable)
  - Prize Pool: 0-35% (configurable)
  - Charity: 40%+ (remainder, enforced minimum)
- Extras: 100% to charity
- Prize split among 1-3 winners

**Asset Room**
- Prizes are pre-deposited SPL tokens
- Host deposits 1-3 prize tokens before players join
- Entry fee distribution:
  - Platform: 20% (fixed)
  - Host: 0-5% (configurable)
  - Charity: 75-80% (remainder)
- Winners receive pre-escrowed tokens
- Higher charity allocation than pool rooms

**Economic Constraints**
- Minimum 40% to charity (pool rooms)
- Maximum 5% host fee
- Maximum 35% prize pool
- Prize distribution must sum to 100%
- All math enforced on-chain

**Account Types**
- GlobalConfig: Platform configuration
- TokenRegistry: Approved SPL tokens
- Room: Game instance state
- PlayerEntry: Player receipt
- RoomVault: Token escrow
- PrizeAsset: Asset room prizes

**Security Features**
- PDA-based account derivation
- Reentrancy protection
- Checked arithmetic (overflow/underflow prevention)
- Token mint and owner verification
- Duplicate join prevention
- Emergency pause capability
- Host cannot be winner
- Room expiration enforcement

**Events**
- RoomCreated
- PlayerJoined
- WinnersDeclared
- RoomEnded

**Validation**
- Token approval allowlist
- Entry fee validation
- Max players: 1-1000
- Room capacity checking
- Room expiration checking
- Economic constraint validation
- Winner verification

## Technology Stack

**Frontend**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Zustand (state management)
- React Query
- Socket.io Client
- Solana Wallet Adapter
- Anchor (Solana integration)

**Backend**
- Node.js
- Socket.io
- Rust (Axum framework)
- The Giving Block API

**Blockchain**
- Solana (Devnet)
- Anchor Framework
- SPL Token Program
- Solana Web3.js

## Project Structure

```
fundraisely/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── bingo/               # Bingo game components
│   │   ├── Quiz/                # Quiz game components
│   │   ├── wallet/              # Wallet components
│   │   ├── landing/             # Landing page sections
│   │   ├── layout/              # Headers and footers
│   │   └── common/              # Shared components
│   ├── pages/                   # Route pages
│   ├── hooks/                   # Custom React hooks
│   ├── stores/                  # Zustand state stores
│   ├── services/                # API clients and utilities
│   ├── chains/solana/           # Solana integration
│   ├── lib/solana/              # Solana utilities
│   ├── types/                   # TypeScript types
│   └── idl/                     # Anchor IDL files
├── server/                      # Node.js WebSocket server
│   ├── handlers/                # Socket event handlers
│   ├── managers/                # Game and room managers
│   └── utils/                   # Rate limiting, verification
├── backend/                     # Rust HTTP server
│   └── src/
│       ├── handlers/            # API request handlers
│       ├── services/            # The Giving Block client
│       ├── models/              # Data models
│       ├── routes/              # Route configuration
│       ├── middleware/          # CORS and middleware
│       └── config/              # Environment config
└── solana-program/fundraisely/  # Anchor program
    └── programs/fundraisely/
        └── src/
            ├── instructions/    # Program instructions
            │   ├── admin/      # Admin operations
            │   ├── room/       # Room creation
            │   ├── asset/      # Asset room operations
            │   ├── player/     # Player operations
            │   └── game/       # Game operations
            ├── state/          # Account structures
            ├── events.rs       # Event definitions
            └── errors.rs       # Error codes
```

## Game Flows

### Bingo (Pool Room)

1. Host creates room with entry fee
2. Players join with entry payment
3. Host starts game when ready
4. Numbers called automatically or manually
5. Players mark their cards
6. Line winner(s) declared
7. Full house winner declared
8. Funds distributed automatically via smart contract
9. Game ends

### Bingo (Asset Room)

1. Host creates asset room specifying prizes
2. Host deposits prize tokens to escrow
3. Room opens when all prizes deposited
4. Players join with entry payment
5. Game proceeds as normal
6. Winners receive pre-deposited prize tokens
7. Entry fees distributed (higher charity %)

### Quiz

1. Host creates quiz via 8-step wizard
2. Players join via room code
3. Host starts quiz
4. Questions displayed with countdown
5. Players submit answers
6. Immediate feedback shown
7. Round transitions
8. Final results displayed
9. Payment reconciliation

## Setup and Installation

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Solana CLI 1.18+
- Anchor CLI 0.29+
- Git

### Environment Variables

Create `.env` file:

```
TGB_API_KEY=your_giving_block_api_key
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
```

### Installation

```bash
# Install dependencies
npm install

# Build Solana program
cd solana-program/fundraisely
anchor build

# Run development servers
npm run dev          # Frontend (port 5173)
npm run server       # WebSocket (port 3001)
npm run backend      # HTTP API (port 3002)
```

## API Reference

### WebSocket Events (Port 3001)

**Client to Server**
- create_room: Create new game room
- join_room: Join existing room
- toggle_ready: Toggle ready status
- start_game: Begin game (host only)
- call_number: Call next number (host only)
- toggle_auto_play: Enable/disable auto-play (host only)
- pause_game: Pause game (host only)
- unpause_game: Resume game (host only)
- game_over: End game (host only)
- verify_room_exists: Check room existence

**Server to Client**
- room_created: Room creation confirmed
- room_update: Room state changed
- game_started: Game began
- number_called: New number called
- auto_play_update: Auto-play toggled
- game_paused: Game paused
- game_unpaused: Game resumed
- game_ended: Game finished
- room_verification_result: Room verification response
- error: Error occurred

### HTTP Endpoints (Port 3002)

**GET /api/charities?q=search_term**
- Search charities by name
- Returns: Array of charity objects

**GET /api/charities/:charity_id/address/:token**
- Get donation address for charity
- Returns: Donation address object

**GET /health**
- Health check
- Returns: "OK"

### Solana Program Instructions

See IDL at `src/idl/fundraisely.json` for complete interface.

## Error Handling

**Frontend**
- Error boundary for React errors
- Access control validation
- Socket disconnection handling
- Transaction error messages
- Form validation

**Backend**
- Rate limit exceeded
- Room not found
- Invalid room status
- Unauthorized actions
- Emergency pause active

**Solana Program**
- 36 custom error codes
- Token not approved
- Economic constraint violations
- Room status violations
- Invalid winners
- Arithmetic overflow/underflow

## Development

### Running Tests

```bash
# Frontend tests
npm test

# Solana program tests
cd solana-program/fundraisely
anchor test
```

### Building for Production

```bash
# Build frontend
npm run build

# Build Solana program
cd solana-program/fundraisely
anchor build
```

## Deployment

### Solana Program

```bash
anchor deploy
```

### Frontend

```bash
npm run build
# Deploy dist/ folder to hosting service
```

### Backend Servers

Deploy Node.js and Rust servers to your preferred hosting platform.

## Security Considerations

- Private keys never exposed to frontend
- All financial transactions on-chain
- Rate limiting prevents spam
- Emergency pause for critical issues
- Host cannot be winner
- Minimum charity allocation enforced
- Token allowlist prevents unauthorized tokens
- PDA-based accounts prevent forgery

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]

## Support

[Your Support Information Here]

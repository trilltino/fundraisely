# Fundraisely - Blockchain-Powered Fundraising Platform

## Overview

Fundraisely is a decentralized fundraising platform built on Solana blockchain that combines competitive gaming with charitable giving. The platform enables transparent, trustless fundraising through blockchain-enforced fund distribution.

**Mission**: A world where fundraising is fun, fair, and fraud-proof.

## Core Features

### Game Modes

**Bingo Game**
- Traditional 5x5 Bingo cards with 75-number pool
- Real-time multiplayer support
- Manual or automatic number calling (auto-play every 3 seconds)
- Two win types: Line win (5 in a row) and Full House (all 25 cells)
- Host controls: start, pause, unpause, and end game
- Live player tracking with ready status
- WebSocket-based real-time coordination

**Quiz Game**
- Multi-round quiz competitions with customizable settings
- 8-step wizard for room creation
- Configurable rounds, questions per round, and time limits
- Support for media content (images, videos) in questions
- Team-based or individual scoring modes
- Predefined templates: Pub Quiz, Speed Quiz, and more
- Real-time scoring and leaderboards

### Fundraising Mechanics

**Entry Fees**
- Configurable entry fee per game
- Funds locked in smart contract escrow (Room Vault)
- Automatic distribution upon game completion
- Support for multiple SPL tokens (USDC, SOL, GLOUSD, XLM)

**Fund Distribution**
- Platform fee: 20% (fixed)
- Host fee: 0-5% (configurable)
- Prize pool: 0-35% (configurable)
- Charity: 40% minimum (guaranteed by smart contract)
- All distributions executed atomically on-chain

**Fundraising Extras (Quiz Mode)**
- Buy hints: Reveal answer hints during gameplay
- Extra time: Add 10 seconds to answer timer
- Lifeline: 50/50 option to eliminate wrong answers
- Media reveal: Show image clues early
- Second chance: Re-answer after wrong answer
- Sponsored questions: Bonus points opportunities
- 100% of extras revenue goes directly to charity

### Blockchain Integration

**Solana Smart Contract**
- Program ID: DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
- Built with Anchor framework (Rust)
- Deployed on Devnet with mainnet support
- Trustless fund distribution
- Immutable audit trail of all transactions
- PDA-based account architecture for security

**Smart Contract Instructions**
- `initialize`: One-time admin setup of global configuration
- `init_pool_room`: Host creates fundraising room with fee structure
- `join_room`: Players join by paying entry fee
- `declare_winners`: Host declares 1-3 winners before distribution
- `end_room`: Executes atomic fund distribution to all parties

**Security Features**
- PDA-based accounts prevent signature forgery
- Reentrancy protection
- Token validation (mint and owner verification)
- Arithmetic safety with checked math
- 40% charity minimum enforced at contract level
- Host cannot be winner (prevents self-dealing)

### Payment Methods

**Web3 (Blockchain)**
- Solana wallet integration
- SPL token payments (USDC, SOL, etc.)
- Automatic trustless distribution via smart contract
- Transaction signature verification
- On-chain payment proof

**Web2 (Traditional)**
- Cash payments
- Revolut integration
- Manual fund collection
- Suitable for non-crypto users

### Charity Integration

**The Giving Block (TGB) API**
- Search verified charities from TGB directory
- Automatic donation wallet address generation
- Tax receipt creation for donors
- Support for custom charity wallet addresses
- Donation intent tracking

**Compliance & Transparency**
- Minimum 40% allocation to charity (enforced by smart contract)
- Complete audit trail on blockchain
- Regulatory compliance tracking
- License and regulatory enforcement
- Transparent fund allocation verification

## Technology Stack

### Frontend
- React 18.3.1 with TypeScript 5.8
- Vite 5.4.2 (build tool)
- Zustand 4.5.7 (state management)
- Socket.io-client 4.7.4 (real-time communication)
- Tailwind CSS 3.4.1 (styling)
- Framer Motion 12.23.24 (animations)
- Solana Wallet Adapter 0.15.35
- Anchor 0.32.1 (Solana program interaction)
- TanStack React Query 5.90.3 (data fetching)
- Zod 3.25.76 (validation)

### Backend
- Node.js with Express.js
- Socket.io 4.7.4 (WebSocket server)
- CORS support
- WebSocket server: Port 3001
- HTTP server: Port 3002

### Blockchain
- Solana blockchain
- Rust with Anchor framework
- SPL Token standard
- Multiple cluster support (devnet, testnet, mainnet-beta)

## Key User Flows

### Bingo Game Flow
1. Host creates room with entry fee configuration
2. Players join and pay entry fee via blockchain
3. Host starts game when players are ready
4. Numbers called automatically or manually by host
5. Players mark matching numbers on their cards
6. First line win triggers small prize
7. First full house wins main prize
8. Host ends game
9. Smart contract distributes funds to winners, charity, platform, and host

### Quiz Game Flow
1. Host opens QuizWizard and completes 8-step setup:
   - Enter host information
   - Select quiz type (Pub Quiz, Speed Quiz, etc.)
   - Choose payment method (Web2 or Web3)
   - Configure fundraising extras and pricing
   - Set prize structure and distribution
   - Configure rounds, questions, and timing
   - Set game start time (immediate or scheduled)
   - Review and deploy to Solana (if Web3)
2. Room created, host dashboard opens
3. Players join via room code
4. Players can purchase extras during lobby phase
5. Host starts quiz when ready
6. Questions displayed with countdown timer
7. Players submit answers in real-time
8. Scoring tracked and displayed live
9. Quiz ends, winners announced
10. Prizes and funds distributed via blockchain

### Fund Distribution Flow
1. Players pay entry fees (locked in Room Vault PDA)
2. Extras payments sent 100% to charity immediately
3. Game concludes, host declares winners
4. Smart contract `end_room` instruction executes:
   - Calculates splits based on room configuration
   - Creates transfer transactions to all recipients
   - Atomically executes all fund transfers
   - Emits RoomEnded event for tracking

## State Management

**Zustand Stores**
- `gameStateStore`: Bingo game state (players, numbers, winners, pause state)
- `playerStore`: Player roster and ready status
- `quizPlayerStore`: Quiz answers, scores, extras purchases
- `socketStore`: Socket.io connection state
- `walletStore`: Wallet connection and balance
- `uiStore`: Modal visibility and notifications

## Revenue Model

**Platform Revenue**
- 20% of all entry fees (fixed platform fee)
- Solana network transaction fees

**Host Revenue**
- 0-5% of entry fees (configurable per game)
- Ability to host multiple games simultaneously

**Charity Revenue**
- 40%+ of entry fees (guaranteed minimum)
- 100% of all extras/power-up purchases
- Tax-deductible donation receipts

**Player/Winner Revenue**
- 0-35% of entry fees allocated to prize pool
- Prize distribution to top 1-3 winners

## Security & Validation

**Smart Contract Level**
- PDA-based accounts for trustless operations
- Reentrancy protection
- Token mint and owner validation
- Checked arithmetic (overflow protection)
- Charity minimum enforcement
- Self-dealing prevention

**Server Level**
- Rate limiting on room creation and joining
- Input validation on all socket events
- Host verification for privileged actions
- Game phase validation
- Player connection tracking

**Client Level**
- Wallet signature verification
- Transaction simulation before submission
- Entry fee validation
- Payment proof tracking
- Room access control

## Key Differentiators

**Trustless Distribution**
- Smart contracts eliminate need for trusted intermediaries
- Funds automatically distributed according to predefined rules
- No manual intervention required

**Guaranteed Charity Allocation**
- 40% minimum enforced at blockchain level
- Cannot be bypassed or modified by hosts
- Transparent and verifiable on-chain

**Complete Transparency**
- All transactions recorded on Solana blockchain
- Immutable audit trail
- Public verification of fund flows

**Regulatory Compliance**
- Built-in compliance tracking
- License management
- Audit trail for regulatory requirements

**Engaging Gaming Experience**
- Real-time multiplayer games
- Power-ups and extras for enhanced gameplay
- Competitive leaderboards and prizes

## Use Cases

- Charity fundraising events
- School and club fundraising
- Community organization events
- Online fundraising campaigns
- Corporate social responsibility initiatives
- Virtual fundraising parties
- Nonprofit awareness campaigns
- Educational institution events

## Deployment

**Solana Program**
- Deployed on Devnet (primary testing)
- Mainnet-ready architecture
- Configurable RPC endpoints per cluster
- IDL available at `src/idl/fundraisely.json`

**Frontend Deployment**
- Vite production build
- Static asset hosting compatible
- Environment-based configuration
- Multi-cluster support

**Backend Deployment**
- Node.js server
- WebSocket and HTTP endpoints
- Scalable architecture
- In-memory state management

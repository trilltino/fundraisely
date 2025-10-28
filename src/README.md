# Frontend Architecture

This directory contains the React + TypeScript frontend for Fundraisely, a decentralized fundraising platform built on Solana.

## Overview

The frontend is built with:
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **TailwindCSS** for styling
- **Zustand** for state management
- **React Query** for server state and caching
- **Socket.io Client** for real-time game coordination
- **Anchor** and **@solana/web3.js** for blockchain interactions

## Directory Structure

```
src/
├── chains/              # Blockchain-specific code
│   └── solana/          # Solana wallet providers, config, transaction helpers
├── components/          # React components (see components/README.md)
│   ├── bingo/           # Bingo game components
│   ├── Quiz/            # Quiz game components
│   ├── common/          # Shared components (ErrorBoundary, AccessErrorScreen)
│   ├── landing/         # Landing page sections (Hero, Benefits, FAQ, etc.)
│   ├── layout/          # Layout components (Header, Footer)
│   └── wallet/          # Wallet-related UI (WalletButton, operations)
├── config/              # App-wide configuration
├── constants/           # Constant values (contract addresses, quiz types)
├── hooks/               # Custom React hooks
│   ├── queries/         # React Query hooks (useRoomQuery, etc.)
│   └── ...              # Game and socket hooks (useGame, useSocket)
├── lib/                 # Library code and utilities
│   ├── solana/          # Solana helpers (PDAs, accounts, transactions, errors)
│   └── queryClient.ts   # React Query client configuration
├── pages/               # Top-level page components
├── services/            # Service layer (error, storage, socket services)
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── App.tsx              # Root application component
└── main.tsx             # Application entry point
```

## Key Architecture Patterns

### 1. State Management

**Zustand Stores** (`stores/`):
- `gameStore.ts` - Bingo game state (called numbers, winners, paused state)
- `quizPlayerStore.ts` - Quiz player state
- `socketStore.ts` - Socket connection state
- `uiStore.ts` - UI state (modals, loading states)
- `walletStore.ts` - Wallet connection state

**React Query** (`hooks/queries/`):
- Server state management for blockchain data
- Automatic caching and refetching
- Query keys defined in `lib/queryKeys.ts`

### 2. Real-Time Communication

**WebSocket** (`hooks/useSocket.ts`, `services/socketService.ts`):
- Socket.io client for real-time game coordination
- Event-driven communication with Node.js server
- Room-based multiplayer synchronization

### 3. Blockchain Integration

**Solana Program Interface** (`lib/solana/`):
- `program.ts` - Anchor program instance
- `pdas.ts` - Program Derived Address generation
- `accounts.ts` - Account fetching and validation
- `transactions.ts` - Transaction building and signing
- `errors.ts` - Error parsing and handling

**Wallet Integration** (`chains/solana/`):
- Multi-wallet support (Phantom, Magic Eden, etc.)
- Transaction signing and confirmation
- Token operations (SPL tokens)

### 4. Component Organization

**Feature-Based** (`components/`):
- `bingo/` - All Bingo-related components
- `Quiz/` - All Quiz-related components
- `landing/` - Landing page sections
- `wallet/` - Wallet operations and UI
- `common/` - Shared/reusable components
- `layout/` - Layout and navigation

### 5. Type Safety

**TypeScript** (`types/`):
- `game.ts` - Game types (Room, Player, GameState)
- `program.types.ts` - Solana program types
- All components have explicit prop interfaces
- Strict TypeScript configuration

## Core Features

### Bingo Game Flow
1. **Create Room** → Host creates room with entry fee and charity selection
2. **Join Room** → Players join via room code, pay entry fee
3. **Start Game** → Host starts when ready, cards generated
4. **Gameplay** → Numbers called automatically or manually
5. **Win Detection** → Line and Full House wins verified
6. **Prize Distribution** → Solana smart contract distributes prizes

### Quiz Game Flow
1. **Setup Wizard** → 8-step creation wizard (game type, prizes, schedule, etc.)
2. **Dashboard** → Host manages quiz configuration and players
3. **Join** → Players join via Web2 (no wallet) or Web3 (with wallet)
4. **Gameplay** → Real-time quiz questions with lifelines
5. **Prize Distribution** → Winners receive prizes via smart contract

## Key Services

### Error Service (`services/errorService.ts`)
- Centralized error handling
- User-friendly error messages
- Blockchain error parsing

### Storage Service (`services/storageService.ts`)
- LocalStorage wrapper with type safety
- Room data persistence
- Player preferences

### Socket Service (`services/socketService.ts`)
- WebSocket connection management
- Event emission and handling
- Reconnection logic

## Performance Optimizations

Applied React 18 best practices (see `../REACT_IMPROVEMENTS.md`):
- `useMemo` for expensive calculations
- `React.memo` for leaf components (BingoCard, GameControls)
- `useCallback` for stable function references
- Component purity (no side effects during render)
- Derived state via `useMemo` instead of `useEffect`

## Testing

Test files located alongside source files:
- `services/__tests__/` - Service layer tests
- `setupTests.ts` - Test environment configuration
- Run tests: `npm test`

## Development

```bash
# Install dependencies
npm install

# Start development server (frontend + WebSocket server)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Environment Variables

Create `.env` in the project root:

```env
# Solana Configuration
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq

# WebSocket Server
VITE_SOCKET_URL=http://localhost:3001

# Optional: The Giving Block API (if using charity search)
VITE_TGB_API_KEY=your_api_key_here
```

## Code Style

- **Naming**: camelCase for variables/functions, PascalCase for components
- **File Structure**: Component header with detailed JSDoc, then imports, types, component
- **Comments**: Explain "why" not "what"
- **TypeScript**: Explicit return types for hooks, interfaces for all props
- **Formatting**: Use ESLint and Prettier

## Documentation

- Each component has a comprehensive header comment explaining:
  - Purpose and role
  - Integration with frontend, server, and blockchain
  - Props and usage examples
  - Key responsibilities
- See component files for detailed documentation

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## Related Documentation

- [Component Structure](./components/README.md)
- [Bingo Components](./components/bingo/README.md)
- [Quiz Components](./components/Quiz/README.md)
- [React Improvements](../REACT_IMPROVEMENTS.md)

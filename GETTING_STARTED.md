# Getting Started with Fundraisely

This guide will help you set up and run the complete Fundraisely application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

**Node.js and npm**
- Node.js version 18.x or higher
- npm version 9.x or higher
- Check versions: `node --version` and `npm --version`

**Rust and Cargo**
- Rust 1.70 or higher
- Install via rustup: https://rustup.rs/
- Check version: `rustc --version` and `cargo --version`

**Solana CLI Tools**
- Solana CLI 1.18 or higher
- Install: https://docs.solana.com/cli/install-solana-cli-tools
- Check version: `solana --version`

**Anchor Framework** (for Solana program development)
- Anchor CLI 0.32.1
- Install: `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force`
- Then: `avm install 0.32.1` and `avm use 0.32.1`
- Check version: `anchor --version`

**Git**
- For cloning the repository
- Check version: `git --version`

### Optional Tools

**Solana Wallet**
- Phantom, Solflare, or any Solana-compatible wallet browser extension
- Required for testing Web3 payment flows

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/fundraisely.git
cd fundraisely
```

### 2. Install Frontend and Server Dependencies

```bash
npm install
```

This single command installs dependencies for both:
- React frontend (Vite + TypeScript)
- WebSocket server (Node.js + Express + Socket.io)

### 3. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Frontend Configuration
VITE_PROGRAM_ID=DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOCKET_URL=http://localhost:3001
VITE_TGB_BACKEND_URL=http://localhost:3002

# WebSocket Server (Node.js) - Port 3001
PORT=3001
CLIENT_URL=http://localhost:5173

# The Giving Block Backend (Rust/Axum) - Port 3002
TGB_API_KEY=your_tgb_api_key_here
TGB_API_URL=https://api.thegivingblock.com
AXUM_PORT=3002

# Logging
RUST_LOG=info

# Pitch Deck Access Control
VITE_PITCH_DECK_PIN=1234
```

**Note**: Most default values work for local development. The TGB_API_KEY is only needed if you want to test charity integration features.

### 4. Set Up Solana Wallet (for local development)

Create a local Solana wallet for development:

```bash
solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase
```

Set Solana CLI to use devnet:

```bash
solana config set --url devnet
```

Check your configuration:

```bash
solana config get
```

Get some devnet SOL for testing (airdrop):

```bash
solana airdrop 2
```

Verify your balance:

```bash
solana balance
```

### 5. Build the Solana Program (Optional)

If you plan to modify the smart contract, you'll need to build and deploy it:

```bash
cd solana-program/fundraisely
anchor build
```

To deploy to devnet:

```bash
anchor deploy --provider.cluster devnet
```

**Note**: For most users, you can skip this step and use the already-deployed program at the ID specified in `.env`.

### 6. Generate TypeScript IDL (Optional)

If you rebuild the Solana program, regenerate the TypeScript interface:

```bash
cd solana-program/fundraisely
anchor idl init DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq --filepath target/idl/fundraisely.json
```

Copy the IDL to your frontend:

```bash
cp target/idl/fundraisely.json ../../src/idl/fundraisely.json
```

## Running the Application

### Option 1: Run Everything Together (Recommended)

From the root directory, start both the frontend and WebSocket server:

```bash
npm run dev
```

This command uses `concurrently` to run:
- **Vite dev server** (React frontend) on http://localhost:5173
- **WebSocket server** (Node.js) on http://localhost:3001

The terminal will show output from both servers. Look for:

```
Server running on port 3001
WebSocket server ready
Client URL: http://localhost:5173

VITE v5.4.2  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Option 2: Run Servers Separately

If you prefer separate terminal windows for better control:

**Terminal 1 - WebSocket Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Dev Server:**
```bash
npx vite
```

### Option 3: Production Build

Build the production version:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Accessing the Application

Once running, open your browser and navigate to:

**Main Application**: http://localhost:5173

### Available Pages

- `/` - Landing page with hero section, benefits, and FAQ
- `/game` - Bingo game room (create or join)
- `/quiz` - Quiz challenge page (host or join quiz)
- `/pitch-deck` - Pitch deck presentation (requires PIN: 1234)
- `/test-campaign` - Testing utilities

## Testing the Application

### Quick Test Flow - Bingo Game

1. **Host Setup** (Browser 1):
   - Navigate to http://localhost:5173/game
   - Click "Create Room" or connect wallet and create on-chain
   - Note the room code displayed

2. **Player Join** (Browser 2 - incognito/different browser):
   - Navigate to http://localhost:5173/game
   - Enter the room code from step 1
   - Click "Join Room"

3. **Start Game**:
   - In host browser, click "Start Game"
   - Numbers will be called automatically or manually
   - Mark numbers on your card as they're called

4. **Win Condition**:
   - First to complete a line (5 in a row) wins small prize
   - First to complete full house (all 25 cells) wins main prize

### Quick Test Flow - Quiz Game

1. **Create Quiz** (Browser 1):
   - Navigate to http://localhost:5173/quiz
   - Click "Host a Quiz"
   - Complete the 8-step wizard:
     - Enter host name
     - Select quiz type (e.g., "Pub Quiz")
     - Choose payment method (Web2 for testing without wallet)
     - Configure fundraising extras
     - Set prize structure
     - Configure rounds (e.g., 3 rounds, 5 questions each, 30 seconds per question)
     - Set start time (immediate)
     - Review and launch
   - Note the room code

2. **Join Quiz** (Browser 2):
   - Navigate to http://localhost:5173/quiz
   - Enter room code
   - Enter player name
   - Toggle ready

3. **Play Quiz**:
   - Host clicks "Start Quiz"
   - Answer questions within time limit
   - Purchase extras during gameplay (if enabled)
   - View leaderboard after each round

4. **End Game**:
   - Quiz completes after all rounds
   - Winners announced
   - Prizes distributed (if on blockchain)

## Troubleshooting

### WebSocket Connection Failed

**Problem**: Frontend can't connect to WebSocket server

**Solution**:
- Ensure WebSocket server is running on port 3001
- Check `VITE_SOCKET_URL` in `.env` matches server port
- Verify no firewall blocking localhost:3001
- Check browser console for CORS errors

### Wallet Connection Issues

**Problem**: Can't connect Solana wallet

**Solution**:
- Install a Solana wallet extension (Phantom, Solflare)
- Switch wallet to Devnet network
- Ensure you have devnet SOL (use `solana airdrop 2`)
- Clear browser cache and reload

### Solana Transaction Failed

**Problem**: Blockchain transactions failing

**Solution**:
- Verify you're on devnet: `solana config get`
- Check wallet balance: `solana balance`
- Request airdrop: `solana airdrop 2`
- Ensure program ID in `.env` matches deployed program
- Check RPC endpoint is responsive: try different devnet RPC

### Port Already in Use

**Problem**: "Port 3001 already in use" or "Port 5173 already in use"

**Solution**:

**Windows:**
```bash
# Find process using port 3001
netstat -ano | findstr :3001
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Find process using port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Build Errors

**Problem**: TypeScript compilation errors

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

**Problem**: Anchor build fails

**Solution**:
```bash
cd solana-program/fundraisely
# Clean build artifacts
anchor clean
# Rebuild
anchor build
```

### Module Not Found Errors

**Problem**: Import errors for Solana packages

**Solution**:
- Ensure all dependencies installed: `npm install`
- Check Node version: `node --version` (should be 18+)
- Clear cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules && npm install`

## Development Workflow

### Frontend Development

The Vite dev server provides:
- Hot module replacement (HMR)
- Instant updates on file save
- React Fast Refresh

Edit files in `src/` and see changes immediately in browser.

**Key directories**:
- `src/components/` - React components
- `src/pages/` - Page components
- `src/hooks/` - Custom React hooks
- `src/stores/` - Zustand state stores
- `src/types/` - TypeScript type definitions
- `src/chains/solana/` - Solana blockchain integration

### Backend Development

The WebSocket server runs with Node.js:
- Manual restart required after code changes
- Or use nodemon for auto-restart: `npx nodemon server/index.js`

**Key files**:
- `server/index.js` - Main server entry point
- `server/handlers/socketHandler.js` - WebSocket event handlers
- `server/managers/RoomManager.js` - Room state management

### Smart Contract Development

Anchor framework workflow:

```bash
cd solana-program/fundraisely

# Make changes to src/lib.rs or instruction files

# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update IDL in frontend
cp target/idl/fundraisely.json ../../src/idl/fundraisely.json
```

## Available NPM Scripts

From the root directory:

- `npm run dev` - Start frontend and server concurrently
- `npm run server` - Start WebSocket server only
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest tests

## Environment-Specific Configuration

### Development (Devnet)

```env
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
```

### Local Testing (Localnet)

Start local Solana validator:
```bash
solana-test-validator
```

Update `.env`:
```env
VITE_SOLANA_NETWORK=localnet
VITE_SOLANA_RPC_URL=http://localhost:8899
VITE_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
```

Deploy program locally:
```bash
cd solana-program/fundraisely
anchor build
anchor deploy --provider.cluster localnet
```

### Production (Mainnet)

**Warning**: Requires real SOL and USDC. Test thoroughly on devnet first.

```env
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_PROGRAM_ID=<your_mainnet_program_id>
```

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                          │
│  ┌──────────────┐              ┌──────────────────────┐ │
│  │ React Frontend│◄────────────►│  Solana Wallet      │ │
│  │ (Port 5173)  │              │  (Phantom/Solflare) │ │
│  └───────┬──────┘              └──────────┬───────────┘ │
│          │                                 │             │
└──────────┼─────────────────────────────────┼─────────────┘
           │                                 │
           │ WebSocket                       │ RPC Calls
           │ (Socket.io)                     │
           │                                 │
    ┌──────▼──────────┐            ┌────────▼──────────┐
    │  WebSocket      │            │  Solana Blockchain│
    │  Server         │            │  (Devnet/Mainnet) │
    │  (Port 3001)    │            │                   │
    └─────────────────┘            └───────────────────┘
```

### Data Flow

**Game Coordination** (WebSocket Server):
- Player connections and disconnections
- Room creation and joining
- Ready status synchronization
- Game phase transitions
- Number calling (Bingo)
- Question delivery (Quiz)

**Financial Transactions** (Solana Blockchain):
- Entry fee payments
- Fund escrow in Room Vault
- Prize distribution
- Charity allocation
- Platform and host fees

**Key Principle**: The WebSocket server never handles money. All financial operations occur on-chain through smart contracts.

## Next Steps

After successfully running the application:

1. **Explore the codebase**: Start with `src/pages/` and `src/components/`
2. **Read documentation**: Check individual README files in subdirectories
3. **Modify and experiment**: Try changing game parameters in quiz wizard
4. **Deploy your own program**: Build and deploy to devnet with your changes
5. **Join the community**: Report issues and contribute on GitHub

## Additional Resources

- **Solana Docs**: https://docs.solana.com/
- **Anchor Book**: https://book.anchor-lang.com/
- **React Docs**: https://react.dev/
- **Socket.io Docs**: https://socket.io/docs/
- **Vite Docs**: https://vitejs.dev/

## Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Search existing GitHub issues
3. Create a new issue with:
   - Error messages
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Screenshots if applicable

## License

MIT License - See LICENSE file for details

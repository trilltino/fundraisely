# Bingo Game Components

This directory contains all components related to the Bingo fundraising game feature.

## Overview

The Bingo game is a real-time multiplayer game where:
- **Host** creates a room with entry fee and charity selection
- **Players** join via room code and pay entry fee (blockchain transaction)
- **Gameplay** involves auto-play or manual number calling
- **Winners** claim Line and Full House prizes
- **Prize Distribution** happens automatically via Solana smart contract

## Architecture

```
bingo/
├── GameScreen.tsx           # Main game interface (orchestrator)
├── BingoCard.tsx           # Interactive 5x5 card (React.memo optimized)
├── NumberCaller.tsx        # Number display and calling
├── GameControls.tsx        # Host control panel (React.memo optimized)
├── PlayerList.tsx          # Real-time player list
├── GameHeader.tsx          # Game stats and info
├── GameLoader.tsx          # Loading states
├── GameOverScreen.tsx      # Game completion screen
├── cards/
│   ├── CreateRoomCard.tsx  # Room creation form
│   └── JoinRoomCard.tsx    # Room joining form
├── modals/
│   ├── ConfirmRoomModal.tsx    # Room creation confirmation
│   ├── VerifyRoomModal.tsx     # Blockchain verification
│   └── WinConfirmation.tsx     # Winner claim confirmation
├── effects/
│   ├── WinEffects.tsx          # Confetti animations
│   └── WinNotification.tsx     # Winner notifications
└── alerts/
    └── GameAccessAlert.tsx     # Access control warnings
```

## Component Details

### Core Game Components

#### GameScreen.tsx
**Main game orchestrator** - Combines all game components into a cohesive interface.

**Responsibilities:**
- Renders game layout (header, card, number caller, controls)
- Coordinates between Bingo card, number calling, and player list
- Manages game state transitions (waiting → playing → game over)
- Integrates WebSocket communication
- Handles winner celebrations and modals

**Key Features:**
- Responsive layout for different screen sizes
- Real-time updates via WebSocket
- Conditional rendering based on game state
- Integration with useGame hook

**Used By:** `pages/Game.tsx`

---

#### BingoCard.tsx ⚡ (Performance Optimized)
**Interactive 5x5 Bingo card** with animated cells.

**Responsibilities:**
- Render 25 number cells in 5x5 grid
- Handle cell click events (mark/unmark)
- Visual feedback for marked cells
- Animate cell interactions

**Performance Optimizations:**
- Wrapped with `React.memo` (60-80% fewer renders)
- Only re-renders when `cells` or `onCellClick` props change
- Prevents re-renders during unrelated state changes (winner updates, player joins)
- GPU-accelerated animations via Framer Motion (transform, scale)

**Props:**
```typescript
interface BingoCardProps {
  cells: Array<{ number: number; marked: boolean }>;
  onCellClick: (index: number) => void;
}
```

**Why Optimized:**
Most frequently rendered component during gameplay. Without memoization, would re-render on every number call, winner declaration, and player action.

---

#### NumberCaller.tsx
**Number display and calling interface** - Shows current number and call history.

**Responsibilities:**
- Display currently called number (large)
- Show history of called numbers (chronological)
- Visual distinction between current and past numbers
- Scrollable history for long games

**Key Features:**
- Large, clear number display
- Color-coded numbers for quick scanning
- Responsive grid layout
- Auto-scroll to latest number

---

#### GameControls.tsx ⚡ (Performance Optimized)
**Host control panel** for game management.

**Responsibilities:**
- Toggle auto-play mode (automatic number calling every 3 seconds)
- Pause/unpause game
- Return to landing page (with confirmation)
- Declare winners (line and full house)

**Performance Optimizations:**
- Wrapped with `React.memo` (20-40% fewer renders)
- Console logs moved to `useEffect` (component purity)
- Only re-renders when props change

**Props:**
```typescript
interface GameControlsProps {
  onToggleAutoPlay: () => void;
  onUnpauseGame: () => void;
  hasWon: boolean;
  autoPlay: boolean;
  isPaused: boolean;
  lineWinners?: Array<{ id: string; name: string }>;
  fullHouseWinners?: Array<{ id: string; name: string }>;
  lineWinClaimed?: boolean;
}
```

**Button Visibility:**
- Auto-Play Toggle: Always visible
- Unpause: Only when `isPaused === true`
- Declare Line Winners: When winners present and not claimed
- Declare Full House: When winners present

**Host-Only:** Only rendered for room host.

---

#### PlayerList.tsx
**Real-time player list** with ready status and win indicators.

**Responsibilities:**
- Display all players in the room
- Show ready/not ready status
- Highlight winners (line and full house)
- Show player count
- Visual distinction for host and current player

**Key Features:**
- Real-time updates via WebSocket
- Color-coded status (ready: green, not ready: gray)
- Winner badges (trophy icons)
- Responsive design

---

#### GameHeader.tsx
**Game statistics and information header.**

**Responsibilities:**
- Display room code for sharing
- Show entry fee and player count
- Display prize pool breakdown (line, full house, charity, host)
- Show current player's role (host/player)

**Key Features:**
- Responsive layout
- Clear prize breakdown
- Copy room code functionality
- Real-time player count updates

---

#### GameLoader.tsx
**Loading states** for various game operations.

**Responsibilities:**
- Show loading spinner during operations
- Display loading message
- Prevent user interaction during loading

**Use Cases:**
- Joining room
- Creating room
- Blockchain transactions
- Verifying room

---

#### GameOverScreen.tsx
**Game completion screen** with results and navigation.

**Responsibilities:**
- Display game results (winners, prizes)
- Show final statistics
- Navigation to create new game or return to landing
- Winner celebration UI

**Key Features:**
- Winner list with prizes
- Prize distribution summary
- Call-to-action buttons
- Confetti effects for winners

---

### Card Components (`cards/`)

#### CreateRoomCard.tsx
**Room creation form** for hosts.

**Responsibilities:**
- Input entry fee (SOL or SPL tokens)
- Select charity from The Giving Block
- Configure game settings
- Validate inputs
- Submit to create room (blockchain transaction)

**Key Features:**
- Token selection (SOL, USDC, etc.)
- Charity search integration
- Real-time prize calculation preview
- Input validation (minimum entry fee, charity percentage)
- Blockchain transaction handling

**Flow:**
1. Enter entry fee amount
2. Select token type
3. Search and select charity
4. Review prize breakdown
5. Confirm and create room (emits socket event + blockchain tx)

---

#### JoinRoomCard.tsx
**Room joining form** for players.

**Responsibilities:**
- Input room code
- Display room details after lookup
- Join room (socket connection + blockchain payment)
- Handle errors (room not found, room full, insufficient balance)

**Key Features:**
- Room code input (6-character alphanumeric)
- Room details preview (entry fee, charity, host)
- Real-time validation
- Balance check before joining

**Flow:**
1. Enter room code
2. Verify room exists (socket event)
3. Display room details
4. Confirm and join (blockchain payment transaction)

---

### Modals (`modals/`)

#### ConfirmRoomModal.tsx
**Room creation confirmation dialog.**

**Responsibilities:**
- Show room details before creation
- Confirm blockchain transaction
- Display estimated transaction fees
- Cancel or proceed with creation

**Key Information Displayed:**
- Entry fee and token
- Charity name and allocation percentage
- Prize breakdown
- Transaction fee estimate
- Room code (after creation)

---

#### VerifyRoomModal.tsx
**Blockchain room verification dialog.**

**Responsibilities:**
- Display room verification status
- Show blockchain account lookup
- Handle verification errors
- Confirm room exists on-chain

**Use Cases:**
- After creating room (verify creation succeeded)
- Before starting game (verify room is ready)
- After payment (verify payment recorded)

**States:**
- Loading: Fetching blockchain data
- Success: Room verified
- Error: Room not found or invalid

---

#### WinConfirmation.tsx
**Winner claim confirmation dialog.**

**Responsibilities:**
- Display win details (line or full house)
- Show prize amount
- Confirm winner claim (blockchain transaction)
- Handle claim errors

**Key Features:**
- Win type display (Line Win / Full House)
- Prize amount in token
- Transaction confirmation
- Success/error feedback

**Flow:**
1. Player achieves win (line or full house)
2. Modal appears with win details
3. Player confirms claim
4. Blockchain transaction executes
5. Prize distributed to winner's wallet

---

### Effects (`effects/`)

#### WinEffects.tsx
**Celebration effects** for winners.

**Responsibilities:**
- Trigger confetti animation on wins
- Play victory sound (if implemented)
- Visual feedback for achievements

**Key Features:**
- Canvas confetti library integration
- Configurable confetti patterns (line vs full house)
- Duration and intensity control
- Non-blocking (doesn't interfere with gameplay)

**Trigger Events:**
- Line win claimed
- Full house win claimed

---

#### WinNotification.tsx
**Winner notification UI** component.

**Responsibilities:**
- Display winner announcement
- Show winner name and prize
- Animate notification entrance/exit
- Auto-dismiss after duration

**Key Features:**
- Framer Motion animations
- Gradient background for visibility
- Trophy icon and winner name
- Prize amount display
- Dismissible or auto-dismiss

---

### Alerts (`alerts/`)

#### GameAccessAlert.tsx
**Access control warning component.**

**Responsibilities:**
- Display warning when user tries to access game without permission
- Show reasons for access denial
- Provide navigation back to landing

**Use Cases:**
- Room not found
- Room full
- Not a player in the room
- Game already ended
- Insufficient balance

**Key Features:**
- Clear error messaging
- Suggested actions
- Navigation button to return to landing

---

## Data Flow

### State Management

**Zustand Store (`stores/gameStore.ts`):**
```typescript
interface GameState {
  calledNumbers: number[];
  currentNumber: number | null;
  isPaused: boolean;
  lineWinners: Array<{ id: string; name: string }>;
  fullHouseWinners: Array<{ id: string; name: string }>;
  lineWinClaimed: boolean;
  // ... more state
}
```

**Custom Hook (`hooks/useGame.ts`):**
- Manages local game state (card, auto-play, wins)
- Emits socket events (call number, claim win, etc.)
- Listens to socket events (number called, winner declared)
- Returns game state and control functions

### WebSocket Events

**Emitted by Client:**
- `create_room` - Host creates a new room
- `join_room` - Player joins existing room
- `call_number` - Host calls a number
- `toggle_auto_play` - Toggle auto-play mode
- `pause_game` - Pause the game
- `unpause_game` - Resume the game
- `claim_line_win` - Player claims line win
- `claim_full_house_win` - Player claims full house win
- `toggle_ready` - Player toggles ready status
- `start_game` - Host starts the game

**Received by Client:**
- `number_called` - New number was called
- `player_joined` - Player joined the room
- `player_left` - Player left the room
- `game_started` - Game has started
- `game_paused` - Game was paused
- `game_unpaused` - Game was resumed
- `line_winner_declared` - Line winner announced
- `full_house_winner_declared` - Full house winner announced
- `room_updated` - Room state changed

### Blockchain Integration

**Smart Contract Operations:**
1. **Create Room**: `initialize_room` instruction (host deposits host stake)
2. **Join Room**: `join_room` instruction (player pays entry fee)
3. **Claim Line Win**: `claim_line_prize` instruction (player receives 30% of prize pool)
4. **Claim Full House**: `claim_full_house_prize` instruction (player receives 70% of prize pool)
5. **Distribute to Charity**: `distribute_to_charity` instruction (after game ends)
6. **Claim Host Reward**: `claim_host_reward` instruction (host receives 25% of intake)

**Transaction Flow:**
```
User Action → Component Handler → useGame Hook → Solana Transaction →
WebSocket Event → Server Broadcast → All Clients Update
```

## Performance Optimizations

See `../../REACT_IMPROVEMENTS.md` for detailed optimization documentation.

### Applied Optimizations

1. **React.memo:**
   - `BingoCard.tsx` - 60-80% fewer renders
   - `GameControls.tsx` - 20-40% fewer renders

2. **useMemo:**
   - Prize calculations in `GameHeader.tsx`
   - Player stats in `PlayerList.tsx`

3. **useCallback:**
   - All event handlers in `useGame.ts` hook
   - Cell click handlers in `BingoCard.tsx`

4. **Component Purity:**
   - No console.logs during render
   - Side effects moved to useEffect
   - No mutations during render

## Usage Example

```typescript
// pages/Game.tsx
import { GameScreen } from '../components/bingo/GameScreen';
import { useGame } from '../hooks/useGame';
import { useSocket } from '../hooks/useSocket';

export function Game() {
  const { roomId } = useParams();
  const socket = useSocket(roomId);
  const gameState = useGame(socket, roomId);

  if (!socket) return <GameLoader message="Connecting..." />;
  if (!roomId) return <GameAccessAlert reason="No room ID provided" />;

  return <GameScreen socket={socket} roomId={roomId} gameState={gameState} />;
}
```

## Testing

Components should be tested for:
- ✅ Correct rendering with various props
- ✅ Event handler calls with correct arguments
- ✅ Conditional rendering (host vs player, game states)
- ✅ Loading and error states
- ✅ WebSocket event handling
- ✅ Blockchain transaction success/failure

## Styling

All components use **TailwindCSS** with these patterns:

**Color Scheme:**
- Primary: Indigo/Purple gradient (`from-indigo-600 to-purple-600`)
- Success: Green (`bg-green-500`)
- Danger: Red (`bg-red-500`)
- Neutral: Gray (`bg-gray-600`)

**Common Classes:**
- Cards: `bg-white dark:bg-gray-800 rounded-lg shadow-md p-6`
- Buttons: `px-6 py-3 rounded-lg transition-all shadow-md`
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

**Animations:**
- Framer Motion for complex animations
- Tailwind transitions for simple hover effects
- Canvas confetti for celebrations

## Related Documentation

- [Component Structure](../README.md)
- [Frontend Architecture](../../README.md)
- [useGame Hook](../../hooks/useGame.ts)
- [Game Store](../../stores/gameStore.ts)
- [React Improvements](../../../REACT_IMPROVEMENTS.md)

## Future Improvements

Potential enhancements:
- [ ] Add unit tests for all components
- [ ] Implement accessibility features (ARIA labels, keyboard navigation)
- [ ] Add sound effects for game events
- [ ] Mobile-optimized layout
- [ ] Internationalization (i18n) support
- [ ] Dark mode improvements
- [ ] Progressive Web App (PWA) support

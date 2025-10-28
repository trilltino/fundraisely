# Components

This directory contains all React components for the Fundraisely application, organized by feature and purpose.

## Directory Structure

```
components/
├── bingo/              # Bingo game components
├── Quiz/               # Quiz game components
├── common/             # Shared/reusable components
├── landing/            # Landing page sections
├── layout/             # Layout and navigation components
└── wallet/             # Wallet-related UI components
```

## Component Organization

### Feature-Based Structure

Components are organized by feature to improve maintainability and code discovery:

- **`bingo/`** - Everything related to the Bingo game
- **`Quiz/`** - Everything related to the Quiz game
- **`common/`** - Components used across multiple features
- **`landing/`** - Landing page marketing sections
- **`layout/`** - App-wide layout components (header, footer)
- **`wallet/`** - Wallet connection and operations UI

### Component Categories

#### 1. Bingo Components (`bingo/`)

See [bingo/README.md](./bingo/README.md) for detailed documentation.

**Core Game Components:**
- `GameScreen.tsx` - Main game interface
- `BingoCard.tsx` - Interactive 5x5 bingo card (React.memo optimized)
- `NumberCaller.tsx` - Number display and calling interface
- `GameControls.tsx` - Host control panel (React.memo optimized)
- `PlayerList.tsx` - Real-time player list

**Modals:**
- `ConfirmRoomModal.tsx` - Room creation confirmation
- `VerifyRoomModal.tsx` - Blockchain room verification
- `WinConfirmation.tsx` - Winner claim confirmation

**Effects:**
- `WinEffects.tsx` - Confetti and celebration animations
- `WinNotification.tsx` - Winner notification UI

**Cards:**
- `CreateRoomCard.tsx` - Room creation form
- `JoinRoomCard.tsx` - Room joining form

**Alerts:**
- `GameAccessAlert.tsx` - Access control warnings

**Screens:**
- `GameOverScreen.tsx` - Game completion screen
- `GameLoader.tsx` - Loading states

**Headers:**
- `GameHeader.tsx` - Game screen header with stats

#### 2. Quiz Components (`Quiz/`)

See [Quiz/README.md](./Quiz/README.md) for detailed documentation.

**Wizard Steps (8-step creation):**
- `QuizWizard.tsx` - Main wizard orchestrator
- `StepGameType.tsx` - Select Web2 vs Web3
- `StepHostInfo.tsx` - Host information
- `StepPrizes.tsx` - Prize configuration
- `StepRoundSettings.tsx` - Round/question settings
- `StepSchedule.tsx` - Quiz scheduling
- `StepFundraisingOptions.tsx` - Fundraising extras (lifelines, etc.)

**Dashboard:**
- `HostDashboard.tsx` - Main host control center
- `SetupSummaryPanel.tsx` - Configuration summary
- `PlayerListPanel.tsx` - Player management
- `FundraisingExtrasPanel.tsx` - Lifelines and extras
- `PaymentReconciliation.tsx` - Payment tracking
- `OptionalContractPanel.tsx` - Blockchain integration

**Game:**
- `GameControls.tsx` - Quiz game controls
- `joinQuizSocket.ts` - Socket connection logic

**Join Room:**
- `JoinQuizWeb2Page.tsx` - Web2 (email) join flow
- `JoinQuizWeb3Page.tsx` - Web3 (wallet) join flow

#### 3. Common Components (`common/`)

**Shared Components:**
- `ErrorBoundary.tsx` - React error boundary for graceful error handling
- `AccessErrorScreen.tsx` - Generic access denied screen
- `DebugSolanaRoomWrapper.tsx` - Development debugging wrapper

#### 4. Landing Page Components (`landing/`)

**Marketing Sections:**
- `HeroSection.tsx` - Hero banner with CTA
- `Benefits.tsx` - Platform benefits showcase
- `HowItWorks.tsx` - Step-by-step guide
- `FAQ.tsx` - Frequently asked questions
- `WinnerSection.tsx` - Winner showcase section
- `WinnerDisplay.tsx` - Individual winner display
- `CTASection.tsx` - Call-to-action section

#### 5. Layout Components (`layout/`)

**App Structure:**
- `Header.tsx` - Main application header
- `Headers.tsx` - Alternative header variants
- `SimpleHeader.tsx` - Minimal header for focused pages
- `Footer.tsx` - Application footer

#### 6. Wallet Components (`wallet/`)

**Blockchain Wallet UI:**
- `WalletButton.tsx` - Connect/disconnect wallet button
- `SolanaWalletOperations.tsx` - Wallet operation UI
- `TokenRegistrySetup.tsx` - Token registry management
- `MintUSDCButton.tsx` - Devnet USDC minting (testing)

## Component Patterns

### 1. Props Interfaces

All components have explicit TypeScript interfaces:

```typescript
interface GameControlsProps {
  onToggleAutoPlay: () => void;
  onUnpauseGame: () => void;
  hasWon: boolean;
  autoPlay: boolean;
  isPaused: boolean;
  // ... more props
}

export function GameControls({ ... }: GameControlsProps) {
  // Component implementation
}
```

### 2. React.memo Optimization

Performance-critical components use `React.memo`:

```typescript
export const BingoCard = memo(function BingoCard({ cells, onCellClick }: BingoCardProps) {
  // Only re-renders when cells or onCellClick change
});
```

**Memoized Components:**
- `BingoCard.tsx` - 25 animated buttons (60-80% fewer renders)
- `GameControls.tsx` - Host control panel (20-40% fewer renders)

### 3. Documentation Headers

Every component includes a comprehensive header comment:

```typescript
/**
 * COMPONENT NAME - Brief description
 *
 * PURPOSE:
 * What this component does and why it exists
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * How it interacts with WebSocket server
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 * How it connects to the blockchain
 *
 * KEY RESPONSIBILITIES:
 * 1. Responsibility one
 * 2. Responsibility two
 *
 * PROPS:
 * Detailed prop descriptions
 *
 * USAGE EXAMPLE:
 * Code example showing how to use the component
 */
```

### 4. Pure Components

Components follow React purity guidelines:
- No side effects during render phase
- Console logs moved to `useEffect`
- Calculations memoized with `useMemo`

### 5. Zustand Integration

Components consume Zustand stores via hooks:

```typescript
import { useGameStore } from '../../stores/gameStore';

export function GameScreen() {
  const { calledNumbers, isPaused, lineWinners } = useGameStore();
  // Use store state
}
```

### 6. Socket Integration

Real-time features use socket hooks:

```typescript
import { useSocket } from '../../hooks/useSocket';

export function Game() {
  const socket = useSocket(roomId);
  // Emit events, listen for updates
}
```

## Styling Approach

### TailwindCSS Utility Classes

All components use Tailwind for styling:

```tsx
<button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600
                   text-white rounded-lg hover:from-indigo-700 hover:to-purple-700
                   transition-all shadow-md disabled:opacity-50">
  Click Me
</button>
```

### Common Patterns

**Buttons:**
- Primary: `bg-gradient-to-r from-indigo-600 to-purple-600`
- Secondary: `bg-gray-600 hover:bg-gray-700`
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

**Cards:**
- Container: `bg-white dark:bg-gray-800 rounded-lg shadow-md p-6`
- Border: `border border-gray-200 dark:border-gray-700`

**Animations:**
- Framer Motion for complex animations (Bingo card, win effects)
- Tailwind transitions for simple hover/focus effects

## Testing

Components should be testable and follow these guidelines:

1. **Props Validation** - All props are TypeScript-validated
2. **Error Boundaries** - Wrapped in ErrorBoundary for production
3. **Loading States** - Handle loading, error, and empty states
4. **Accessibility** - Keyboard navigation, ARIA labels

## Performance Notes

**Optimization Checklist:**
- ✅ React.memo for expensive leaf components
- ✅ useMemo for expensive calculations
- ✅ useCallback for stable function references
- ✅ No side effects during render
- ✅ Derived state via useMemo (not useEffect)

See `../../REACT_IMPROVEMENTS.md` for detailed performance optimizations.

## Development Guidelines

### Creating New Components

1. **Choose Directory** - Determine feature category (bingo, Quiz, common, etc.)
2. **Create File** - Use PascalCase: `MyComponent.tsx`
3. **Add Header** - Include comprehensive documentation header
4. **Define Props** - Create TypeScript interface
5. **Implement Component** - Follow React best practices
6. **Export** - Use named export: `export function MyComponent() {}`
7. **Optimize** - Add React.memo if frequently re-rendered
8. **Test** - Verify functionality and performance

### Component Checklist

- [ ] Comprehensive header comment
- [ ] TypeScript props interface
- [ ] Pure component (no render side effects)
- [ ] Proper error handling
- [ ] Loading states
- [ ] Responsive design (Tailwind)
- [ ] Accessibility (keyboard, ARIA)
- [ ] Performance optimization (memo, useMemo, useCallback)

## Component Dependencies

**Common Dependencies:**
- `react` - Core React library
- `react-router-dom` - Navigation (useNavigate, useParams)
- `lucide-react` - Icon library
- `framer-motion` - Animation library
- `clsx` or `tailwind-merge` - Class name utilities
- `zustand` - State management
- `@solana/web3.js` - Blockchain interactions
- `socket.io-client` - WebSocket communication

## File Naming Conventions

- **Components:** PascalCase - `GameControls.tsx`
- **Hooks:** camelCase with 'use' prefix - `useQuizSocket.ts`
- **Types:** camelCase with types suffix - `WizardStepProps.ts`
- **Utilities:** camelCase - `joinQuizSocket.ts`

## Related Documentation

- [Bingo Components](./bingo/README.md)
- [Quiz Components](./Quiz/README.md)
- [Frontend Architecture](../README.md)
- [React Improvements](../../REACT_IMPROVEMENTS.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)

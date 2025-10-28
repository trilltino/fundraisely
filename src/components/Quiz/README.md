# Quiz Game Components

This directory contains all components related to the Quiz fundraising game feature.

## Overview

The Quiz game is a flexible trivia/challenge game with two modes:
- **Web2 Mode**: Players join with email (no wallet required), prizes distributed manually
- **Web3 Mode**: Players join with wallet, prizes distributed automatically via Solana smart contract

**Key Features:**
- 8-step creation wizard for comprehensive setup
- Host dashboard for real-time management
- Lifelines and extras (50/50, Ask the Audience, etc.)
- Payment reconciliation for prize tracking
- Optional blockchain integration

## Architecture

```
Quiz/
├── Wizard/                          # 8-step creation wizard
│   ├── QuizWizard.tsx              # Main wizard orchestrator
│   ├── StepGameType.tsx            # Select Web2 vs Web3
│   ├── StepHostInfo.tsx            # Host information
│   ├── StepPrizes.tsx              # Prize configuration
│   ├── StepRoundSettings.tsx       # Round/question settings
│   ├── StepSchedule.tsx            # Quiz scheduling
│   ├── StepFundraisingOptions.tsx  # Lifelines and extras
│   ├── StepPaymentMethod.tsx       # Payment configuration
│   ├── StepReviewLaunch.tsx        # Final review and launch
│   └── WizardStepProps.ts          # Shared wizard types
├── dashboard/                       # Host dashboard components
│   ├── HostDashboard.tsx           # Main dashboard orchestrator
│   ├── SetupSummaryPanel.tsx       # Configuration summary
│   ├── PlayerListPanel.tsx         # Player management
│   ├── FundraisingExtrasPanel.tsx  # Lifelines/extras management
│   ├── PaymentReconciliation.tsx   # Payment tracking
│   └── OptionalContractPanel.tsx   # Blockchain integration panel
├── joinroom/                        # Player join flows
│   ├── JoinQuizModal.tsx           # Join modal wrapper
│   ├── JoinQuizWeb2Page.tsx        # Email-based join
│   ├── JoinQuizWeb3Page.tsx        # Wallet-based join
│   └── Web3PaymentStep.tsx         # Blockchain payment step
├── game/                            # Game play components
│   └── GameControls.tsx            # Quiz game controls
├── modals/                          # Modal dialogs
│   └── TransactionStatusModal.tsx  # Transaction status display
├── common/                          # Shared Quiz components
│   └── BlockchainBadge.tsx         # Web3 indicator badge
├── useQuizConfig.ts                 # Quiz configuration hook
├── useQuizSocket.ts                 # Quiz WebSocket hook
└── joinQuizSocket.ts                # Join room socket logic
```

## Component Details

### Wizard Components (`Wizard/`)

The Quiz creation wizard guides hosts through 8 steps to configure their quiz game.

#### QuizWizard.tsx
**Main wizard orchestrator** - Manages wizard state and step navigation.

**Responsibilities:**
- Track current step (1-8)
- Store wizard form data across steps
- Navigate between steps (next, back)
- Validate step completion
- Submit final configuration

**Key Features:**
- Step progress indicator
- Form data persistence across steps
- Validation before advancing
- Back/Next navigation
- Final submission to create quiz

**Props:**
```typescript
interface QuizWizardProps {
  onComplete: (config: QuizConfig) => void;
  onCancel: () => void;
}
```

---

#### StepGameType.tsx (Step 1)
**Game type selection** - Choose Web2 (email) or Web3 (wallet) mode.

**Responsibilities:**
- Present Web2 vs Web3 options
- Explain differences between modes
- Store game type selection

**Options:**
- **Web2**: Email-based, manual prize distribution, no wallet required
- **Web3**: Wallet-based, automatic blockchain prizes, transparent distribution

**Key Differences:**
| Feature | Web2 | Web3 |
|---------|------|------|
| Join Method | Email | Wallet |
| Prize Distribution | Manual | Automatic (smart contract) |
| Transparency | Host-managed | Blockchain-verified |
| Entry Fee | Optional | Required |

---

#### StepHostInfo.tsx (Step 2)
**Host information** - Collect host name and contact details.

**Responsibilities:**
- Input host name
- Input host email (for communications)
- Optional: Host organization/charity

**Validation:**
- Name: Required, 2-50 characters
- Email: Valid email format

---

#### StepPrizes.tsx (Step 3)
**Prize configuration** - Define prize structure.

**Responsibilities:**
- Configure winner prizes (1st, 2nd, 3rd place)
- Set entry fee (Web3 mode only)
- Calculate prize pool distribution
- Select charity allocation

**Web2 Mode:**
- Manual prize amounts (host provides)
- No entry fee collection

**Web3 Mode:**
- Prize pool from entry fees
- Automatic calculation (e.g., 1st: 50%, 2nd: 30%, 3rd: 20%)
- Minimum charity allocation (40%)

---

#### StepRoundSettings.tsx (Step 4)
**Round and question settings** - Configure quiz structure.

**Responsibilities:**
- Set number of rounds
- Questions per round
- Time limit per question
- Difficulty level
- Question categories

**Example Configuration:**
```typescript
{
  rounds: 3,
  questionsPerRound: 10,
  timePerQuestion: 30, // seconds
  difficulty: 'medium',
  categories: ['general', 'sports', 'science']
}
```

---

#### StepSchedule.tsx (Step 5)
**Quiz scheduling** - Set quiz date and time.

**Responsibilities:**
- Select quiz date
- Select quiz time
- Set timezone
- Registration deadline (optional)

**Features:**
- Calendar date picker
- Time picker with timezone support
- Validation (must be future date)
- Registration cutoff configuration

---

#### StepFundraisingOptions.tsx (Step 6)
**Lifelines and extras** - Configure fundraising enhancements.

**Responsibilities:**
- Enable/disable lifelines (50/50, Ask Audience, Phone a Friend)
- Set lifeline prices (extra fundraising)
- Configure bonus features
- Set charity percentage for extras

**Lifeline Examples:**
- **50/50**: Remove 2 incorrect answers ($5)
- **Ask the Audience**: Show audience poll ($3)
- **Phone a Friend**: Call a helper ($7)

**Fundraising Model:**
Players pay extra for lifelines → Additional funds to charity/prizes

---

#### StepPaymentMethod.tsx (Step 7)
**Payment configuration** - Set up payment collection.

**Web2 Mode:**
- Manual payment tracking
- Payment instructions for players
- Receipt generation

**Web3 Mode:**
- Select token (SOL, USDC, etc.)
- Set entry fee amount
- Configure blockchain parameters

---

#### StepReviewLaunch.tsx (Step 8)
**Final review and launch** - Review all settings and create quiz.

**Responsibilities:**
- Display complete configuration summary
- Allow editing (go back to specific step)
- Final confirmation
- Create quiz (emit socket event or blockchain transaction)

**Summary Sections:**
1. Game Type (Web2/Web3)
2. Host Information
3. Prize Structure
4. Round Settings
5. Schedule
6. Fundraising Options
7. Payment Method

**Actions:**
- Edit (navigate to step)
- Cancel (discard configuration)
- Launch Quiz (create and start)

---

### Dashboard Components (`dashboard/`)

The host dashboard provides real-time management during quiz setup and gameplay.

#### HostDashboard.tsx
**Main dashboard orchestrator** - Central control center for hosts.

**Responsibilities:**
- Display quiz configuration
- Show player list with join status
- Manage fundraising extras
- Track payments (Web2) or blockchain transactions (Web3)
- Start/pause/resume quiz
- Monitor real-time game progress

**Key Features:**
- Tabbed or paneled layout
- Real-time updates via WebSocket
- Quick actions (start game, pause, end)
- Statistics overview (players, funds raised, etc.)

**Used By:** `pages/QuizHostDashboard.tsx`

---

#### SetupSummaryPanel.tsx
**Configuration summary panel** - Read-only display of quiz settings.

**Responsibilities:**
- Show quiz configuration (read-only)
- Display schedule and timing
- Show prize structure
- Display lifeline settings

**Use Case:** Quick reference during game management

---

#### PlayerListPanel.tsx
**Player management panel** - Real-time player list with actions.

**Responsibilities:**
- Display all registered players
- Show payment status (Web2) or transaction status (Web3)
- Allow host to kick players (before game starts)
- Show player join time and email/wallet

**Key Features:**
- Real-time updates (new players appear instantly)
- Payment verification indicators
- Player actions (remove, send message)
- Export player list (CSV)

---

#### FundraisingExtrasPanel.tsx
**Lifelines and extras management** - Track lifeline usage and revenue.

**Responsibilities:**
- Display available lifelines
- Show lifeline purchase history
- Calculate extra funds raised
- Real-time lifeline usage during game

**Metrics:**
- Total lifeline revenue
- Most popular lifeline
- Players who purchased lifelines
- Charity allocation from extras

---

#### PaymentReconciliation.tsx
**Payment tracking** - Reconcile payments for Web2 mode or verify blockchain transactions for Web3.

**Responsibilities:**
- Track entry fee payments
- Reconcile lifeline purchases
- Display outstanding payments
- Generate payment reports
- Verify blockchain transactions (Web3)

**Web2 Mode:**
- Manual payment tracking
- Mark payments as received
- Generate receipts
- Export payment list

**Web3 Mode:**
- Display blockchain transaction hashes
- Verify on-chain payments
- Show transaction confirmations
- Link to Solana explorer

---

#### OptionalContractPanel.tsx
**Blockchain integration panel** - Configure and monitor smart contract integration.

**Responsibilities:**
- Enable/disable blockchain mode
- Display contract address
- Show contract status (initialized, active, completed)
- Monitor prize pool on-chain
- Trigger contract operations (distribute prizes, etc.)

**Features:**
- Contract verification
- Prize pool display (on-chain balance)
- Transaction history
- Emergency controls (pause contract)

---

### Join Room Components (`joinroom/`)

#### JoinQuizModal.tsx
**Join modal wrapper** - Routes to Web2 or Web3 join flow.

**Responsibilities:**
- Display join modal
- Route to appropriate join component (Web2/Web3)
- Handle room code input
- Verify room exists

**Flow:**
1. Enter room code
2. Fetch room details (socket event)
3. Determine game type (Web2/Web3)
4. Route to appropriate join component

---

#### JoinQuizWeb2Page.tsx
**Email-based join flow** - Join without wallet.

**Responsibilities:**
- Input player name and email
- Accept terms and conditions
- Submit join request (socket event)
- Display payment instructions (if entry fee)

**Key Features:**
- No wallet required
- Email validation
- Manual payment tracking
- Join confirmation

**Flow:**
1. Enter name and email
2. Accept terms
3. Submit join request
4. Receive payment instructions (if applicable)
5. Wait for host approval (optional)

---

#### JoinQuizWeb3Page.tsx
**Wallet-based join flow** - Join with Solana wallet.

**Responsibilities:**
- Connect wallet
- Display entry fee and token
- Confirm blockchain payment
- Execute join transaction

**Key Features:**
- Wallet connection (Phantom, Magic Eden, etc.)
- Balance check
- Token approval (SPL tokens)
- Transaction confirmation

**Flow:**
1. Connect wallet
2. Verify balance (must have enough for entry fee + gas)
3. Review entry fee and prize pool
4. Confirm and sign transaction
5. Wait for transaction confirmation
6. Join room (socket event emitted after tx confirmation)

---

#### Web3PaymentStep.tsx
**Blockchain payment step** - Handle entry fee payment transaction.

**Responsibilities:**
- Display entry fee details
- Build and send transaction
- Monitor transaction confirmation
- Handle errors (insufficient balance, tx failure)

**Transaction Steps:**
1. Build transaction (call `join_room` instruction)
2. Request wallet signature
3. Send transaction to blockchain
4. Wait for confirmation
5. Emit socket event on success

---

### Game Components (`game/`)

#### GameControls.tsx
**Quiz game controls** - Host controls during gameplay.

**Responsibilities:**
- Start quiz
- Next question
- Pause/resume quiz
- End quiz early
- Display current question and timer

**Key Features:**
- Real-time question display
- Timer countdown
- Question navigation (next, skip)
- Pause/resume functionality

---

### Modal Components (`modals/`)

#### TransactionStatusModal.tsx
**Transaction status display** - Show blockchain transaction progress.

**Responsibilities:**
- Display transaction status (pending, confirmed, failed)
- Show transaction hash
- Link to blockchain explorer
- Handle transaction errors

**States:**
- **Pending**: Transaction submitted, waiting for confirmation
- **Confirmed**: Transaction successful
- **Failed**: Transaction failed (reason displayed)

**Features:**
- Transaction hash with copy button
- Explorer link (Solana Explorer, Solscan)
- Retry on failure (if applicable)
- Close modal on success

---

### Common Components (`common/`)

#### BlockchainBadge.tsx
**Web3 indicator badge** - Visual indicator for blockchain-enabled features.

**Responsibilities:**
- Display "Web3" or "Blockchain" badge
- Show Solana logo or icon
- Indicate on-chain status

**Use Cases:**
- Room cards (show Web3 rooms)
- Quiz listings (highlight blockchain quizzes)
- Player profiles (show wallet-connected players)

---

### Hooks

#### useQuizConfig.ts
**Quiz configuration hook** - Manage quiz configuration state.

**Responsibilities:**
- Store quiz configuration
- Validate configuration
- Update configuration
- Persist to localStorage (draft)

**Returns:**
```typescript
{
  config: QuizConfig;
  updateConfig: (updates: Partial<QuizConfig>) => void;
  validateConfig: () => boolean;
  resetConfig: () => void;
}
```

---

#### useQuizSocket.ts
**Quiz WebSocket hook** - Manage real-time quiz communication.

**Responsibilities:**
- Connect to quiz room
- Emit quiz events (join, answer, lifeline)
- Listen to quiz events (question, timer, results)
- Handle disconnections and reconnections

**Events Emitted:**
- `join_quiz` - Player joins quiz
- `submit_answer` - Player submits answer
- `purchase_lifeline` - Player buys lifeline
- `start_quiz` - Host starts quiz (host only)

**Events Received:**
- `question_started` - New question begins
- `timer_update` - Timer countdown
- `answer_revealed` - Correct answer shown
- `leaderboard_update` - Scores updated
- `quiz_ended` - Quiz completed

---

#### joinQuizSocket.ts
**Join room socket logic** - Handle room joining via WebSocket.

**Responsibilities:**
- Verify room exists
- Fetch room details
- Emit join event
- Handle join errors (room full, already joined)

---

## Data Flow

### Quiz Configuration Flow

```
Wizard Step 1-8 → useQuizConfig Hook → Final Configuration →
Submit to Server (WebSocket) → Blockchain Transaction (Web3 only) →
Dashboard Display
```

### Player Join Flow

**Web2:**
```
JoinQuizModal → JoinQuizWeb2Page → Socket Emit (join_quiz) →
Server Adds Player → Dashboard Updates
```

**Web3:**
```
JoinQuizModal → JoinQuizWeb3Page → Connect Wallet →
Web3PaymentStep → Blockchain Transaction → Transaction Confirmed →
Socket Emit (join_quiz) → Server Adds Player → Dashboard Updates
```

### Gameplay Flow

```
Host Starts Quiz → Server Broadcasts Question →
Players Answer → Server Validates → Leaderboard Updated →
Next Question → ... → Quiz Ends → Prizes Distributed
```

## State Management

**Zustand Store (`stores/quizPlayerStore.ts`):**
```typescript
interface QuizPlayerState {
  players: Player[];
  currentQuestion: Question | null;
  leaderboard: LeaderboardEntry[];
  quizStatus: 'waiting' | 'active' | 'paused' | 'ended';
  // ... more state
}
```

## Blockchain Integration

**Smart Contract Operations (Web3 Mode Only):**

1. **Initialize Quiz**: `initialize_quiz_room` instruction
   - Host creates quiz on-chain
   - Deposits host stake (optional)

2. **Join Quiz**: `join_quiz_room` instruction
   - Player pays entry fee
   - Entry recorded on-chain

3. **Purchase Lifeline**: `purchase_lifeline` instruction
   - Player pays for lifeline
   - Funds added to prize pool/charity

4. **Distribute Prizes**: `distribute_quiz_prizes` instruction
   - After quiz ends
   - Winners receive prizes automatically
   - Charity receives allocation

## Performance Notes

**Optimization Opportunities:**
- Consider React.memo for dashboard panels
- useMemo for prize calculations
- useCallback for wizard step handlers
- Virtualize long player lists (100+ players)

## Styling

All components use **TailwindCSS** with these patterns:

**Wizard:**
- Step indicator: Progress bar with numbered steps
- Navigation: Back (gray), Next (indigo gradient)
- Validation: Red border for invalid inputs

**Dashboard:**
- Panels: Card-based layout with headers
- Tables: Striped rows for player lists
- Badges: Color-coded status indicators

**Join Flows:**
- Forms: Centered with clear labels
- Buttons: Large, accessible touch targets
- Errors: Red text with icons

## Testing

Components should be tested for:
- ✅ Wizard step navigation (forward, backward, validation)
- ✅ Form validation (required fields, formats)
- ✅ Socket event emission (correct payloads)
- ✅ Blockchain transaction success/failure
- ✅ Error handling (network errors, tx failures)

## Related Documentation

- [Component Structure](../README.md)
- [Frontend Architecture](../../README.md)
- [Quiz Player Store](../../stores/quizPlayerStore.ts)
- [Solana Program](../../../solana-program/README.md)

## Future Improvements

Potential enhancements:
- [ ] Add question bank management UI
- [ ] Implement live video streaming for host
- [ ] Add mobile app (React Native)
- [ ] Support multiple quiz formats (multiple choice, true/false, fill-in-the-blank)
- [ ] Leaderboard animations
- [ ] Social sharing (invite friends)
- [ ] Quiz templates (pre-configured quizzes)
- [ ] Analytics dashboard (quiz performance, player engagement)

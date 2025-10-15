# Game Implementation Plan

**Goal**: Add complete game functionality (Bingo + Quiz) from reference repository to current Fundraisely frontend

**Status**: Current frontend has blockchain integration (create, join, pay, distribute) but no actual game

---

## Phase 1: File Structure Analysis (1 hour)

### Tasks
1. Map all game-related files in reference repository
2. Identify dependencies between components
3. Create file copy checklist
4. Document any conflicts with existing files

### Deliverables
- File dependency tree
- Copy plan document
- Conflict resolution notes

---

## Phase 2: Core Game Logic Migration (2-3 hours)

### Copy Game Utilities
**Source**: reference/Fundraisely/src/utils/
**Target**: src/utils/

Files to copy:
1. gameLogic.ts - Bingo card generation, win checking
2. bingoClient.ts - Bingo-specific client logic

### Copy Game Types
**Source**: reference/Fundraisely/src/types/
**Target**: src/types/

Files to copy:
1. game.ts - Bingo game types
2. quiz.ts - Quiz game types

### Copy Game Store
**Source**: reference/Fundraisely/src/store/
**Target**: src/store/

Files to copy:
1. gameStore.ts - Zustand store for game state

### Copy Game Hooks
**Source**: reference/Fundraisely/src/hooks/
**Target**: src/hooks/

Files to copy:
1. useGame.ts - Bingo game hook
2. useSocket.ts - Update existing with game events (merge carefully)

### Validation
- Run TypeScript compiler
- Fix import paths
- Resolve type conflicts
- Test game logic functions independently

---

## Phase 3: Quiz Components Migration (3-4 hours)

### Quiz Game Pages
**Source**: reference/Fundraisely/src/pages/
**Target**: src/pages/

Files to copy:
1. QuizGamePlayPage.tsx - Main quiz gameplay interface
2. QuizGameWaitingPage.tsx - Pre-game lobby
3. QuizChallengePage.tsx - Quiz challenge mode

### Quiz Hooks
**Source**: reference/Fundraisely/src/components/Quiz/
**Target**: src/components/Quiz/ (new directory)

Files to copy:
1. useQuizSocket.ts - Quiz WebSocket integration
2. useQuizConfig.ts - Quiz configuration hook
3. usePlayerStore.ts - Player state management
4. joinQuizSocket.ts - Join quiz socket logic

### Quiz Components
**Source**: reference/Fundraisely/src/components/Quiz/
**Target**: src/components/Quiz/

Files to copy:
1. game/GameControls.tsx - In-game controls
2. joinroom/JoinQuizModal.tsx - Join modal
3. joinroom/JoinQuizWeb2Page.tsx - Web2 join page
4. joinroom/JoinQuizWeb3Page.tsx - Web3 join page

### Quiz Constants
**Source**: reference/Fundraisely/src/constants/
**Target**: src/constants/

Files to copy:
1. quiztypeconstants.ts - Quiz type definitions and configs

### Validation
- Test quiz question display
- Test answer submission
- Test timer countdown
- Test score calculation
- Verify WebSocket events

---

## Phase 4: Bingo Components Migration (2-3 hours)

### Bingo Game Components
**Source**: reference/Fundraisely/src/components/
**Target**: src/components/

Files to copy:
1. BingoCard.tsx - Bingo card display
2. NumberCaller.tsx - Number calling interface
3. GameScreen.tsx - Main Bingo game screen
4. GameOverScreen.tsx - End game screen
5. GameLoader.tsx - Loading screen
6. WinConfirmation.tsx - Win confirmation modal
7. WinEffects.tsx - Win animations/effects
8. WinNotification.tsx - Win notification component
9. WinnerDisplay.tsx - Winner display component
10. WinnerSection.tsx - Winner section layout

### Validation
- Test Bingo card generation
- Test number marking
- Test win detection (line, full house)
- Test winner announcement
- Verify auto-play mode

---

## Phase 5: Host Dashboard Migration (2-3 hours)

### Host Dashboard Components
**Source**: reference/Fundraisely/src/components/Quiz/dashboard/
**Target**: src/components/Quiz/dashboard/ (new directory)

Files to copy:
1. HostDashboard.tsx - Main dashboard
2. PlayerListPanel.tsx - Player list panel
3. SetupSummaryPanel.tsx - Room setup summary
4. PaymentReconciliation.tsx - Payment tracking
5. FundraisingExtrasPanel.tsx - Extras panel
6. OptionalContractPanel.tsx - Contract panel

### Host Controls
**Source**: reference/Fundraisely/src/components/
**Target**: src/components/

Files to copy:
1. GameControls.tsx - Host game controls (start/pause/end)
2. GameHeader.tsx - Game header with status

### Validation
- Test host can start game
- Test host can pause/resume game
- Test host can end game
- Test player list updates
- Test payment reconciliation display

---

## Phase 6: Quiz Wizard Migration (2-3 hours)

### Wizard Components
**Source**: reference/Fundraisely/src/components/Quiz/Wizard/
**Target**: src/components/Quiz/Wizard/ (new directory)

Files to copy:
1. QuizWizard.tsx - Main wizard component
2. StepGameType.tsx - Select game type (Bingo/Quiz)
3. StepRoundSettings.tsx - Configure rounds
4. StepFundraisingOptions.tsx - Fundraising config
5. StepPrizes.tsx - Prize configuration
6. StepHostInfo.tsx - Host information
7. StepPaymentMethod.tsx - Payment method selection
8. StepSchedule.tsx - Schedule game
9. StepReviewLaunch.tsx - Review and launch
10. WizardStepProps.ts - Wizard type definitions

### Integration
- Replace existing CreateRoomPage or add as alternative
- Wire up wizard to blockchain createRoom function
- Map wizard data to smart contract parameters

### Validation
- Test full wizard flow
- Test data validation at each step
- Test blockchain integration
- Test navigation between steps

---

## Phase 7: WebSocket Server Updates (2-3 hours)

### Server Updates Needed
**Location**: backend-websocket/src/server.ts

New events to implement:
1. Quiz Events:
   - join_quiz_room
   - submit_survivor_answer
   - request_clue
   - start_quiz
   - next_question
   - round_complete

2. Bingo Events:
   - call_number
   - player_line_won
   - player_full_house_won
   - verify_win
   - declare_winners

3. Host Events:
   - start_game
   - pause_game
   - unpause_game
   - end_game
   - kick_player

### Server Logic to Add
1. Quiz question management
2. Timer management
3. Score calculation
4. Round progression
5. Bingo number calling (random, no repeats)
6. Win verification
7. Winner announcement

### Validation
- Test all WebSocket events
- Test event broadcasting to all players
- Test room isolation (events only to room members)
- Test reconnection handling
- Load test with 10+ concurrent players

---

## Phase 8: Route Integration (1-2 hours)

### Update App Router
**Location**: src/App.tsx

Add new routes:
1. /quiz/waiting/:roomId - Quiz waiting lobby
2. /quiz/play/:roomId/:playerId - Quiz gameplay
3. /quiz/challenge/:roomId - Quiz challenge mode
4. /bingo/play/:roomId - Bingo game
5. /game/:roomId - Generic game router (detects game type)
6. /host/dashboard/:roomId - Host dashboard

### Update Navigation
- Add game type selection to room creation
- Add proper redirects after room join
- Add game exit/leave room flow
- Add back to lobby navigation

### Validation
- Test all route transitions
- Test deep linking
- Test browser back button
- Test route guards (auth required)

---

## Phase 9: Integration with Blockchain (2-3 hours)

### Connect Game Events to Blockchain

**When game ends**:
1. Calculate final scores/winners
2. Call declareWinners with winner wallets
3. Display winner confirmation
4. Host calls endRoom to distribute funds
5. Show distribution breakdown

**Update RoomPage.tsx**:
1. Detect game type from Room.prize_mode or add game_type field
2. Redirect to appropriate game component
3. Pass blockchain data to game components
4. Handle game end -> blockchain distribution flow

**Update Game Components**:
1. Accept room data as props
2. Display charity info during game
3. Show running total of funds raised
4. Display prize breakdown
5. Show winner wallets after game

### Validation
- Test full flow: create -> join -> play -> win -> distribute
- Verify winner addresses match game results
- Verify funds distributed correctly
- Test with multiple players
- Test edge cases (no winners, tie, disconnect)

---

## Phase 10: UI/UX Polish (2-3 hours)

### Design Consistency
1. Match color scheme between game and blockchain UI
2. Consistent button styles
3. Consistent typography
4. Consistent spacing/layout
5. Mobile responsive design

### Loading States
1. Add loading spinners for blockchain operations
2. Add loading screens for game initialization
3. Add skeleton loaders for data fetching

### Error Handling
1. Display user-friendly error messages
2. Handle WebSocket disconnections gracefully
3. Handle blockchain transaction failures
4. Add retry mechanisms

### Animations
1. Win animations (confetti, fireworks)
2. Number calling animations (Bingo)
3. Question transitions (Quiz)
4. Timer animations
5. Score update animations

### Validation
- Test on mobile devices
- Test on different screen sizes
- Test with slow network
- Test error scenarios
- Get user feedback

---

## Phase 11: Testing (2-3 hours)

### Manual Testing Checklist

**Bingo Game**:
- [ ] Create Bingo room with blockchain
- [ ] 3+ players join and pay entry fee
- [ ] Host starts game
- [ ] Numbers called automatically
- [ ] Players mark cards
- [ ] Line win detected and verified
- [ ] Full house win detected and verified
- [ ] Host declares winners on blockchain
- [ ] Host distributes funds
- [ ] Verify all transfers on Solana Explorer

**Quiz Game**:
- [ ] Create Quiz room with blockchain
- [ ] 3+ players join and pay entry fee
- [ ] Players wait in lobby
- [ ] Host starts quiz
- [ ] Questions display with timer
- [ ] Players submit answers
- [ ] Scores calculated correctly
- [ ] Multiple rounds work
- [ ] Final scores determine winners
- [ ] Host declares winners on blockchain
- [ ] Host distributes funds
- [ ] Verify all transfers on Solana Explorer

**Edge Cases**:
- [ ] Player disconnects mid-game
- [ ] Host disconnects mid-game
- [ ] No winners (everyone loses)
- [ ] Tie scores
- [ ] Player tries to join after game started
- [ ] Blockchain transaction fails
- [ ] WebSocket server restarts

### Automated Testing
1. Write unit tests for game logic
2. Write integration tests for WebSocket events
3. Write E2E tests for full game flow
4. Add CI/CD pipeline

---

## Phase 12: Documentation (1-2 hours)

### User Documentation
1. How to create a room (Bingo vs Quiz)
2. How to join a game
3. How to play Bingo
4. How to play Quiz
5. How winners are determined
6. How funds are distributed
7. Troubleshooting guide

### Developer Documentation
1. Architecture overview
2. Component hierarchy
3. WebSocket event flow
4. Blockchain integration points
5. Adding new game types
6. Configuration options
7. Deployment guide

### Files to Create
1. USER_GUIDE.md
2. DEVELOPER_GUIDE.md
3. GAME_ARCHITECTURE.md
4. WEBSOCKET_EVENTS.md
5. DEPLOYMENT.md

---

## Phase 13: Deployment (1-2 hours)

### Pre-Deployment Checklist
- [ ] All TypeScript errors resolved
- [ ] All tests passing
- [ ] WebSocket server running on production
- [ ] Environment variables configured
- [ ] Smart contract deployed to mainnet (or keep devnet)
- [ ] Frontend built for production
- [ ] Domain/hosting configured

### Deployment Steps
1. Deploy WebSocket server to cloud (Railway, Heroku, AWS)
2. Update frontend WebSocket URL to production server
3. Build frontend for production (npm run build)
4. Deploy frontend to hosting (Vercel, Netlify, AWS S3)
5. Update environment variables
6. Test production deployment
7. Monitor error logs

### Post-Deployment
1. Monitor WebSocket connections
2. Monitor blockchain transactions
3. Monitor user feedback
4. Fix any production bugs
5. Create rollback plan

---

## Time Estimates

**Total Implementation Time**: 25-35 hours

**Breakdown**:
- Phase 1: File Analysis - 1 hour
- Phase 2: Core Logic - 2-3 hours
- Phase 3: Quiz Components - 3-4 hours
- Phase 4: Bingo Components - 2-3 hours
- Phase 5: Host Dashboard - 2-3 hours
- Phase 6: Quiz Wizard - 2-3 hours
- Phase 7: WebSocket Server - 2-3 hours
- Phase 8: Routes - 1-2 hours
- Phase 9: Blockchain Integration - 2-3 hours
- Phase 10: UI/UX Polish - 2-3 hours
- Phase 11: Testing - 2-3 hours
- Phase 12: Documentation - 1-2 hours
- Phase 13: Deployment - 1-2 hours

**Recommended Schedule**:
- Sprint 1 (Week 1): Phases 1-4 (Core game functionality)
- Sprint 2 (Week 2): Phases 5-7 (Host controls, WebSocket)
- Sprint 3 (Week 3): Phases 8-10 (Integration, Polish)
- Sprint 4 (Week 4): Phases 11-13 (Testing, Docs, Deploy)

---

## Risk Assessment

**High Risk**:
1. WebSocket server stability under load
   - Mitigation: Load testing, horizontal scaling
2. Blockchain transaction failures during game
   - Mitigation: Retry logic, fallback mechanisms
3. Player disconnections mid-game
   - Mitigation: Reconnection handling, state persistence

**Medium Risk**:
1. Type conflicts between reference and current code
   - Mitigation: Careful merging, TypeScript strict mode
2. Different WebSocket library versions
   - Mitigation: Version alignment, compatibility testing
3. Mobile responsiveness issues
   - Mitigation: Mobile-first design, thorough testing

**Low Risk**:
1. UI inconsistencies
   - Mitigation: Design system, component library
2. Documentation gaps
   - Mitigation: Code comments, README updates

---

## Dependencies

**Required**:
- socket.io-client (already installed)
- zustand (for game store)
- React Router v6 (already installed)
- Solana Web3.js (already installed)
- Anchor (already installed)

**Optional**:
- framer-motion (for animations)
- react-confetti (for win effects)
- react-countdown (for timers)

---

## Success Criteria

**Phase Complete When**:
1. Can create both Bingo and Quiz rooms
2. Multiple players can join and play simultaneously
3. Game logic works correctly (scoring, winning)
4. Winners automatically determined
5. Blockchain distribution works after game
6. No critical bugs
7. Acceptable performance (low latency)
8. Documentation complete
9. Deployed to production

**Metrics**:
- Game completion rate > 90%
- WebSocket latency < 200ms
- Blockchain transaction success rate > 95%
- Zero critical bugs in production
- User satisfaction score > 4/5

---

## Next Steps

1. Review this plan with team
2. Get approval to proceed
3. Set up project tracking (Jira, Linear, etc.)
4. Assign phases to team members
5. Start with Phase 1: File Analysis
6. Daily standups to track progress
7. Weekly demos to stakeholders

---

**Document Version**: 1.0
**Created**: 2025-10-15
**Author**: Claude Code Analysis
**Status**: Ready for Implementation

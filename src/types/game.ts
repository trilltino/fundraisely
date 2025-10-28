/**
 * Bingo Game Type Definitions
 *
 * **Purpose:**
 * Defines the core TypeScript interfaces for Bingo gameplay, including card structure,
 * game state, room state, and player data. These types ensure type safety across the
 * entire client-side game implementation and provide IntelliSense for developers.
 *
 * **Type Categories:**
 * 1. **BingoCell** - Individual cell on a 5x5 Bingo card
 * 2. **WinResult** - Result of win detection algorithm
 * 3. **GameState** - Client-side game state (per player)
 * 4. **RoomState** - Server-synchronized room state (shared by all players)
 * 5. **Player** - Player metadata and ready status
 *
 * **Usage Context:**
 * - Used by: All Bingo components, hooks, and stores
 * - Shared between: Client-side React, Socket.io events, Zustand stores
 * - NOT used by: Solana program (has its own Rust types)
 *
 * **Type Safety Benefits:**
 * - Compile-time error detection for invalid game state
 * - IntelliSense autocomplete in VS Code
 * - Refactoring safety (rename propagates)
 * - Self-documenting code (types = inline docs)
 *
 * **Integration Points:**
 * - `useGame.ts`: Uses GameState for local player state
 * - `gameStateStore.ts`: Uses RoomState for global state
 * - `playerStore.ts`: Uses Player for player list
 * - `gameLogic.ts`: Uses BingoCell and WinResult
 * - Socket events: Serialized/deserialized to these types
 *
 * @module types/game
 * @category Type Definitions
 */

/**
 * BingoCell - Single Cell on 5x5 Bingo Card
 *
 * Represents one of the 25 cells on a Bingo card. Each cell contains a number (1-75)
 * and tracks whether the player has marked it when called.
 *
 * **Fields:**
 * - `number`: The Bingo number in this cell (1-75, distributed by column)
 * - `marked`: Whether the player has marked this cell (clicked when number was called)
 *
 * **Array Structure:**
 * A Bingo card is `BingoCell[25]` indexed by column-first order:
 * - Indices 0-4: B column (numbers 1-15)
 * - Indices 5-9: I column (numbers 16-30)
 * - Indices 10-14: N column (numbers 31-45)
 * - Indices 15-19: G column (numbers 46-60)
 * - Indices 20-24: O column (numbers 61-75)
 *
 * **Example:**
 * ```typescript
 * const cell: BingoCell = {
 *   number: 42, // In N column (31-45)
 *   marked: true // Player marked when 42 was called
 * };
 * ```
 */
export interface BingoCell {
  number: number;
  marked: boolean;
}

/**
 * WinResult - Result of Win Detection Algorithm
 *
 * Returned by `checkWin()` in gameLogic.ts to indicate whether a player has achieved
 * a line win, full house, or no win yet.
 *
 * **Win Types:**
 * - `'none'`: No win detected (game continues)
 * - `'line'`: Player completed a line (row, column, or diagonal)
 * - `'full_house'`: Player marked all 25 cells
 *
 * **Fields:**
 * - `type`: The type of win detected
 * - `pattern`: (Optional) Array of cell indices that form the winning pattern
 *
 * **Pattern Indices:**
 * For line wins, pattern contains the 5 indices that form the line:
 * - Row 0: [0, 5, 10, 15, 20]
 * - Column 0: [0, 1, 2, 3, 4]
 * - Diagonal: [0, 6, 12, 18, 24] or [4, 8, 12, 16, 20]
 *
 * **Example:**
 * ```typescript
 * const result: WinResult = {
 *   type: 'line',
 *   pattern: [0, 6, 12, 18, 24] // Top-left to bottom-right diagonal
 * };
 * ```
 */
export interface WinResult {
  type: 'none' | 'line' | 'full_house';
  pattern?: number[];
}

/**
 * GameState - Client-Side Per-Player Game State
 *
 * Manages the local game state for a single player. This is ephemeral state stored in
 * React component state (via useGame hook) and NOT synchronized with the server or
 * other players. Each player has their own unique GameState instance.
 *
 * **State Lifecycle:**
 * 1. Initialized when player joins room (card generated client-side)
 * 2. Updated when numbers called (calledNumbers array grows, currentNumber changes)
 * 3. Updated when player marks cells (card.marked values toggle)
 * 4. Reset when new game starts
 *
 * **Fields:**
 * - `card`: Player's unique 25-cell Bingo card (generated randomly)
 * - `calledNumbers`: All numbers called so far (synced from server)
 * - `currentNumber`: Most recently called number (synced from server)
 * - `hasWonLine`: Whether this player has won line prize (prevents duplicate claims)
 * - `hasWonFullHouse`: Whether this player has won full house (game-ending flag)
 *
 * **vs. RoomState:**
 * - GameState: Per-player, local, includes player's unique card
 * - RoomState: Shared, global, synced across all players
 *
 * **Example:**
 * ```typescript
 * const [gameState, setGameState] = useState<GameState>({
 *   card: generateBingoCard(), // 25 random cells
 *   calledNumbers: [],
 *   currentNumber: null,
 *   hasWonLine: false,
 *   hasWonFullHouse: false,
 * });
 * ```
 */
export interface GameState {
  card: BingoCell[];
  calledNumbers: number[];
  currentNumber: number | null;
  hasWonLine: boolean;
  hasWonFullHouse: boolean;
}

/**
 * RoomState - Server-Synchronized Global Room State
 *
 * Represents the complete state of a Bingo game room, synchronized across all players
 * via WebSocket events. This is the "source of truth" managed by the Node.js server
 * and broadcast to all connected clients.
 *
 * **State Lifecycle:**
 * 1. Created when host creates room (server-side)
 * 2. Updated when players join/ready up (player list changes)
 * 3. Updated when game starts (gameStarted = true)
 * 4. Updated when numbers called (calledNumbers, currentNumber)
 * 5. Updated when winners declared (lineWinners, fullHouseWinners)
 *
 * **Fields:**
 * - `players`: List of all players in room (see Player interface)
 * - `gameStarted`: Whether game has started (numbers being called)
 * - `currentNumber`: Most recently called number (null before game starts)
 * - `calledNumbers`: All numbers called this game (empty before start)
 * - `autoPlay`: Auto-play mode enabled (numbers called every 3s)
 * - `lineWinners`: Players who won line prize (first to complete line)
 * - `fullHouseWinners`: Players who won full house (all 25 cells)
 * - `isPaused`: Game paused state (host can pause/unpause)
 * - `lineWinClaimed`: Line prize claimed (prevents additional line wins)
 *
 * **Socket Synchronization:**
 * Server emits 'room_update' events containing RoomState, which updates Zustand stores:
 * ```typescript
 * socket.on('room_update', (roomState: RoomState) => {
 *   useGameStateStore.setState(roomState);
 *   usePlayerStore.setState({ players: roomState.players });
 * });
 * ```
 *
 * **vs. GameState:**
 * - RoomState: Shared across all players, synced via WebSocket
 * - GameState: Per-player, local, includes unique Bingo card
 */
export interface RoomState {
  players: Player[];
  gameStarted: boolean;
  currentNumber: number | null;
  calledNumbers: number[];
  autoPlay: boolean;
  lineWinners: { id: string; name: string }[];
  fullHouseWinners: { id: string; name: string }[];
  isPaused: boolean;
  lineWinClaimed: boolean;
}

/**
 * Player - Individual Player Metadata
 *
 * Represents a single player in a Bingo room, including their identity, role, ready status,
 * and Bingo card (after game starts).
 *
 * **Player Roles:**
 * - Host (isHost: true): Room creator, can start game, manage settings
 * - Player (isHost: false): Participant, must ready up before game starts
 *
 * **Ready States:**
 * - Not Ready (isReady: false): Player hasn't clicked "Ready Up" button
 * - Ready (isReady: true): Player is ready to start game
 * - Host: Always considered ready (auto-ready)
 *
 * **Card Distribution:**
 * - Before game starts: `card = null` (no card generated yet)
 * - After game starts: `card = BingoCell[25]` (unique card for this player)
 * - Cards generated client-side when 'game_started' event received
 *
 * **Fields:**
 * - `id`: Unique player identifier (socket.id or user ID)
 * - `name`: Display name entered by player
 * - `isHost`: Whether this player created the room
 * - `isReady`: Whether player has readied up for game start
 * - `card`: Player's Bingo card (null until game starts)
 *
 * **Example:**
 * ```typescript
 * const player: Player = {
 *   id: 'socket-abc123',
 *   name: 'Alice',
 *   isHost: false,
 *   isReady: true,
 *   card: null, // Card assigned when game starts
 * };
 * ```
 *
 * **Usage in Components:**
 * ```typescript
 * players.map(player => (
 *   <PlayerCard
 *     key={player.id}
 *     name={player.name}
 *     isHost={player.isHost}
 *     isReady={player.isReady}
 *     isCurrent={player.id === currentPlayerId}
 *   />
 * ))
 * ```
 */
export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  card: BingoCell[] | null;
}
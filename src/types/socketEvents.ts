/**
 * Socket Event Type Definitions - Type-Safe WebSocket Communication
 *
 * **Purpose:**
 * Provides comprehensive type-safe schemas for all Socket.io events using Zod validation.
 * Eliminates `any` types and runtime errors by validating all client/server messages.
 *
 * **Architecture Benefits:**
 * 1. **Type Safety**: TypeScript types inferred from Zod schemas (single source of truth)
 * 2. **Runtime Validation**: Server validates incoming events, preventing invalid data
 * 3. **Error Messages**: Descriptive validation errors help debug client issues
 * 4. **Self-Documentation**: Schemas document expected event structure
 * 5. **Refactoring Safety**: Breaking changes caught at compile time
 *
 * **Event Categories:**
 * - **Room Management**: create_room, join_room, verify_room_exists
 * - **Quiz Management**: create_quiz_room, join_quiz_room, verify_quiz_room
 * - **Game Control**: start_game, pause_game, unpause_game, game_over
 * - **Game Actions**: toggle_ready, call_number, toggle_auto_play
 * - **Server Responses**: room_update, game_started, game_ended, *_error
 *
 * **Usage Pattern:**
 *
 * **Client (Emitting):**
 * ```typescript
 * import { JoinQuizRoomSchema, type JoinQuizRoomEvent } from '@/types/socketEvents';
 *
 * const payload: JoinQuizRoomEvent = {
 *   roomId: 'abc123',
 *   user: { id: 'p1', name: 'Alice', paid: true, paymentMethod: 'web3' },
 *   role: 'player',
 * };
 *
 * // Validate before sending (optional client-side check)
 * const result = JoinQuizRoomSchema.safeParse(payload);
 * if (result.success) {
 *   socket.emit('join_quiz_room', payload);
 * }
 * ```
 *
 * **Server (Receiving):**
 * ```javascript
 * import { JoinQuizRoomSchema } from '../types/socketEvents.js';
 *
 * socket.on('join_quiz_room', (data) => {
 *   const result = JoinQuizRoomSchema.safeParse(data);
 *   if (!result.success) {
 *     socket.emit('quiz_error', { message: result.error.message });
 *     return;
 *   }
 *
 *   const validatedData = result.data;
 *   // Safe to use validatedData - guaranteed to match schema
 * });
 * ```
 *
 * **Server (Emitting):**
 * ```javascript
 * import { RoomUpdateSchema, type RoomUpdate } from '../types/socketEvents.js';
 *
 * const update: RoomUpdate = {
 *   roomId: 'abc123',
 *   players: [...],
 *   gameStarted: false,
 *   gameEnded: false,
 * };
 *
 * io.to(roomId).emit('room_update', update);
 * ```
 *
 * **Integration with Existing Code:**
 * - Replace `any` types in socket event handlers
 * - Add validation at event handler entry points
 * - Use inferred TypeScript types for component props
 * - Gradual migration: start with high-risk events (payments, game control)
 *
 * **Validation Error Handling:**
 * Zod provides structured error messages:
 * ```typescript
 * {
 *   success: false,
 *   error: {
 *     issues: [
 *       { path: ['user', 'name'], message: 'Required' },
 *       { path: ['roomId'], message: 'String must contain at least 3 character(s)' }
 *     ]
 *   }
 * }
 * ```
 *
 * @module SocketEvents
 * @category Type Definitions
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Room identifier - minimum 3 characters for uniqueness.
 */
const RoomIdSchema = z.string().min(3, 'Room ID must be at least 3 characters');

/**
 * Solana wallet address - base58 encoded public key (32-44 characters typical).
 */
const SolanaAddressSchema = z.string().min(32).max(44);

/**
 * Ethereum wallet address - hex encoded with 0x prefix (42 characters).
 */
const EthAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

/**
 * Generic wallet address - supports multiple chains.
 */
const WalletAddressSchema = z.string().min(26);

/**
 * Blockchain transaction hash/signature.
 * - Solana: base58 encoded (87-88 chars)
 * - Ethereum: 0x-prefixed hex (66 chars)
 */
const TxHashSchema = z.string().min(64);

/**
 * Player name - 1-32 characters, prevents empty names.
 */
const PlayerNameSchema = z.string().min(1).max(32);

/**
 * Entry fee amount - non-negative number as string (to preserve decimal precision).
 */
const EntryFeeSchema = z.string().regex(/^\d+(\.\d+)?$/).optional();

/**
 * Payment method type.
 */
const PaymentMethodSchema = z.enum(['cash', 'web3', 'stripe']);

/**
 * Blockchain network identifier.
 */
const BlockchainSchema = z.enum(['solana', 'ethereum', 'base', 'polygon', 'stellar']);

// ============================================================================
// ROOM MANAGEMENT EVENTS (Bingo/Generic Games)
// ============================================================================

/**
 * Event: create_room (Client → Server)
 *
 * Host creates a new game room with optional blockchain integration.
 */
export const CreateRoomSchema = z.object({
  roomId: RoomIdSchema,
  playerName: PlayerNameSchema.optional(),
  walletAddress: WalletAddressSchema,
  contractAddress: z.string().optional(), // On-chain room address (if deployed)
  entryFee: EntryFeeSchema,
});
export type CreateRoomEvent = z.infer<typeof CreateRoomSchema>;

/**
 * Event: join_room (Client → Server)
 *
 * Player joins an existing game room.
 */
export const JoinRoomSchema = z.object({
  roomId: RoomIdSchema,
  playerName: PlayerNameSchema.optional(),
  walletAddress: WalletAddressSchema.optional(),
});
export type JoinRoomEvent = z.infer<typeof JoinRoomSchema>;

/**
 * Event: verify_room_exists (Client → Server)
 *
 * Client checks if room exists before joining.
 */
export const VerifyRoomExistsSchema = z.object({
  roomId: RoomIdSchema,
});
export type VerifyRoomExistsEvent = z.infer<typeof VerifyRoomExistsSchema>;

/**
 * Event: room_verification_result (Server → Client)
 *
 * Response to verify_room_exists with room metadata.
 */
export const RoomVerificationResultSchema = z.object({
  roomId: RoomIdSchema,
  exists: z.boolean(),
  chainId: z.number().optional(),
  contractAddress: z.string().optional(),
  namespace: z.string().optional(),
  entryFee: EntryFeeSchema,
});
export type RoomVerificationResult = z.infer<typeof RoomVerificationResultSchema>;

// ============================================================================
// QUIZ ROOM EVENTS
// ============================================================================

/**
 * Quiz configuration schema - subset of QuizConfig from quiz.ts.
 */
export const QuizConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  hostName: z.string().optional(),
  entryFee: z.string().optional(),
  currencySymbol: z.string().default('$'),
  paymentMethod: PaymentMethodSchema.default('cash'),
  // Web3 fields
  web3Chain: BlockchainSchema.optional(),
  web3Currency: z.string().optional(), // e.g., "USDC", "SOL"
  solanaCluster: z.enum(['devnet', 'testnet', 'mainnet-beta']).optional(),
  roomContractAddress: z.string().optional(), // On-chain room PDA
  // Fundraising extras
  fundraisingPrices: z.record(z.string(), z.number()).optional(),
});
export type QuizConfigEvent = z.infer<typeof QuizConfigSchema>;

/**
 * Event: create_quiz_room (Client → Server)
 *
 * Host creates a new quiz room with configuration.
 */
export const CreateQuizRoomSchema = z.object({
  roomId: RoomIdSchema,
  hostId: z.string().optional(),
  config: QuizConfigSchema,
});
export type CreateQuizRoomEvent = z.infer<typeof CreateQuizRoomSchema>;

/**
 * Event: verify_quiz_room (Client → Server)
 *
 * Client verifies quiz room exists and retrieves config.
 */
export const VerifyQuizRoomSchema = z.object({
  roomId: RoomIdSchema,
});
export type VerifyQuizRoomEvent = z.infer<typeof VerifyQuizRoomSchema>;

/**
 * Event: quiz_room_verification_result (Server → Client)
 *
 * Response to verify_quiz_room with full configuration.
 */
export const QuizRoomVerificationResultSchema = z.object({
  roomId: RoomIdSchema,
  exists: z.boolean(),
  config: QuizConfigSchema.optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  entryFee: EntryFeeSchema,
});
export type QuizRoomVerificationResult = z.infer<typeof QuizRoomVerificationResultSchema>;

/**
 * Player data for quiz join event.
 */
export const QuizUserSchema = z.object({
  id: z.string(),
  name: PlayerNameSchema,
  paid: z.boolean().default(false),
  paymentMethod: PaymentMethodSchema.default('cash'),
  // Web3 payment fields
  web3TxHash: TxHashSchema.optional(),
  web3Address: WalletAddressSchema.optional(),
  web3Chain: BlockchainSchema.optional(),
  // Fundraising extras
  extras: z.array(z.string()).optional(),
  extraPayments: z.record(z.string(), z.object({
    method: PaymentMethodSchema,
    amount: z.number(),
    txHash: z.string().optional(),
  })).optional(),
});
export type QuizUser = z.infer<typeof QuizUserSchema>;

/**
 * Event: join_quiz_room (Client → Server)
 *
 * Player joins quiz room with payment proof.
 */
export const JoinQuizRoomSchema = z.object({
  roomId: RoomIdSchema,
  user: QuizUserSchema,
  role: z.enum(['player', 'host']).default('player'),
});
export type JoinQuizRoomEvent = z.infer<typeof JoinQuizRoomSchema>;

/**
 * Event: quiz_player_joined (Server → Client)
 *
 * Confirmation that player successfully joined quiz room.
 */
export const QuizPlayerJoinedSchema = z.object({
  roomId: RoomIdSchema,
  playerId: z.string(),
  playerName: PlayerNameSchema,
});
export type QuizPlayerJoined = z.infer<typeof QuizPlayerJoinedSchema>;

// ============================================================================
// GAME CONTROL EVENTS
// ============================================================================

/**
 * Event: toggle_ready (Client → Server)
 *
 * Player toggles ready status in lobby.
 */
export const ToggleReadySchema = z.object({
  roomId: RoomIdSchema,
});
export type ToggleReadyEvent = z.infer<typeof ToggleReadySchema>;

/**
 * Event: start_game (Client → Server)
 *
 * Host starts the game (all players must be ready).
 */
export const StartGameSchema = z.object({
  roomId: RoomIdSchema,
});
export type StartGameEvent = z.infer<typeof StartGameSchema>;

/**
 * Event: pause_game (Client → Server)
 *
 * Host pauses the game (stops auto-play, freezes timer).
 */
export const PauseGameSchema = z.object({
  roomId: RoomIdSchema,
});
export type PauseGameEvent = z.infer<typeof PauseGameSchema>;

/**
 * Event: unpause_game (Client → Server)
 *
 * Host unpauses the game.
 */
export const UnpauseGameSchema = z.object({
  roomId: RoomIdSchema,
});
export type UnpauseGameEvent = z.infer<typeof UnpauseGameSchema>;

/**
 * Winner data for game_over event.
 */
export const WinnerSchema = z.object({
  playerId: z.string(),
  playerName: PlayerNameSchema,
  walletAddress: WalletAddressSchema.optional(),
  prizeAmount: z.number().min(0),
  rank: z.number().int().min(1).optional(),
});
export type Winner = z.infer<typeof WinnerSchema>;

/**
 * Event: game_over (Client → Server)
 *
 * Host declares game over with winner list (triggers prize distribution).
 */
export const GameOverSchema = z.object({
  roomId: RoomIdSchema,
  winners: z.array(WinnerSchema),
});
export type GameOverEvent = z.infer<typeof GameOverSchema>;

/**
 * Event: game_started (Server → Client)
 *
 * Broadcast to all players that game has started.
 */
export const GameStartedSchema = z.object({
  roomId: RoomIdSchema,
  timestamp: z.number().optional(),
});
export type GameStarted = z.infer<typeof GameStartedSchema>;

/**
 * Event: game_ended (Server → Client)
 *
 * Broadcast to all players that game has ended with winners.
 */
export const GameEndedSchema = z.object({
  roomId: RoomIdSchema,
  winners: z.array(WinnerSchema),
  timestamp: z.number().optional(),
});
export type GameEnded = z.infer<typeof GameEndedSchema>;

// ============================================================================
// GAME ACTION EVENTS (Bingo-specific)
// ============================================================================

/**
 * Event: call_number (Client → Server)
 *
 * Host manually calls a number (bingo).
 */
export const CallNumberSchema = z.object({
  roomId: RoomIdSchema,
});
export type CallNumberEvent = z.infer<typeof CallNumberSchema>;

/**
 * Event: number_called (Server → Client)
 *
 * Broadcast that a number was called.
 */
export const NumberCalledSchema = z.object({
  number: z.number().int().min(1).max(75),
  letter: z.enum(['B', 'I', 'N', 'G', 'O']),
  callIndex: z.number().int().min(0),
  calledNumbers: z.array(z.number()),
});
export type NumberCalled = z.infer<typeof NumberCalledSchema>;

/**
 * Event: toggle_auto_play (Client → Server)
 *
 * Host toggles automatic number calling.
 */
export const ToggleAutoPlaySchema = z.object({
  roomId: RoomIdSchema,
});
export type ToggleAutoPlayEvent = z.infer<typeof ToggleAutoPlaySchema>;

/**
 * Event: auto_play_update (Server → Client)
 *
 * Broadcast auto-play state change.
 */
export const AutoPlayUpdateSchema = z.object({
  autoPlay: z.boolean(),
});
export type AutoPlayUpdate = z.infer<typeof AutoPlayUpdateSchema>;

/**
 * Event: game_paused (Server → Client)
 *
 * Broadcast that game was paused.
 */
export const GamePausedSchema = z.object({
  roomId: RoomIdSchema,
  timestamp: z.number().optional(),
});
export type GamePaused = z.infer<typeof GamePausedSchema>;

/**
 * Event: game_unpaused (Server → Client)
 *
 * Broadcast that game was unpaused.
 */
export const GameUnpausedSchema = z.object({
  roomId: RoomIdSchema,
  timestamp: z.number().optional(),
});
export type GameUnpaused = z.infer<typeof GameUnpausedSchema>;

// ============================================================================
// ROOM STATE UPDATES
// ============================================================================

/**
 * Player data in room update.
 */
export const PlayerSchema = z.object({
  socketId: z.string(),
  wallet: WalletAddressSchema.optional(),
  name: PlayerNameSchema,
  isHost: z.boolean().default(false),
  isReady: z.boolean().default(false),
  paid: z.boolean().default(false),
  paymentMethod: PaymentMethodSchema.optional(),
  paymentProof: z.object({
    chain: BlockchainSchema,
    txHash: TxHashSchema,
    address: WalletAddressSchema,
    timestamp: z.number(),
  }).optional(),
  extras: z.array(z.string()).optional(),
});
export type Player = z.infer<typeof PlayerSchema>;

/**
 * Event: room_update (Server → Client)
 *
 * Broadcast full room state to all connected clients.
 */
export const RoomUpdateSchema = z.object({
  roomId: RoomIdSchema,
  hostId: z.string(),
  players: z.array(PlayerSchema),
  gameStarted: z.boolean(),
  gameEnded: z.boolean(),
  contractAddress: z.string().optional(),
  entryFee: EntryFeeSchema,
  quizConfig: QuizConfigSchema.optional(),
  isQuiz: z.boolean().optional(),
  winners: z.array(WinnerSchema).optional(),
  createdAt: z.number().optional(),
});
export type RoomUpdate = z.infer<typeof RoomUpdateSchema>;

// ============================================================================
// ERROR EVENTS
// ============================================================================

/**
 * Generic error message from server.
 */
export const ErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});
export type ErrorEvent = z.infer<typeof ErrorSchema>;

/**
 * Event: create_error (Server → Client)
 */
export const CreateErrorSchema = ErrorSchema;
export type CreateError = z.infer<typeof CreateErrorSchema>;

/**
 * Event: join_error (Server → Client)
 */
export const JoinErrorSchema = ErrorSchema;
export type JoinError = z.infer<typeof JoinErrorSchema>;

/**
 * Event: quiz_error (Server → Client)
 */
export const QuizErrorSchema = ErrorSchema;
export type QuizError = z.infer<typeof QuizErrorSchema>;

// ============================================================================
// TYPED SOCKET.IO CLIENT/SERVER INTERFACES
// ============================================================================

/**
 * Client → Server events map.
 *
 * Use with Socket.io TypeScript generics:
 * ```typescript
 * import { Socket } from 'socket.io-client';
 * import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socketEvents';
 *
 * const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url);
 * ```
 */
export interface ClientToServerEvents {
  // Room management
  create_room: (data: CreateRoomEvent) => void;
  join_room: (data: JoinRoomEvent) => void;
  verify_room_exists: (data: VerifyRoomExistsEvent) => void;

  // Quiz room management
  create_quiz_room: (data: CreateQuizRoomEvent) => void;
  join_quiz_room: (data: JoinQuizRoomEvent) => void;
  verify_quiz_room: (data: VerifyQuizRoomEvent) => void;

  // Game control
  toggle_ready: (data: ToggleReadyEvent) => void;
  start_game: (data: StartGameEvent) => void;
  pause_game: (data: PauseGameEvent) => void;
  unpause_game: (data: UnpauseGameEvent) => void;
  game_over: (data: GameOverEvent) => void;

  // Game actions
  call_number: (data: CallNumberEvent) => void;
  toggle_auto_play: (data: ToggleAutoPlayEvent) => void;
}

/**
 * Server → Client events map.
 */
export interface ServerToClientEvents {
  // Room responses
  room_created: (data: { roomId: string }) => void;
  room_update: (data: RoomUpdate) => void;
  room_verification_result: (data: RoomVerificationResult) => void;

  // Quiz responses
  quiz_room_created: (data: { roomId: string }) => void;
  quiz_player_joined: (data: QuizPlayerJoined) => void;
  quiz_room_verification_result: (data: QuizRoomVerificationResult) => void;

  // Game events
  game_started: (data: GameStarted) => void;
  game_ended: (data: GameEnded) => void;
  game_paused: (data: GamePaused) => void;
  game_unpaused: (data: GameUnpaused) => void;

  // Game actions
  number_called: (data: NumberCalled) => void;
  auto_play_update: (data: AutoPlayUpdate) => void;

  // Errors
  error: (data: ErrorEvent) => void;
  create_error: (data: CreateError) => void;
  join_error: (data: JoinError) => void;
  quiz_error: (data: QuizError) => void;
}

/**
 * Helper function to validate and parse socket events safely.
 *
 * @example
 * ```typescript
 * socket.on('join_quiz_room', (data) => {
 *   const result = validateSocketEvent(JoinQuizRoomSchema, data);
 *   if (result.success) {
 *     const validData = result.data;
 *     // Type-safe validated data
 *   } else {
 *     console.error('Validation failed:', result.error);
 *     socket.emit('quiz_error', { message: result.error.message });
 *   }
 * });
 * ```
 */
export function validateSocketEvent<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(data);
}

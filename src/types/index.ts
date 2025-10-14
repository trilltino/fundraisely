/**
 * Type Definitions Index
 *
 * Central export point for all TypeScript type definitions used throughout the application.
 * This barrel file re-exports types from specialized modules for convenient importing.
 *
 * Organization:
 * - program.types.ts: Solana program state structures
 * - api.types.ts: API request/response types
 * - ui.types.ts: UI component prop types (to be created)
 *
 * Usage:
 * ```tsx
 * // Import from index for convenience
 * import { Room, ApiResponse, Charity } from '@/types';
 *
 * // Or import from specific modules
 * import { Room } from '@/types/program.types';
 * ```
 *
 * Related Files:
 * - features/* - Consume these types
 * - store/index.ts - Uses types for state shape
 * - lib/queryKeys.ts - Uses types for query return types
 */

// Program types (Solana smart contract)
export * from './program.types';

// API types (request/response)
export * from './api.types';

// Re-export commonly used types with aliases for convenience
export type {
  Room,
  GlobalConfig,
  PlayerEntry,
  CreateRoomParams,
  JoinRoomParams,
} from './program.types';

export type {
  ApiResponse,
  RoomListResponse,
  Charity,
  CharitySearchResponse,
  WebSocketEvent,
} from './api.types';

/**
 * API Request/Response Type Definitions
 *
 * Type definitions for all API requests and responses used throughout the application.
 * This includes both the Solana program API (via Anchor) and the backend REST API
 * (Node.js/Axum). All types are validated at runtime using Zod schemas where applicable.
 *
 * Purpose:
 * - Type-safe API calls
 * - Request/response validation
 * - Error handling types
 * - WebSocket message types
 *
 * Usage:
 * ```tsx
 * import { RoomListResponse, CreateRoomRequest } from '@/types/api.types';
 *
 * const response: RoomListResponse = await fetch('/api/rooms');
 * ```
 *
 * Related Files:
 * - features/*/api/*.ts - API client implementations
 * - server/handlers/*.js - Backend handlers using these types
 * - backend-axum/src/handlers/*.rs - Axum handlers using equivalent Rust types
 */

import { PublicKey } from '@solana/web3.js';
import { Room, PlayerEntry } from './program.types';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Room list filter parameters
 */
export interface RoomListFilters {
  status?: 'ready' | 'active' | 'ended';
  host?: string;
  minPlayers?: number;
  maxPlayers?: number;
  sortBy?: 'created' | 'players' | 'prize';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Room list API response
 */
export interface RoomListResponse {
  rooms: Room[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Player entry list response
 */
export interface PlayerEntryListResponse {
  entries: PlayerEntry[];
  total: number;
}

/**
 * Fee calculation request
 */
export interface FeeCalculationRequest {
  entryFee: string; // BN as string
  hostFeeBps: number;
  prizePoolBps: number;
  playerCount: number;
  extrasTotal: string; // BN as string
}

/**
 * Fee calculation response
 */
export interface FeeCalculationResponse {
  platformFee: string; // BN as string
  hostFee: string;
  charityFromEntry: string;
  charityFromExtras: string;
  totalCharity: string;
  prizePool: string;
  breakdown: {
    platformPercent: number;
    hostPercent: number;
    charityPercent: number;
    prizePercent: number;
  };
}

/**
 * WebSocket event types
 */
export type WebSocketEvent =
  | RoomCreatedEvent
  | PlayerJoinedEvent
  | WinnersDeclaredEvent
  | RoomEndedEvent
  | RoomUpdateEvent;

/**
 * Room created event
 */
export interface RoomCreatedEvent {
  type: 'room:created';
  roomId: string;
  host: string;
  entryFee: string;
  maxPlayers: number;
  timestamp: number;
}

/**
 * Player joined event
 */
export interface PlayerJoinedEvent {
  type: 'player:joined';
  roomId: string;
  player: string;
  amountPaid: string;
  playerCount: number;
  timestamp: number;
}

/**
 * Winners declared event
 */
export interface WinnersDeclaredEvent {
  type: 'winners:declared';
  roomId: string;
  winners: string[];
  timestamp: number;
}

/**
 * Room ended event
 */
export interface RoomEndedEvent {
  type: 'room:ended';
  roomId: string;
  winners: string[];
  platformAmount: string;
  hostAmount: string;
  charityAmount: string;
  prizeAmount: string;
  totalPlayers: number;
  timestamp: number;
}

/**
 * Room update event (generic state change)
 */
export interface RoomUpdateEvent {
  type: 'room:update';
  roomId: string;
  status: string;
  playerCount: number;
  totalCollected: string;
  timestamp: number;
}

/**
 * Charity search request (The Giving Block API)
 */
export interface CharitySearchRequest {
  query: string;
  category?: string;
  limit?: number;
}

/**
 * Charity search result
 */
export interface Charity {
  id: string;
  name: string;
  description: string;
  category: string;
  walletAddress: string;
  logoUrl?: string;
  websiteUrl?: string;
  ein?: string; // Employer Identification Number (US nonprofits)
}

/**
 * Charity search response
 */
export interface CharitySearchResponse {
  charities: Charity[];
  total: number;
}

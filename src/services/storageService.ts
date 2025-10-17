/**
 * STORAGE SERVICE - Type-Safe LocalStorage Abstraction
 *
 * PURPOSE:
 * Provides a type-safe, validated abstraction over browser localStorage with proper
 * error handling, JSON serialization, and data validation. Prevents direct localStorage
 * access throughout the application, enabling easier testing and migration to other
 * storage backends (IndexedDB, session storage, etc.).
 *
 * ROLE IN APPLICATION:
 * - Centralized storage access point for all persistent data
 * - Type-safe getters/setters with runtime validation
 * - Automatic JSON serialization/deserialization
 * - Error boundary for storage quota exceeded
 * - Debug logging for development
 * - Migration utilities for schema changes
 *
 * KEY FEATURES:
 * - Type-safe keys (no magic strings)
 * - Validation on read (prevents corrupted data)
 * - Graceful error handling (never throws)
 * - Automatic cleanup of invalid data
 * - Support for complex objects
 * - TTL (time-to-live) support
 *
 * USAGE:
 * ```typescript
 * // Set data
 * storageService.setRoomId('ABC123');
 * storageService.setPlayerName('John');
 *
 * // Get data
 * const roomId = storageService.getRoomId(); // string | null
 * const playerName = storageService.getPlayerName(); // string | null
 *
 * // Remove data
 * storageService.removeRoomId();
 *
 * // Clear all app data
 * storageService.clearAll();
 * ```
 */

// Storage keys - centralized to prevent typos
export const STORAGE_KEYS = {
  // Room-related
  ROOM_ID: 'roomId',
  ROOM_CREATION: 'roomCreation',
  ROOM_JOINING: 'roomJoining',

  // Player-related
  PLAYER_NAME: 'playerName',
  WALLET_ADDRESS: 'walletAddress',

  // Contract-related
  CONTRACT_ADDRESS: 'contractAddress',

  // Payment tracking
  PAYMENT_FINALIZED: 'payment_finalized_', // Suffix with roomId

  // App state
  LAST_ACTIVE: 'lastActive',
  VERSION: 'app_version',
} as const;

// Type definitions for stored data
export interface RoomCreationData {
  roomId: string;
  walletAddress: string;
  contractAddress?: string;
  chain?: number;
  namespace?: 'solana' | 'eip155';
  entryFee?: string;
  isCreator?: boolean;
  playerName?: string;
  timestamp?: number;
}

export interface RoomJoiningData {
  roomId: string;
  walletAddress: string;
  playerName?: string;
  timestamp?: number;
}

// Validation functions
const validators = {
  string: (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0,

  roomCreation: (value: unknown): value is RoomCreationData =>
    typeof value === 'object' &&
    value !== null &&
    'roomId' in value &&
    'walletAddress' in value &&
    typeof (value as any).roomId === 'string' &&
    typeof (value as any).walletAddress === 'string',

  roomJoining: (value: unknown): value is RoomJoiningData =>
    typeof value === 'object' &&
    value !== null &&
    'roomId' in value &&
    'walletAddress' in value &&
    typeof (value as any).roomId === 'string' &&
    typeof (value as any).walletAddress === 'string',
};

class StorageService {
  private readonly prefix = 'fundraisely_';
  private readonly debug = import.meta.env.DEV;

  /**
   * Check if localStorage is available
   */
  private isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Log debug message
   */
  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[StorageService] ${message}`, data || '');
    }
  }

  /**
   * Generic get method with validation
   */
  private get<T>(key: string, validator?: (value: unknown) => value is T): T | null {
    if (!this.isAvailable()) {
      this.log(`[ERROR] localStorage not available`);
      return null;
    }

    try {
      const prefixedKey = this.getKey(key);
      const raw = localStorage.getItem(prefixedKey);

      if (raw === null) {
        this.log(` No data for key: ${key}`);
        return null;
      }

      // Try to parse as JSON first
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // If not JSON, return as string
        parsed = raw;
      }

      // Validate if validator provided
      if (validator && !validator(parsed)) {
        this.log(`️ Invalid data for key: ${key}, removing`, parsed);
        this.remove(key);
        return null;
      }

      this.log(`[COMPLETE] Retrieved: ${key}`, parsed);
      return parsed as T;
    } catch (error) {
      this.log(`[ERROR] Error reading ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic set method with serialization
   */
  private set<T>(key: string, value: T): boolean {
    if (!this.isAvailable()) {
      this.log(`[ERROR] localStorage not available`);
      return false;
    }

    try {
      const prefixedKey = this.getKey(key);
      const serialized = typeof value === 'string'
        ? value
        : JSON.stringify(value);

      localStorage.setItem(prefixedKey, serialized);
      this.log(` Saved: ${key}`, value);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.log(`[ERROR] Storage quota exceeded for ${key}`);
        console.error('[StorageService] Storage quota exceeded. Consider clearing old data.');
      } else {
        this.log(`[ERROR] Error saving ${key}:`, error);
      }
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  private remove(key: string): void {
    if (!this.isAvailable()) return;

    try {
      const prefixedKey = this.getKey(key);
      localStorage.removeItem(prefixedKey);
      this.log(`️ Removed: ${key}`);
    } catch (error) {
      this.log(`[ERROR] Error removing ${key}:`, error);
    }
  }

  // =================
  // PUBLIC API
  // =================

  /**
   * Room ID
   */
  getRoomId(): string | null {
    return this.get<string>(STORAGE_KEYS.ROOM_ID, validators.string);
  }

  setRoomId(roomId: string): boolean {
    return this.set(STORAGE_KEYS.ROOM_ID, roomId);
  }

  removeRoomId(): void {
    this.remove(STORAGE_KEYS.ROOM_ID);
  }

  /**
   * Room Creation Data
   */
  getRoomCreationData(): RoomCreationData | null {
    return this.get<RoomCreationData>(
      STORAGE_KEYS.ROOM_CREATION,
      validators.roomCreation
    );
  }

  setRoomCreationData(data: RoomCreationData): boolean {
    return this.set(STORAGE_KEYS.ROOM_CREATION, {
      ...data,
      timestamp: Date.now(),
    });
  }

  removeRoomCreationData(): void {
    this.remove(STORAGE_KEYS.ROOM_CREATION);
  }

  /**
   * Room Joining Data
   */
  getRoomJoiningData(): RoomJoiningData | null {
    return this.get<RoomJoiningData>(
      STORAGE_KEYS.ROOM_JOINING,
      validators.roomJoining
    );
  }

  setRoomJoiningData(data: RoomJoiningData): boolean {
    return this.set(STORAGE_KEYS.ROOM_JOINING, {
      ...data,
      timestamp: Date.now(),
    });
  }

  removeRoomJoiningData(): void {
    this.remove(STORAGE_KEYS.ROOM_JOINING);
  }

  /**
   * Player Name
   */
  getPlayerName(): string | null {
    return this.get<string>(STORAGE_KEYS.PLAYER_NAME, validators.string);
  }

  setPlayerName(name: string): boolean {
    return this.set(STORAGE_KEYS.PLAYER_NAME, name);
  }

  removePlayerName(): void {
    this.remove(STORAGE_KEYS.PLAYER_NAME);
  }

  /**
   * Wallet Address
   */
  getWalletAddress(): string | null {
    return this.get<string>(STORAGE_KEYS.WALLET_ADDRESS, validators.string);
  }

  setWalletAddress(address: string): boolean {
    return this.set(STORAGE_KEYS.WALLET_ADDRESS, address);
  }

  removeWalletAddress(): void {
    this.remove(STORAGE_KEYS.WALLET_ADDRESS);
  }

  /**
   * Contract Address
   */
  getContractAddress(): string | null {
    return this.get<string>(STORAGE_KEYS.CONTRACT_ADDRESS, validators.string);
  }

  setContractAddress(address: string): boolean {
    return this.set(STORAGE_KEYS.CONTRACT_ADDRESS, address);
  }

  removeContractAddress(): void {
    this.remove(STORAGE_KEYS.CONTRACT_ADDRESS);
  }

  /**
   * Payment Finalized (per room)
   */
  isPaymentFinalized(roomId: string): boolean {
    const key = `${STORAGE_KEYS.PAYMENT_FINALIZED}${roomId}`;
    const value = this.get<string>(key);
    return value === 'true';
  }

  setPaymentFinalized(roomId: string): boolean {
    const key = `${STORAGE_KEYS.PAYMENT_FINALIZED}${roomId}`;
    return this.set(key, 'true');
  }

  removePaymentFinalized(roomId: string): void {
    const key = `${STORAGE_KEYS.PAYMENT_FINALIZED}${roomId}`;
    this.remove(key);
  }

  /**
   * Clear all room-related data
   */
  clearRoomData(): void {
    this.removeRoomId();
    this.removeRoomCreationData();
    this.removeRoomJoiningData();
    this.removeContractAddress();
    this.log(' Cleared all room data');
  }

  /**
   * Clear all player-related data
   */
  clearPlayerData(): void {
    this.removePlayerName();
    this.removeWalletAddress();
    this.log(' Cleared all player data');
  }

  /**
   * Clear all app data
   */
  clearAll(): void {
    if (!this.isAvailable()) return;

    try {
      // Get all keys with our prefix
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith(this.prefix)
      );

      keys.forEach(key => localStorage.removeItem(key));
      this.log(` Cleared ${keys.length} items`);
    } catch (error) {
      this.log('[ERROR] Error clearing storage:', error);
    }
  }

  /**
   * Get all stored data (for debugging)
   */
  getAll(): Record<string, unknown> {
    if (!this.isAvailable()) return {};

    const data: Record<string, unknown> = {};
    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith(this.prefix)
    );

    keys.forEach(key => {
      const shortKey = key.replace(this.prefix, '');
      const raw = localStorage.getItem(key);
      try {
        data[shortKey] = raw ? JSON.parse(raw) : raw;
      } catch {
        data[shortKey] = raw;
      }
    });

    return data;
  }

  /**
   * Check storage size (approximate)
   */
  getStorageSize(): number {
    if (!this.isAvailable()) return 0;

    let size = 0;
    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith(this.prefix)
    );

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        size += key.length + value.length;
      }
    });

    return size; // bytes
  }

  /**
   * Cleanup old data (older than specified days)
   */
  cleanupOldData(daysOld: number = 7): void {
    if (!this.isAvailable()) return;

    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    // Check room creation/joining data for timestamps
    const roomCreation = this.getRoomCreationData();
    if (roomCreation?.timestamp && roomCreation.timestamp < cutoff) {
      this.removeRoomCreationData();
      cleaned++;
    }

    const roomJoining = this.getRoomJoiningData();
    if (roomJoining?.timestamp && roomJoining.timestamp < cutoff) {
      this.removeRoomJoiningData();
      cleaned++;
    }

    this.log(` Cleaned ${cleaned} old items`);
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;

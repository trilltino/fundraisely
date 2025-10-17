/**
 * STORAGE SERVICE TESTS
 *
 * Tests for the type-safe localStorage abstraction service.
 * Validates proper storage, retrieval, validation, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storageService, STORAGE_KEYS } from '../storageService';

describe('StorageService', () => {
  // Setup and teardown
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('Basic Storage Operations', () => {
    it('should store and retrieve room ID', () => {
      const roomId = 'TEST123';

      const setResult = storageService.setRoomId(roomId);
      const retrievedRoomId = storageService.getRoomId();

      expect(setResult).toBe(true);
      expect(retrievedRoomId).toBe(roomId);
    });

    it('should store and retrieve player name', () => {
      const playerName = 'Alice';

      storageService.setPlayerName(playerName);
      const retrieved = storageService.getPlayerName();

      expect(retrieved).toBe(playerName);
    });

    it('should store and retrieve wallet address', () => {
      const walletAddress = '0x1234567890abcdef';

      storageService.setWalletAddress(walletAddress);
      const retrieved = storageService.getWalletAddress();

      expect(retrieved).toBe(walletAddress);
    });

    it('should store and retrieve contract address', () => {
      const contractAddress = 'solana_contract_123';

      storageService.setContractAddress(contractAddress);
      const retrieved = storageService.getContractAddress();

      expect(retrieved).toBe(contractAddress);
    });

    it('should return null for non-existent keys', () => {
      expect(storageService.getRoomId()).toBeNull();
      expect(storageService.getPlayerName()).toBeNull();
      expect(storageService.getWalletAddress()).toBeNull();
    });
  });

  describe('Complex Object Storage', () => {
    it('should store and retrieve room creation data', () => {
      const roomCreationData = {
        roomId: 'ROOM123',
        walletAddress: '0xabcdef',
        contractAddress: 'contract123',
        chain: 0,
        namespace: 'solana' as const,
        entryFee: '5.00',
        isCreator: true,
      };

      storageService.setRoomCreationData(roomCreationData);
      const retrieved = storageService.getRoomCreationData();

      expect(retrieved).toEqual(roomCreationData);
    });

    it('should store and retrieve room joining data', () => {
      const roomJoiningData = {
        roomId: 'ROOM456',
        walletAddress: '0xfedcba',
        isCreator: false,
      };

      storageService.setRoomJoiningData(roomJoiningData);
      const retrieved = storageService.getRoomJoiningData();

      expect(retrieved).toEqual(roomJoiningData);
    });

    it('should return null for invalid room creation data', () => {
      // Store invalid data directly
      localStorage.setItem(
        `fundraisely_${STORAGE_KEYS.ROOM_CREATION}`,
        JSON.stringify({ invalid: 'data' })
      );

      const retrieved = storageService.getRoomCreationData();
      expect(retrieved).toBeNull();
    });
  });

  describe('Data Validation', () => {
    it('should reject invalid types', () => {
      // Store number as room ID
      localStorage.setItem(
        `fundraisely_${STORAGE_KEYS.ROOM_ID}`,
        JSON.stringify(12345)
      );

      const retrieved = storageService.getRoomId();
      expect(retrieved).toBeNull();
    });

    it('should validate room creation data structure', () => {
      // Missing required fields
      const invalidData = {
        roomId: 'ROOM123',
        // Missing walletAddress, isCreator
      };

      localStorage.setItem(
        `fundraisely_${STORAGE_KEYS.ROOM_CREATION}`,
        JSON.stringify(invalidData)
      );

      const retrieved = storageService.getRoomCreationData();
      expect(retrieved).toBeNull();
    });

    it('should validate room joining data structure', () => {
      // Invalid isCreator value (should be false)
      const invalidData = {
        roomId: 'ROOM123',
        walletAddress: '0xabc',
        isCreator: true, // Should be false for joining data
      };

      localStorage.setItem(
        `fundraisely_${STORAGE_KEYS.ROOM_JOINING}`,
        JSON.stringify(invalidData)
      );

      const retrieved = storageService.getRoomJoiningData();
      expect(retrieved).toBeNull();
    });
  });

  describe('Payment Status', () => {
    it('should set and check payment finalized status', () => {
      const roomId = 'ROOM789';

      expect(storageService.isPaymentFinalized(roomId)).toBe(false);

      storageService.setPaymentFinalized(roomId);
      expect(storageService.isPaymentFinalized(roomId)).toBe(true);
    });

    it('should handle different room IDs for payment status', () => {
      storageService.setPaymentFinalized('ROOM1');
      storageService.setPaymentFinalized('ROOM2');

      expect(storageService.isPaymentFinalized('ROOM1')).toBe(true);
      expect(storageService.isPaymentFinalized('ROOM2')).toBe(true);
      expect(storageService.isPaymentFinalized('ROOM3')).toBe(false);
    });
  });

  describe('Removal Operations', () => {
    it('should remove room creation data', () => {
      const data = {
        roomId: 'ROOM123',
        walletAddress: '0xabc',
        isCreator: true,
      };

      storageService.setRoomCreationData(data);
      expect(storageService.getRoomCreationData()).toEqual(data);

      storageService.removeRoomCreationData();
      expect(storageService.getRoomCreationData()).toBeNull();
    });

    it('should remove room joining data', () => {
      const data = {
        roomId: 'ROOM456',
        walletAddress: '0xdef',
        isCreator: false,
      };

      storageService.setRoomJoiningData(data);
      expect(storageService.getRoomJoiningData()).toEqual(data);

      storageService.removeRoomJoiningData();
      expect(storageService.getRoomJoiningData()).toBeNull();
    });
  });

  describe('Clear Operations', () => {
    it('should clear all room data', () => {
      // Set up various room-related data
      storageService.setRoomId('ROOM123');
      storageService.setPlayerName('Alice');
      storageService.setWalletAddress('0xabc');
      storageService.setContractAddress('contract123');
      storageService.setRoomCreationData({
        roomId: 'ROOM123',
        walletAddress: '0xabc',
        isCreator: true,
      });

      // Verify data is stored
      expect(storageService.getRoomId()).toBe('ROOM123');
      expect(storageService.getPlayerName()).toBe('Alice');

      // Clear room data
      storageService.clearRoomData();

      // Verify specific keys are cleared
      expect(storageService.getRoomId()).toBeNull();
      expect(storageService.getRoomCreationData()).toBeNull();

      // Player name should persist (not room-specific)
      expect(storageService.getPlayerName()).toBe('Alice');
    });

    it('should clear all data', () => {
      // Set up various data
      storageService.setRoomId('ROOM123');
      storageService.setPlayerName('Bob');
      storageService.setWalletAddress('0xdef');

      // Verify data exists
      expect(storageService.getRoomId()).toBe('ROOM123');
      expect(storageService.getPlayerName()).toBe('Bob');
      expect(storageService.getWalletAddress()).toBe('0xdef');

      // Clear all data
      storageService.clearAll();

      // Verify all data is cleared
      expect(storageService.getRoomId()).toBeNull();
      expect(storageService.getPlayerName()).toBeNull();
      expect(storageService.getWalletAddress()).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', () => {
      // Store invalid JSON
      localStorage.setItem(
        `fundraisely_${STORAGE_KEYS.ROOM_ID}`,
        'invalid json {'
      );

      const retrieved = storageService.getRoomId();
      expect(retrieved).toBeNull();
    });

    it('should not throw errors on localStorage failures', () => {
      // Mock localStorage.setItem to throw
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => {
        storageService.setRoomId('ROOM123');
      }).not.toThrow();

      // Should return false to indicate failure
      const result = storageService.setRoomId('ROOM123');
      expect(result).toBe(false);

      setItemSpy.mockRestore();
    });

    it('should handle localStorage.getItem throwing', () => {
      // Mock localStorage.getItem to throw
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      // Should not throw, should return null
      expect(() => {
        storageService.getRoomId();
      }).not.toThrow();

      const result = storageService.getRoomId();
      expect(result).toBeNull();

      getItemSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      storageService.setRoomId('');
      expect(storageService.getRoomId()).toBe('');
    });

    it('should handle whitespace-only strings', () => {
      const whitespace = '   ';
      storageService.setPlayerName(whitespace);
      expect(storageService.getPlayerName()).toBe(whitespace);
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      storageService.setContractAddress(longString);
      expect(storageService.getContractAddress()).toBe(longString);
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      storageService.setPlayerName(specialChars);
      expect(storageService.getPlayerName()).toBe(specialChars);
    });

    it('should handle unicode characters', () => {
      const unicode = '你好世界 [GAME] [LAUNCH]';
      storageService.setPlayerName(unicode);
      expect(storageService.getPlayerName()).toBe(unicode);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple set operations in sequence', () => {
      for (let i = 0; i < 100; i++) {
        storageService.setRoomId(`ROOM${i}`);
      }

      expect(storageService.getRoomId()).toBe('ROOM99');
    });

    it('should maintain data consistency across operations', () => {
      const roomId = 'ROOM123';
      const playerName = 'Alice';

      storageService.setRoomId(roomId);
      storageService.setPlayerName(playerName);

      // Multiple retrievals should be consistent
      expect(storageService.getRoomId()).toBe(roomId);
      expect(storageService.getRoomId()).toBe(roomId);
      expect(storageService.getPlayerName()).toBe(playerName);
      expect(storageService.getPlayerName()).toBe(playerName);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types at compile time', () => {
      // These should compile without errors
      const roomCreationData = {
        roomId: 'ROOM123',
        walletAddress: '0xabc',
        isCreator: true as const,
      };

      storageService.setRoomCreationData(roomCreationData);
      const retrieved = storageService.getRoomCreationData();

      // TypeScript should infer correct types
      if (retrieved) {
        expect(typeof retrieved.roomId).toBe('string');
        expect(typeof retrieved.walletAddress).toBe('string');
        expect(typeof retrieved.isCreator).toBe('boolean');
      }
    });
  });
});

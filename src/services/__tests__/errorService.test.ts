/**
 * ERROR SERVICE TESTS
 *
 * Tests for the centralized error handling service.
 * Validates error categorization, user messages, retry logic, and tracking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorService, ErrorCategory, ErrorSeverity } from '../errorService';

describe('ErrorService', () => {
  beforeEach(() => {
    // Reset service state before each test
    vi.clearAllMocks();
    errorService.clearLog();
  });

  describe('Error Categorization', () => {
    it('should categorize network errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      const appError = errorService.handleError(networkError);

      expect(appError.category).toBe(ErrorCategory.NETWORK);
      expect(appError.severity).toBe(ErrorSeverity.ERROR);
      expect(appError.userMessage).toContain('connect to the server');
    });

    it('should categorize timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      const appError = errorService.handleError(timeoutError);

      expect(appError.category).toBe(ErrorCategory.NETWORK);
      expect(appError.userMessage).toContain('took too long');
    });

    it('should categorize CORS errors', () => {
      const corsError = new Error('CORS policy blocked');
      const appError = errorService.handleError(corsError);

      expect(appError.category).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize blockchain transaction errors', () => {
      const txError = new Error('Transaction failed: insufficient funds');
      const appError = errorService.handleError(txError);

      expect(appError.category).toBe(ErrorCategory.BLOCKCHAIN);
      expect(appError.userMessage).toContain('Insufficient funds');
    });

    it('should categorize wallet connection errors', () => {
      const walletError = new Error('Wallet not connected');
      const appError = errorService.handleError(walletError);

      expect(appError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(appError.userMessage).toContain('connect your wallet');
    });

    it('should categorize validation errors', () => {
      const validationError = new Error('Invalid input');
      const appError = errorService.handleError(validationError);

      expect(appError.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should categorize rate limit errors', () => {
      const rateLimitError = new Error('Too many requests');
      const appError = errorService.handleError(rateLimitError);

      expect(appError.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(appError.userMessage).toContain('slow down');
    });

    it('should categorize not found errors', () => {
      const notFoundError = new Error('Room not found');
      const appError = errorService.handleError(notFoundError);

      expect(appError.category).toBe(ErrorCategory.NOT_FOUND);
      expect(appError.userMessage).toContain('not found');
    });

    it('should categorize conflict errors', () => {
      const conflictError = new Error('Room already exists');
      const appError = errorService.handleError(conflictError);

      expect(appError.category).toBe(ErrorCategory.CONFLICT);
      expect(appError.userMessage).toContain('already exists');
    });

    it('should default to UNKNOWN for unrecognized errors', () => {
      const unknownError = new Error('Something weird happened');
      const appError = errorService.handleError(unknownError);

      expect(appError.category).toBe(ErrorCategory.UNKNOWN);
      expect(appError.userMessage).toContain('unexpected error');
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide helpful message for network errors', () => {
      const error = new Error('Network error');
      const appError = errorService.handleError(error);

      expect(appError.userMessage).toContain('server');
      expect(appError.userMessage).toContain('internet');
    });

    it('should provide helpful message for insufficient funds', () => {
      const error = new Error('Insufficient funds for transaction');
      const appError = errorService.handleError(error);

      expect(appError.userMessage).toContain('Insufficient funds');
      expect(appError.userMessage).toContain('wallet');
    });

    it('should provide helpful message for wallet connection', () => {
      const error = new Error('Wallet connection rejected');
      const appError = errorService.handleError(error);

      expect(appError.userMessage).toContain('wallet');
      expect(appError.userMessage).toContain('connect');
    });

    it('should provide helpful message for room not found', () => {
      const error = new Error('Room TEST123 not found');
      const appError = errorService.handleError(error, {
        context: 'room_join',
        roomId: 'TEST123',
      });

      expect(appError.userMessage).toContain('not found');
    });
  });

  describe('Error Context', () => {
    it('should include context in error object', () => {
      const error = new Error('Test error');
      const context = {
        context: 'room_creation',
        roomId: 'ROOM123',
        walletAddress: '0xabc',
      };

      const appError = errorService.handleError(error, context);

      expect(appError.context).toEqual(context);
    });

    it('should include timestamp', () => {
      const error = new Error('Test error');
      const before = Date.now();

      const appError = errorService.handleError(error);

      const after = Date.now();
      expect(appError.timestamp).toBeGreaterThanOrEqual(before);
      expect(appError.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include technical message', () => {
      const errorMessage = 'Specific technical error message';
      const error = new Error(errorMessage);

      const appError = errorService.handleError(error);

      expect(appError.technicalMessage).toBe(errorMessage);
    });

    it('should include stack trace', () => {
      const error = new Error('Test error');

      const appError = errorService.handleError(error);

      expect(appError.stack).toBeDefined();
      expect(typeof appError.stack).toBe('string');
    });
  });

  describe('Retry Logic', () => {
    it('should allow retry for network errors', () => {
      const error = new Error('Network timeout');
      const appError = errorService.handleError(error);

      expect(appError.canRetry).toBe(true);
      expect(appError.retryDelay).toBeGreaterThan(0);
    });

    it('should allow retry for rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      const appError = errorService.handleError(error);

      expect(appError.canRetry).toBe(true);
      expect(appError.retryDelay).toBeGreaterThan(0);
    });

    it('should allow retry for server errors', () => {
      const error = new Error('Internal server error');
      const appError = errorService.handleError(error);

      expect(appError.canRetry).toBe(true);
    });

    it('should not allow retry for validation errors', () => {
      const error = new Error('Invalid input format');
      const appError = errorService.handleError(error);

      expect(appError.canRetry).toBe(false);
    });

    it('should not allow retry for not found errors', () => {
      const error = new Error('Resource not found');
      const appError = errorService.handleError(error);

      expect(appError.canRetry).toBe(false);
    });

    it('should provide appropriate retry delays', () => {
      const rateLimitError = new Error('Rate limit');
      const appError = errorService.handleError(rateLimitError);

      expect(appError.retryDelay).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('Severity Levels', () => {
    it('should assign WARNING severity to validation errors', () => {
      const error = new Error('Invalid input');
      const appError = errorService.handleError(error);

      expect(appError.severity).toBe(ErrorSeverity.WARNING);
    });

    it('should assign ERROR severity to network errors', () => {
      const error = new Error('Network error');
      const appError = errorService.handleError(error);

      expect(appError.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should assign CRITICAL severity to blockchain errors', () => {
      const error = new Error('Transaction failed');
      const appError = errorService.handleError(error);

      expect(appError.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('Error Creation', () => {
    it('should create error with specific category', () => {
      const appError = errorService.createError(
        ErrorCategory.VALIDATION,
        'Invalid room ID format'
      );

      expect(appError.category).toBe(ErrorCategory.VALIDATION);
      expect(appError.technicalMessage).toBe('Invalid room ID format');
      expect(appError.userMessage).toContain('information');
    });

    it('should create error with context', () => {
      const context = { roomId: 'ROOM123', userId: 'USER456' };
      const appError = errorService.createError(
        ErrorCategory.NOT_FOUND,
        'Room not found',
        context
      );

      expect(appError.category).toBe(ErrorCategory.NOT_FOUND);
      expect(appError.context).toEqual(context);
    });
  });

  describe('Error Tracking', () => {
    it('should track recent errors', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      errorService.handleError(error1);
      errorService.handleError(error2);

      const recent = errorService.getRecentErrors(10);
      expect(recent.length).toBeGreaterThanOrEqual(2);
      expect(recent[recent.length - 2].technicalMessage).toBe('Error 1');
      expect(recent[recent.length - 1].technicalMessage).toBe('Error 2');
    });

    it('should limit returned errors with limit parameter', () => {
      for (let i = 0; i < 15; i++) {
        errorService.handleError(new Error(`Error ${i}`));
      }

      const recent = errorService.getRecentErrors(5);
      expect(recent).toHaveLength(5);
    });

    it('should clear error log', () => {
      errorService.handleError(new Error('Test error'));
      expect(errorService.getRecentErrors(10).length).toBeGreaterThan(0);

      errorService.clearLog();
      expect(errorService.getRecentErrors(10)).toHaveLength(0);
    });
  });

  describe('Retry Helpers', () => {
    it('should check if error is retryable', () => {
      const networkError = new Error('Network timeout');
      const appError = errorService.handleError(networkError);

      expect(errorService.isRetryable(appError)).toBe(true);
    });

    it('should get retry delay for retryable errors', () => {
      const networkError = new Error('Connection failed');
      const appError = errorService.handleError(networkError);

      const delay = errorService.getRetryDelay(appError);
      expect(delay).toBeGreaterThan(0);
      expect(typeof delay).toBe('number');
    });

    it('should handle non-app errors gracefully', () => {
      const result = errorService.isRetryable(new Error('Some error'));
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-Error objects', () => {
      const stringError = 'Something went wrong';
      const appError = errorService.handleError(stringError);

      expect(appError.technicalMessage).toBe(stringError);
      expect(appError.category).toBeDefined();
    });

    it('should handle Error objects without message', () => {
      const error = new Error();
      const appError = errorService.handleError(error);

      expect(appError.technicalMessage).toBe('');
      expect(appError.category).toBe(ErrorCategory.UNKNOWN);
    });

    it('should handle null/undefined errors', () => {
      const appError1 = errorService.handleError(null);
      const appError2 = errorService.handleError(undefined);

      expect(appError1.category).toBe(ErrorCategory.UNKNOWN);
      expect(appError2.category).toBe(ErrorCategory.UNKNOWN);
    });

    it('should handle errors with very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);

      const appError = errorService.handleError(error);

      expect(appError.technicalMessage).toBe(longMessage);
    });

    it('should handle errors with special characters', () => {
      const specialMessage = 'Error: <script>alert("xss")</script>';
      const error = new Error(specialMessage);

      const appError = errorService.handleError(error);

      expect(appError.technicalMessage).toBe(specialMessage);
    });
  });

  describe('Specific Error Scenarios', () => {
    it('should handle socket disconnection', () => {
      const error = new Error('Socket disconnected');
      const appError = errorService.handleError(error, {
        context: 'socket_connection',
      });

      expect(appError.category).toBe(ErrorCategory.NETWORK);
      expect(appError.canRetry).toBe(true);
    });

    it('should handle room creation failure', () => {
      const error = new Error('Room already exists');
      const appError = errorService.handleError(error, {
        context: 'room_creation',
        roomId: 'ROOM123',
      });

      expect(appError.category).toBe(ErrorCategory.CONFLICT);
      expect(appError.canRetry).toBe(false);
    });

    it('should handle transaction signature failure', () => {
      const error = new Error('User rejected transaction');
      const appError = errorService.handleError(error, {
        context: 'transaction_signature',
      });

      expect(appError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(appError.canRetry).toBe(true);
    });

    it('should handle blockchain congestion', () => {
      const error = new Error('Network congestion');
      const appError = errorService.handleError(error, {
        context: 'blockchain_transaction',
      });

      expect(appError.canRetry).toBe(true);
      expect(appError.retryDelay).toBeGreaterThan(0);
    });
  });

  describe('Error Message Formatting', () => {
    it('should provide action-oriented messages', () => {
      const error = new Error('Connection failed');
      const appError = errorService.handleError(error);

      expect(appError.userMessage).toMatch(/check|try|please/i);
    });

    it('should avoid technical jargon in user messages', () => {
      const error = new Error('ETIMEDOUT socket hang up');
      const appError = errorService.handleError(error);

      expect(appError.userMessage).not.toContain('ETIMEDOUT');
      expect(appError.userMessage).not.toContain('socket');
    });

    it('should be concise and clear', () => {
      const error = new Error('Test error');
      const appError = errorService.handleError(error);

      expect(appError.userMessage.length).toBeLessThan(200);
      expect(appError.userMessage.length).toBeGreaterThan(10);
    });
  });
});

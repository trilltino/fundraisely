/**
 * ERROR SERVICE - Centralized Error Handling & Categorization
 *
 * PURPOSE:
 * Provides a centralized system for error handling, categorization, logging, and
 * user-friendly error messages. Prevents scattered error handling throughout the
 * application and ensures consistent error UX across all features.
 *
 * ROLE IN APPLICATION:
 * - Categorizes errors (network, blockchain, validation, etc.)
 * - Converts technical errors to user-friendly messages
 * - Provides retry logic suggestions
 * - Logs errors with context for debugging
 * - Tracks error patterns for monitoring
 * - Integrates with error reporting services (Sentry, etc.)
 *
 * KEY FEATURES:
 * - Error categorization with proper types
 * - User-friendly error messages
 * - Retry recommendations
 * - Context-aware error handling
 * - Error logging and tracking
 * - Integration points for external services
 *
 * USAGE:
 * ```typescript
 * try {
 *   await socket.emit('create_room', data);
 * } catch (error) {
 *   const appError = errorService.handleError(error, {
 *     context: 'room_creation',
 *     roomId: data.roomId
 *   });
 *
 *   // Show to user
 *   toast.error(appError.userMessage);
 *
 *   // Log for debugging
 *   console.error(appError.technicalMessage);
 * }
 * ```
 */

// Error categories for proper handling
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  BLOCKCHAIN = 'BLOCKCHAIN',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RATE_LIMIT = 'RATE_LIMIT',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',          // User can continue, minor issue
  MEDIUM = 'MEDIUM',    // Feature degraded, workaround available
  HIGH = 'HIGH',        // Feature broken, user needs to retry
  CRITICAL = 'CRITICAL', // App unusable, immediate attention required
}

// Standardized application error
export interface AppError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  userMessage: string;
  technicalMessage: string;
  canRetry: boolean;
  retryDelay?: number; // milliseconds
  context?: Record<string, unknown>;
  timestamp: number;
  originalError?: unknown;
}

// Error context for debugging
export interface ErrorContext {
  context: string; // e.g., 'room_creation', 'payment_processing'
  userId?: string;
  roomId?: string;
  [key: string]: unknown;
}

// Error patterns for categorization
const ERROR_PATTERNS = {
  // Network errors
  NETWORK: [
    'network',
    'fetch failed',
    'failed to fetch',
    'connection',
    'timeout',
    'cors',
    'net::',
  ],

  // Blockchain errors
  BLOCKCHAIN: [
    'transaction',
    'insufficient funds',
    'gas',
    'nonce',
    'revert',
    'solana',
    'wallet',
    'signature',
    'program',
  ],

  // Validation errors
  VALIDATION: [
    'invalid',
    'required',
    'must be',
    'expected',
    'validation',
    'format',
  ],

  // Authentication errors
  AUTH: [
    'unauthorized',
    'unauthenticated',
    'token',
    'login',
    'session',
  ],

  // Rate limit errors
  RATE_LIMIT: [
    'rate limit',
    'too many requests',
    'throttle',
  ],

  // Not found errors
  NOT_FOUND: [
    'not found',
    '404',
    'does not exist',
    'missing',
  ],

  // Conflict errors
  CONFLICT: [
    'already exists',
    'conflict',
    'duplicate',
    '409',
  ],
};

class ErrorService {
  private readonly debug = import.meta.env.DEV;
  private errorLog: AppError[] = [];
  private readonly maxLogSize = 100;

  /**
   * Main error handling method
   */
  handleError(
    error: unknown,
    context?: ErrorContext
  ): AppError {
    const appError = this.categorizeError(error, context);
    this.logError(appError);

    // In production, send to error tracking service
    if (!this.debug) {
      this.reportToService(appError);
    }

    return appError;
  }

  /**
   * Categorize error based on content
   */
  private categorizeError(
    error: unknown,
    context?: ErrorContext
  ): AppError {
    const errorMessage = this.extractMessage(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Determine category
    let category = ErrorCategory.UNKNOWN;
    if (this.matchesPattern(lowerMessage, ERROR_PATTERNS.NETWORK)) {
      category = ErrorCategory.NETWORK;
    } else if (this.matchesPattern(lowerMessage, ERROR_PATTERNS.BLOCKCHAIN)) {
      category = ErrorCategory.BLOCKCHAIN;
    } else if (this.matchesPattern(lowerMessage, ERROR_PATTERNS.VALIDATION)) {
      category = ErrorCategory.VALIDATION;
    } else if (this.matchesPattern(lowerMessage, ERROR_PATTERNS.AUTH)) {
      category = ErrorCategory.AUTHENTICATION;
    } else if (this.matchesPattern(lowerMessage, ERROR_PATTERNS.RATE_LIMIT)) {
      category = ErrorCategory.RATE_LIMIT;
    } else if (this.matchesPattern(lowerMessage, ERROR_PATTERNS.NOT_FOUND)) {
      category = ErrorCategory.NOT_FOUND;
    } else if (this.matchesPattern(lowerMessage, ERROR_PATTERNS.CONFLICT)) {
      category = ErrorCategory.CONFLICT;
    }

    // Generate user-friendly message
    const userMessage = this.getUserMessage(category, errorMessage, context);

    // Determine severity
    const severity = this.getSeverity(category);

    // Determine retry possibility
    const { canRetry, retryDelay } = this.getRetryInfo(category);

    // Generate error code
    const code = this.generateErrorCode(category, context);

    return {
      category,
      severity,
      code,
      userMessage,
      technicalMessage: errorMessage,
      canRetry,
      retryDelay,
      context: context as Record<string, unknown>,
      timestamp: Date.now(),
      originalError: error,
    };
  }

  /**
   * Extract error message from various error types
   */
  private extractMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
      if ('error' in error && typeof error.error === 'string') {
        return error.error;
      }
    }

    return 'An unknown error occurred';
  }

  /**
   * Check if message matches any pattern
   */
  private matchesPattern(message: string, patterns: string[]): boolean {
    return patterns.some(pattern => message.includes(pattern));
  }

  /**
   * Generate user-friendly error message
   */
  private getUserMessage(
    category: ErrorCategory,
    technicalMessage: string,
    context?: ErrorContext
  ): string {
    const contextName = context?.context || 'operation';

    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection and try again.';

      case ErrorCategory.BLOCKCHAIN:
        if (technicalMessage.includes('insufficient')) {
          return 'Insufficient funds in your wallet to complete this transaction.';
        }
        if (technicalMessage.includes('signature')) {
          return 'Transaction signature was rejected. Please try again.';
        }
        if (technicalMessage.includes('timeout')) {
          return 'Transaction timed out. The blockchain may be congested. Please try again.';
        }
        return 'Blockchain transaction failed. Please check your wallet and try again.';

      case ErrorCategory.VALIDATION:
        return `Invalid input: ${technicalMessage}`;

      case ErrorCategory.AUTHENTICATION:
        return 'You need to be logged in to perform this action.';

      case ErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';

      case ErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';

      case ErrorCategory.NOT_FOUND:
        if (contextName === 'room_join') {
          return 'Room not found. Please check the room code and try again.';
        }
        return 'The requested resource was not found.';

      case ErrorCategory.CONFLICT:
        if (contextName === 'room_creation') {
          return 'This room already exists. Please try joining instead.';
        }
        return 'This action conflicts with existing data.';

      case ErrorCategory.SERVER_ERROR:
        return 'Server error occurred. Please try again later.';

      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Determine error severity
   */
  private getSeverity(category: ErrorCategory): ErrorSeverity {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return ErrorSeverity.LOW;

      case ErrorCategory.NETWORK:
      case ErrorCategory.RATE_LIMIT:
        return ErrorSeverity.MEDIUM;

      case ErrorCategory.BLOCKCHAIN:
      case ErrorCategory.NOT_FOUND:
      case ErrorCategory.CONFLICT:
        return ErrorSeverity.HIGH;

      case ErrorCategory.SERVER_ERROR:
        return ErrorSeverity.CRITICAL;

      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Determine retry information
   */
  private getRetryInfo(category: ErrorCategory): {
    canRetry: boolean;
    retryDelay?: number;
  } {
    switch (category) {
      case ErrorCategory.NETWORK:
        return { canRetry: true, retryDelay: 2000 };

      case ErrorCategory.BLOCKCHAIN:
        return { canRetry: true, retryDelay: 5000 };

      case ErrorCategory.RATE_LIMIT:
        return { canRetry: true, retryDelay: 10000 };

      case ErrorCategory.SERVER_ERROR:
        return { canRetry: true, retryDelay: 5000 };

      case ErrorCategory.VALIDATION:
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.NOT_FOUND:
      case ErrorCategory.CONFLICT:
        return { canRetry: false };

      default:
        return { canRetry: true, retryDelay: 3000 };
    }
  }

  /**
   * Generate unique error code
   */
  private generateErrorCode(
    category: ErrorCategory,
    context?: ErrorContext
  ): string {
    const categoryPrefix = category.substring(0, 3);
    const contextPrefix = context?.context
      ? context.context.substring(0, 3).toUpperCase()
      : 'GEN';
    const timestamp = Date.now().toString().slice(-6);

    return `${categoryPrefix}-${contextPrefix}-${timestamp}`;
  }

  /**
   * Log error to console and internal log
   */
  private logError(error: AppError): void {
    // Add to internal log
    this.errorLog.push(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Console logging
    if (this.debug) {
      console.group(`[ErrorService] ${error.code}`);
      console.error('Category:', error.category);
      console.error('Severity:', error.severity);
      console.error('User Message:', error.userMessage);
      console.error('Technical Message:', error.technicalMessage);
      console.error('Can Retry:', error.canRetry);
      if (error.context) {
        console.error('Context:', error.context);
      }
      if (error.originalError) {
        console.error('Original Error:', error.originalError);
      }
      console.groupEnd();
    } else {
      // Production: Minimal logging
      console.error(`[${error.code}] ${error.category}: ${error.technicalMessage}`);
    }
  }

  /**
   * Report error to external service (Sentry, etc.)
   */
  private reportToService(error: AppError): void {
    // TODO: Integrate with Sentry or other error tracking
    // Example:
    // Sentry.captureException(error.originalError, {
    //   tags: {
    //     category: error.category,
    //     severity: error.severity,
    //     code: error.code,
    //   },
    //   contexts: {
    //     error: error.context,
    //   },
    // });
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 10): AppError[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
  }

  /**
   * Create a custom app error
   */
  createError(
    category: ErrorCategory,
    message: string,
    context?: ErrorContext
  ): AppError {
    return this.categorizeError(new Error(message), context);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: AppError | unknown): boolean {
    if (typeof error === 'object' && error !== null && 'canRetry' in error) {
      return (error as AppError).canRetry;
    }
    return false;
  }

  /**
   * Get retry delay for error
   */
  getRetryDelay(error: AppError | unknown): number {
    if (typeof error === 'object' && error !== null && 'retryDelay' in error) {
      return (error as AppError).retryDelay || 3000;
    }
    return 3000;
  }
}

// Export singleton instance
export const errorService = new ErrorService();
export default errorService;

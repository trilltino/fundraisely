/**
 * # Solana Error Handling Utilities
 *
 * Provides user-friendly error messages and handling for Solana transaction errors.
 * Parses program errors, RPC errors, and wallet errors into actionable messages
 * that users can understand and act upon.
 *
 * ## Features
 * - **Program Error Parsing**: Extract custom program error codes and messages
 * - **RPC Error Handling**: Identify rate limits, network issues, account not found
 * - **Wallet Error Handling**: User rejected, insufficient funds, etc.
 * - **Error Categorization**: Group errors by type (user, network, program)
 * - **Actionable Messages**: Provide clear next steps for users
 * - **Logging**: Structured error logging for debugging
 *
 * ## Usage
 * ```typescript
 * try {
 *   await sendTransaction(tx)
 * } catch (error) {
 *   const parsed = parseTransactionError(error)
 *   toast.error(parsed.message)
 *   console.error('Transaction failed:', parsed)
 * }
 * ```
 *
 * ## Error Types
 * - **UserError**: User-caused (rejected, insufficient funds)
 * - **NetworkError**: RPC/network issues (rate limit, timeout)
 * - **ProgramError**: Smart contract logic errors
 * - **UnknownError**: Unexpected errors
 *
 * ## Integration Points
 * - `transactions.ts` - Wraps transaction send errors
 * - Query hooks - Handles query failures
 * - `useTransactions.ts` - Displays error messages
 * - Toast notifications - Shows user-friendly errors
 *
 * @see {@link https://solana.com/docs/core/transactions#error-handling Solana Error Handling}
 */

/**
 * Error categories for different handling strategies
 */
export enum ErrorCategory {
  USER = 'USER', // User-caused errors (rejected, insufficient funds)
  NETWORK = 'NETWORK', // RPC/network errors (rate limit, timeout)
  PROGRAM = 'PROGRAM', // Smart contract logic errors
  UNKNOWN = 'UNKNOWN', // Unexpected errors
}

/**
 * Parsed error with user-friendly message
 */
export interface ParsedError {
  category: ErrorCategory
  code?: string | number
  message: string
  technicalMessage: string
  retryable: boolean
  logs?: string[]
}

/**
 * Known Fundraisely program error codes
 * These should match the error enum in the Solana program
 */
export const PROGRAM_ERRORS: Record<number, string> = {
  6000: 'Room is not active',
  6001: 'Room is full',
  6002: 'Invalid entry fee amount',
  6003: 'Player already joined this room',
  6004: 'Only the host can end the room',
  6005: 'Room has not ended yet',
  6006: 'Invalid winner configuration',
  6007: 'Host cannot be a winner',
  6008: 'Invalid fee percentages',
  6009: 'Unauthorized access',
  6010: 'Arithmetic overflow',
  6011: 'Room is already ended',
  6012: 'Winners not declared yet',
}

/**
 * Parse a Solana transaction error into user-friendly format
 *
 * @param error - Raw error from transaction send
 * @returns Parsed error with actionable message
 */
export function parseTransactionError(error: unknown): ParsedError {
  const errorMessage = getErrorMessage(error)

  // User rejected transaction
  if (errorMessage.includes('User rejected')) {
    return {
      category: ErrorCategory.USER,
      message: 'Transaction cancelled',
      technicalMessage: errorMessage,
      retryable: true,
    }
  }

  // Insufficient funds
  if (
    errorMessage.includes('0x1') ||
    errorMessage.includes('insufficient') ||
    errorMessage.includes('InsufficientFunds')
  ) {
    return {
      category: ErrorCategory.USER,
      code: '0x1',
      message: 'Insufficient SOL for transaction fees. Please add more SOL to your wallet.',
      technicalMessage: errorMessage,
      retryable: false,
    }
  }

  // Program custom errors (6000-6999 range)
  const customErrorMatch = errorMessage.match(/custom program error: 0x([0-9a-f]+)/i)
  if (customErrorMatch) {
    const errorCode = parseInt(customErrorMatch[1], 16)
    const errorDescription = PROGRAM_ERRORS[errorCode] || 'Unknown program error'

    return {
      category: ErrorCategory.PROGRAM,
      code: errorCode,
      message: errorDescription,
      technicalMessage: errorMessage,
      retryable: false,
    }
  }

  // Numeric program errors
  const numericErrorMatch = errorMessage.match(/Error Code: (\d+)/)
  if (numericErrorMatch) {
    const errorCode = parseInt(numericErrorMatch[1])
    const errorDescription = PROGRAM_ERRORS[errorCode] || 'Program error occurred'

    return {
      category: ErrorCategory.PROGRAM,
      code: errorCode,
      message: errorDescription,
      technicalMessage: errorMessage,
      retryable: false,
    }
  }

  // Rate limit / 429
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return {
      category: ErrorCategory.NETWORK,
      code: 429,
      message: 'Too many requests. Please wait a moment and try again.',
      technicalMessage: errorMessage,
      retryable: true,
    }
  }

  // Blockhash not found (transaction expired)
  if (errorMessage.includes('BlockhashNotFound') || errorMessage.includes('blockhash')) {
    return {
      category: ErrorCategory.NETWORK,
      message: 'Transaction expired. Please try again.',
      technicalMessage: errorMessage,
      retryable: true,
    }
  }

  // Network timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return {
      category: ErrorCategory.NETWORK,
      message: 'Network timeout. Please check your connection and try again.',
      technicalMessage: errorMessage,
      retryable: true,
    }
  }

  // Account not found
  if (errorMessage.includes('AccountNotFound') || errorMessage.includes('could not find account')) {
    return {
      category: ErrorCategory.PROGRAM,
      message: 'Account not found. The room may not exist.',
      technicalMessage: errorMessage,
      retryable: false,
    }
  }

  // Simulation failed
  if (errorMessage.includes('Simulation failed')) {
    return {
      category: ErrorCategory.PROGRAM,
      message: 'Transaction would fail. Please check your inputs.',
      technicalMessage: errorMessage,
      retryable: false,
      logs: extractProgramLogs(error),
    }
  }

  // Generic error
  return {
    category: ErrorCategory.UNKNOWN,
    message: 'Transaction failed. Please try again.',
    technicalMessage: errorMessage,
    retryable: true,
  }
}

/**
 * Extract error message from various error types
 *
 * @param error - Unknown error object
 * @returns Error message string
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
    if ('toString' in error && typeof error.toString === 'function') {
      return error.toString()
    }
  }

  return 'Unknown error occurred'
}

/**
 * Extract program logs from simulation error
 *
 * @param error - Error object
 * @returns Array of log lines
 */
function extractProgramLogs(error: unknown): string[] | undefined {
  if (typeof error === 'object' && error !== null) {
    if ('logs' in error && Array.isArray(error.logs)) {
      return error.logs
    }
  }
  return undefined
}

/**
 * Determine if an error is retryable
 *
 * @param error - Parsed error
 * @returns True if user should retry
 */
export function isRetryableError(error: ParsedError): boolean {
  return error.retryable
}

/**
 * Get a short error title for notifications
 *
 * @param error - Parsed error
 * @returns Short error title
 */
export function getErrorTitle(error: ParsedError): string {
  switch (error.category) {
    case ErrorCategory.USER:
      return 'Action Required'
    case ErrorCategory.NETWORK:
      return 'Network Issue'
    case ErrorCategory.PROGRAM:
      return 'Transaction Failed'
    case ErrorCategory.UNKNOWN:
    default:
      return 'Error'
  }
}

/**
 * Log error with structured data (for error tracking services)
 *
 * @param error - Parsed error
 * @param context - Additional context
 */
export function logError(error: ParsedError, context?: Record<string, unknown>): void {
  console.error('[Solana Error]', {
    category: error.category,
    code: error.code,
    message: error.message,
    technical: error.technicalMessage,
    retryable: error.retryable,
    logs: error.logs,
    context,
    timestamp: new Date().toISOString(),
  })

  // TODO: Send to error tracking service (e.g., Sentry)
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, { extra: context })
  // }
}

/**
 * Create a user-facing error object for React Query
 *
 * @param error - Raw error
 * @returns Error object with message property
 */
export function createQueryError(error: unknown): Error {
  const parsed = parseTransactionError(error)
  const queryError = new Error(parsed.message)
  ;(queryError as any).category = parsed.category
  ;(queryError as any).code = parsed.code
  ;(queryError as any).retryable = parsed.retryable
  return queryError
}

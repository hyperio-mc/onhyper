/**
 * @fileoverview Error definitions and utilities for the OnHyper Dev browser extension.
 * 
 * This module provides standardized error handling with:
 * - Predefined error types with user-friendly messages
 * - Actionable fix suggestions for each error type
 * - HTTP status code mapping
 * - Error logging for debugging
 * 
 * All error responses follow a consistent structure that can be
 * displayed to users or used for debugging.
 * 
 * @module lib/errors
 * 
 * @example
 * // Create a structured error response
 * const error = createError(ERRORS.INVALID_KEY, { provider: 'openai' });
 * // { success: false, error: { code: 'INVALID_KEY', message: '...', fix: '...' } }
 * 
 * // Log and return an error
 * return logAndReturnError(ERRORS.NETWORK_ERROR, { url: 'https://api.openai.com' });
 */

/**
 * @typedef {Object} ErrorType
 * @property {string} code - Short error code identifier
 * @property {string} message - User-friendly error message
 * @property {string} fix - Actionable suggestion to resolve the error
 * @property {string} fixAction - Action identifier for programmatic handling
 */

/**
 * Predefined error types with codes, messages, and actionable fixes.
 * 
 * Each error type includes:
 * - `code`: Machine-readable error code
 * - `message`: Human-readable description
 * - `fix`: Actionable suggestion for the user
 * - `fixAction`: Identifier for programmatic fix handling
 * 
 * @constant {Object.<string, ErrorType>}
 * 
 * @example
 * // Access error details
 * console.log(ERRORS.NO_KEY.message); // 'No API key configured for this provider'
 * console.log(ERRORS.NO_KEY.fix);     // 'Add an API key for this provider in the extension popup'
 */
export const ERRORS = {
  NO_KEY: {
    code: 'NO_KEY',
    message: 'No API key configured for this provider',
    fix: 'Add an API key for this provider in the extension popup',
    fixAction: 'add_key'
  },
  INVALID_KEY: {
    code: 'INVALID_KEY',
    message: 'API key is invalid or expired',
    fix: 'Check that your API key is correct and hasn\'t been revoked',
    fixAction: 'check_key'
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Could not reach API server',
    fix: 'Check your internet connection and try again',
    fixAction: 'retry'
  },
  RATE_LIMIT: {
    code: 'RATE_LIMIT',
    message: 'Rate limit exceeded',
    fix: 'Wait a moment and try again, or check your usage limits',
    fixAction: 'wait'
  },
  LOCKED: {
    code: 'LOCKED',
    message: 'Extension is locked',
    fix: 'Enter your password to unlock the extension',
    fixAction: 'unlock'
  },
  NO_PASSWORD: {
    code: 'NO_PASSWORD',
    message: 'Password not set',
    fix: 'Set up a password to encrypt your API keys',
    fixAction: 'set_password'
  },
  DECRYPT_FAILED: {
    code: 'DECRYPT_FAILED',
    message: 'Failed to decrypt API key',
    fix: 'Your password may be incorrect. Try again or reset your keys.',
    fixAction: 'check_password'
  },
  UNKNOWN: {
    code: 'UNKNOWN',
    message: 'An unexpected error occurred',
    fix: 'Try again or check the debug logs for details',
    fixAction: 'debug'
  }
};

/**
 * Maps an HTTP status code to an appropriate error type.
 * 
 * Handles common API error status codes:
 * - 401, 403 → INVALID_KEY (authentication failed)
 * - 429 → RATE_LIMIT (too many requests)
 * - 5xx → NETWORK_ERROR (server errors)
 * - Other → UNKNOWN
 * 
 * @param {number} status - HTTP status code (e.g., 200, 401, 429, 500)
 * @returns {ErrorType} Error type object from ERRORS
 * 
 * @example
 * // Unauthorized request
 * mapHttpStatus(401); // ERRORS.INVALID_KEY
 * 
 * // Rate limited
 * mapHttpStatus(429); // ERRORS.RATE_LIMIT
 * 
 * // Server error
 * mapHttpStatus(503); // ERRORS.NETWORK_ERROR
 */
export function mapHttpStatus(status) {
  if (status === 401 || status === 403) {
    return ERRORS.INVALID_KEY;
  }
  if (status === 429) {
    return ERRORS.RATE_LIMIT;
  }
  if (status >= 500) {
    return ERRORS.NETWORK_ERROR;
  }
  return ERRORS.UNKNOWN;
}

/**
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always `false` for error responses
 * @property {Object} error - Error details
 * @property {string} error.code - Error code from ERRORS
 * @property {string} error.message - User-friendly message
 * @property {string} error.fix - Actionable fix suggestion
 * @property {string} error.fixAction - Action identifier
 */

/**
 * Creates a structured error response object.
 * 
 * Combines the error type with additional context for debugging or display.
 * All error responses have `success: false` for easy checking.
 * 
 * @param {ErrorType} errorType - Error type object from ERRORS
 * @param {Object} [context={}] - Additional context to include (provider, URL, etc.)
 * @returns {ErrorResponse} Structured error response object
 * 
 * @example
 * const error = createError(ERRORS.NO_KEY, { provider: 'openai' });
 * // {
 * //   success: false,
 * //   error: {
 * //     code: 'NO_KEY',
 * //     message: 'No API key configured for this provider',
 * //     fix: 'Add an API key...',
 * //     fixAction: 'add_key',
 * //     provider: 'openai'
 * //   }
 * // }
 */
export function createError(errorType, context = {}) {
  return {
    success: false,
    error: {
      code: errorType.code,
      message: errorType.message,
      fix: errorType.fix,
      fixAction: errorType.fixAction,
      ...context
    }
  };
}

/**
 * @typedef {Object} SuccessResponse
 * @property {boolean} success - Always `true` for success responses
 */

/**
 * Creates a structured success response object.
 * 
 * Wraps data in a consistent format matching error responses.
 * All success responses have `success: true` for easy checking.
 * 
 * @param {Object} [data={}] - Data to include in the response
 * @returns {SuccessResponse} Structured success response object
 * 
 * @example
 * const response = createSuccess({ keys: ['openai', 'anthropic'] });
 * // { success: true, keys: ['openai', 'anthropic'] }
 * 
 * const empty = createSuccess();
 * // { success: true }
 */
export function createSuccess(data = {}) {
  return {
    success: true,
    ...data
  };
}

/**
 * Error logger class for tracking recent errors.
 * 
 * Maintains an in-memory log of the most recent errors for debugging.
 * Errors are logged with timestamps and context information.
 * 
 * @class ErrorLogger
 * 
 * @example
 * const logger = new ErrorLogger(5);
 * logger.log(ERRORS.NETWORK_ERROR, { url: 'https://api.openai.com' });
 * const errors = logger.getErrors();
 * logger.clear();
 */
class ErrorLogger {
  /**
   * Creates an ErrorLogger instance.
   * 
   * @param {number} [maxErrors=10] - Maximum number of errors to retain
   */
  constructor(maxErrors = 10) {
    /** @type {Array<Object>} */
    this.errors = [];
    /** @type {number} */
    this.maxErrors = maxErrors;
  }

  /**
   * Logs an error with timestamp and context.
   * 
   * New errors are added at the beginning of the array.
   * Oldest errors are removed when maxErrors limit is reached.
   * 
   * @param {ErrorType|Object} error - Error type or error object with code/message
   * @param {Object} [context={}] - Additional context (provider, URL, etc.)
   * @returns {Object} The logged error entry with timestamp
   * 
   * @example
   * const entry = logger.log(ERRORS.INVALID_KEY, { provider: 'openai' });
   * // { timestamp: 1703123456789, error: 'INVALID_KEY', message: '...', provider: 'openai' }
   */
  log(error, context = {}) {
    const entry = {
      timestamp: Date.now(),
      error: error.code || 'UNKNOWN',
      message: error.message || String(error),
      ...context
    };
    
    this.errors.unshift(entry);
    
    // Trim to max errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
    
    return entry;
  }

  /**
   * Gets all logged errors as a copy.
   * 
   * Returns errors in reverse chronological order (newest first).
   * 
   * @returns {Array<Object>} Array of error entries
   * 
   * @example
   * const errors = logger.getErrors();
   * errors.forEach(e => console.log(e.error, e.timestamp));
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Clears all logged errors.
   * 
   * @returns {void}
   * 
   * @example
   * logger.clear();
   * console.log(logger.getErrors().length); // 0
   */
  clear() {
    this.errors = [];
  }
}

/**
 * Singleton error logger instance for the extension.
 * 
 * Pre-configured to retain the last 10 errors.
 * Use this instance throughout the extension for consistent logging.
 * 
 * @constant {ErrorLogger}
 * 
 * @example
 * // Log an error
 * errorLogger.log(ERRORS.NETWORK_ERROR, { provider: 'openai' });
 * 
 * // Get recent errors for debugging
 * const recent = errorLogger.getErrors();
 */
export const errorLogger = new ErrorLogger(10);

/**
 * Convenience function to log an error and return a structured response.
 * 
 * Combines error logging with response creation in one call.
 * Useful for error handling in message handlers.
 * 
 * @param {ErrorType} errorType - Error type from ERRORS
 * @param {Object} [context={}] - Additional context for logging and response
 * @returns {ErrorResponse} Structured error response
 * 
 * @example
 * // In a message handler
 * if (!hasKey) {
 *   return logAndReturnError(ERRORS.NO_KEY, { provider: 'openai' });
 * }
 */
export function logAndReturnError(errorType, context = {}) {
  errorLogger.log(errorType, context);
  return createError(errorType, context);
}
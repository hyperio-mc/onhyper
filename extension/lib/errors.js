/**
 * Error definitions and utilities for OnHyper Dev Extension
 * Provides user-friendly error messages and actionable fixes
 */

/**
 * Error types with codes, messages, and actionable fixes
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
 * Map HTTP status codes to error types
 * @param {number} status - HTTP status code
 * @returns {Object} Error object from ERRORS
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
 * Create a structured error response
 * @param {Object} errorType - Error type from ERRORS
 * @param {Object} context - Additional context (provider, originalError, etc.)
 * @returns {Object} Structured error object
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
 * Create a success response
 * @param {Object} data - Response data
 * @returns {Object} Success object
 */
export function createSuccess(data = {}) {
  return {
    success: true,
    ...data
  };
}

/**
 * Error logger - stores last N errors in memory
 */
class ErrorLogger {
  constructor(maxErrors = 10) {
    this.errors = [];
    this.maxErrors = maxErrors;
  }

  /**
   * Log an error
   * @param {Object} error - Error object
   * @param {Object} context - Additional context
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
   * Get all logged errors
   * @returns {Array} Array of error entries
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
  }
}

// Singleton error logger
export const errorLogger = new ErrorLogger(10);

/**
 * Log and return an error (convenience function)
 * @param {Object} errorType - Error type from ERRORS
 * @param {Object} context - Context for logging
 * @returns {Object} Structured error response
 */
export function logAndReturnError(errorType, context = {}) {
  errorLogger.log(errorType, context);
  return createError(errorType, context);
}
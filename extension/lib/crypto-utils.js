/**
 * @fileoverview Cryptographic utility functions for the OnHyper Dev extension.
 * 
 * This module provides helper functions for API key management, including:
 * - Key masking for safe display
 * - Format validation per provider
 * - Random ID generation
 * 
 * Note: This module is separate from `encryption.js` which handles
 * actual cryptographic operations. This module focuses on key handling
 * utilities that don't involve encryption/decryption.
 * 
 * @module lib/crypto-utils
 * 
 * @example
 * // Mask a key for display
 * const masked = hashKey('sk-proj-1234567890abcdef');
 * // 'sk-...cdef'
 * 
 * // Validate a key format
 * const result = validateKeyFormat('openai', 'sk-xxxx');
 * if (!result.valid) console.error(result.error);
 */

/**
 * Masks an API key for display, showing only prefix and last 4 characters.
 * 
 * Creates a display-safe version: prefix (3 chars max) + `...` + last 4 chars.
 * This lets users identify keys without exposing the full secret.
 * 
 * @param {string} key - The API key to mask
 * @returns {string} Masked key in format `xxx...yyyy` or `****` for short/invalid keys
 * 
 * @example
 * hashKey('sk-proj-1234567890abcdef');
 * // 'sk-...cdef'
 * 
 * hashKey('AIza-1234567890abcdef');
 * // 'AIz...cdef'
 * 
 * hashKey('short');
 * // '****'
 * 
 * hashKey(null);
 * // '****'
 */
export function hashKey(key) {
  if (!key || typeof key !== 'string') {
    return '****';
  }
  
  const trimmed = key.trim();
  if (trimmed.length < 8) {
    // For short keys, show less
    return '****';
  }
  
  // Show prefix (up to first 3 chars) + ... + last 4 chars
  const prefix = trimmed.slice(0, 3);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * @typedef {Object} KeyValidationResult
 * @property {boolean} valid - Whether the key is valid
 * @property {string} [error] - Error message if validation failed
 */

/**
 * Validates the format of an API key for a specific provider.
 * 
 * Performs provider-specific validation checks:
 * - Prefix validation (e.g., OpenAI keys start with `sk-`)
 * - Length validation
 * - Whitespace/newline checks
 * 
 * Supports: openai, anthropic, google, grok, deepseek
 * Falls back to generic validation for unknown providers.
 * 
 * @param {string} provider - Provider name (case-insensitive)
 * @param {string} key - The API key to validate
 * @returns {KeyValidationResult} Validation result with `valid` and optional `error`
 * 
 * @example
 * // Valid OpenAI key
 * validateKeyFormat('openai', 'sk-proj-xxxxxxxxxx');
 * // { valid: true }
 * 
 * // Invalid - wrong prefix
 * validateKeyFormat('openai', 'invalid-key');
 * // { valid: false, error: 'OpenAI keys should start with "sk-"' }
 * 
 * // Invalid - too short
 * validateKeyFormat('anthropic', 'sk-ant-short');
 * // { valid: false, error: 'Anthropic key appears too short' }
 * 
 * // Google key validation
 * validateKeyFormat('google', 'AIza-1234567890abcdef');
 * // { valid: true }
 */
export function validateKeyFormat(provider, key) {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'Key is required' };
  }
  
  const trimmed = key.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Key cannot be empty' };
  }
  
  // Provider-specific validation rules
  const validators = {
    openai: (k) => {
      if (!k.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI keys should start with "sk-"' };
      }
      if (k.length < 20) {
        return { valid: false, error: 'OpenAI key appears too short' };
      }
      return { valid: true };
    },
    
    anthropic: (k) => {
      if (!k.startsWith('sk-ant-')) {
        return { valid: false, error: 'Anthropic keys should start with "sk-ant-"' };
      }
      if (k.length < 30) {
        return { valid: false, error: 'Anthropic key appears too short' };
      }
      return { valid: true };
    },
    
    google: (k) => {
      // Google API keys are typically 39 characters
      if (k.length < 30) {
        return { valid: false, error: 'Google API key appears too short' };
      }
      // Often start with "AIza"
      if (!k.startsWith('AIza')) {
        return { valid: false, error: 'Google API keys typically start with "AIza"' };
      }
      return { valid: true };
    },
    
    grok: (k) => {
      // xAI/Grok API keys
      if (k.length < 20) {
        return { valid: false, error: 'Grok API key appears too short' };
      }
      return { valid: true };
    },
    
    deepseek: (k) => {
      // DeepSeek keys start with sk-
      if (!k.startsWith('sk-')) {
        return { valid: false, error: 'DeepSeek keys should start with "sk-"' };
      }
      if (k.length < 20) {
        return { valid: false, error: 'DeepSeek key appears too short' };
      }
      return { valid: true };
    }
  };
  
  const validator = validators[provider.toLowerCase()];
  
  if (validator) {
    return validator(trimmed);
  }
  
  // Generic validation for unknown providers
  if (trimmed.length < 10) {
    return { valid: false, error: 'Key appears too short' };
  }
  
  // Check for common issues
  if (trimmed.includes(' ')) {
    return { valid: false, error: 'Key should not contain spaces' };
  }
  
  if (trimmed.includes('\n') || trimmed.includes('\t')) {
    return { valid: false, error: 'Key should not contain line breaks' };
  }
  
  return { valid: true };
}

/**
 * Gets the list of provider names supported by this module's validators.
 * 
 * Note: This is different from the full provider list in `providers.js`.
 * This returns providers that have specific format validation here.
 * 
 * @returns {string[]} Array of supported provider names (lowercase)
 * 
 * @example
 * getSupportedProviders();
 * // ['openai', 'anthropic', 'google', 'grok', 'deepseek']
 */
export function getSupportedProviders() {
  return ['openai', 'anthropic', 'google', 'grok', 'deepseek'];
}

/**
 * Checks if a provider has specific validation rules in this module.
 * 
 * @param {string} provider - Provider name to check (case-insensitive)
 * @returns {boolean} `true` if the provider has a specific validator
 * 
 * @example
 * isProviderSupported('openai');    // true
 * isProviderSupported('unknown');   // false
 */
export function isProviderSupported(provider) {
  const supported = getSupportedProviders();
  return supported.includes(provider.toLowerCase());
}

/**
 * Gets the human-readable display name for a provider.
 * 
 * @param {string} provider - Provider identifier (case-insensitive)
 * @returns {string} Human-readable name, or the original identifier if unknown
 * 
 * @example
 * getProviderDisplayName('openai');    // 'OpenAI'
 * getProviderDisplayName('google');    // 'Google AI'
 * getProviderDisplayName('unknown');   // 'unknown'
 */
export function getProviderDisplayName(provider) {
  const names = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google AI',
    grok: 'xAI Grok',
    deepseek: 'DeepSeek'
  };
  return names[provider.toLowerCase()] || provider;
}

/**
 * Generates a cryptographically random alphanumeric ID.
 * 
 * Uses `crypto.getRandomValues()` for secure random generation.
 * Useful for request IDs, session tokens, or tracking identifiers.
 * 
 * @param {number} [length=8] - Length of the generated ID (default: 8)
 * @returns {string} Random alphanumeric string (a-z, A-Z, 0-9)
 * 
 * @example
 * generateId();      // 'aB3xK9mP'
 * generateId(16);    // 'xY8zQ2wE5tR7uI1o'
 * generateId(4);     // 'a3Bc'
 */
export function generateId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const values = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}
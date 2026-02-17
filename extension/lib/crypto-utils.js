/**
 * Crypto utilities for browser extension
 * Helper functions for API key management
 */

/**
 * Hash a key for display purposes (show only last 4 characters)
 * @param {string} key - The API key
 * @returns {string} The masked key (e.g., "sk-...abcd")
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
 * Validate the format of an API key for a given provider
 * @param {string} provider - The provider name
 * @param {string} key - The API key to validate
 * @returns {{valid: boolean, error?: string}} Validation result
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
 * Get supported provider names
 * @returns {string[]}
 */
export function getSupportedProviders() {
  return ['openai', 'anthropic', 'google', 'grok', 'deepseek'];
}

/**
 * Check if a provider is supported
 * @param {string} provider - Provider name to check
 * @returns {boolean}
 */
export function isProviderSupported(provider) {
  const supported = getSupportedProviders();
  return supported.includes(provider.toLowerCase());
}

/**
 * Get display name for a provider
 * @param {string} provider - Provider identifier
 * @returns {string} Human-readable provider name
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
 * Generate a random ID for tracking purposes
 * @param {number} length - Length of the ID (default 8)
 * @returns {string} Random alphanumeric ID
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
/**
 * @fileoverview Provider metadata and validation utilities for the OnHyper Dev extension.
 * 
 * This module contains metadata about each supported API provider, including:
 * - Display names and descriptions
 * - API key format patterns for validation
 * - Links to provider documentation
 * 
 * Provider metadata is used for:
 * - Validating API key formats before storage
 * - Displaying provider information in the UI
 * - Masking API keys for safe display
 * 
 * @module lib/providers
 * 
 * @example
 * // Get all providers for a UI list
 * const providers = getAllProviders();
 * providers.forEach(p => console.log(p.name, p.description));
 * 
 * // Validate an API key before saving
 * const result = validateApiKey('openai', 'sk-xxxxx');
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */

/**
 * @typedef {Object} ProviderMetadata
 * @property {string} id - Unique identifier matching PROXY_MAP keys
 * @property {string} name - Human-readable display name
 * @property {string} keyPrefix - Expected prefix for API keys (empty string if none)
 * @property {RegExp|null} keyFormat - Pattern for validating key format (null if no validation)
 * @property {string} description - Brief description of the provider's services
 * @property {string} docsUrl - Link to API documentation
 */

/**
 * Metadata for all supported API providers.
 * 
 * Each provider entry contains:
 * - `id`: Unique identifier (matches keys in PROXY_MAP)
 * - `name`: Display name for UI
 * - `keyPrefix`: Expected API key prefix (for validation hints)
 * - `keyFormat`: RegExp pattern for key validation (null = no format check)
 * - `description`: Short description of services offered
 * - `docsUrl`: Link to official API documentation
 * 
 * @constant {Object.<string, ProviderMetadata>}
 * 
 * @example
 * // Get OpenAI metadata
 * const openai = PROVIDERS.openai;
 * console.log(openai.name);        // 'OpenAI'
 * console.log(openai.keyPrefix);  // 'sk-'
 * console.log(openai.docsUrl);     // 'https://platform.openai.com/docs/api-reference'
 */
export const PROVIDERS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    keyPrefix: 'sk-',
    keyFormat: /^sk-[a-zA-Z0-9_-]{32,}$/,
    description: 'GPT-4, GPT-3.5 Turbo, DALL-E, and embeddings',
    docsUrl: 'https://platform.openai.com/docs/api-reference'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    keyPrefix: 'sk-ant-',
    keyFormat: /^sk-ant-api03-[a-zA-Z0-9_-]{80,}$/,
    description: 'Claude models for conversation and analysis',
    docsUrl: 'https://docs.anthropic.com/claude/reference'
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    keyPrefix: 'sk-or-',
    keyFormat: /^sk-or-[a-zA-Z0-9_-]{32,}$/,
    description: 'Unified API for multiple LLM providers',
    docsUrl: 'https://openrouter.ai/docs'
  },
  scout: {
    id: 'scout',
    name: 'Scout (Atoms)',
    keyPrefix: 'secret_',
    keyFormat: /^secret_[a-zA-Z0-9_-]{32,}$/,
    description: 'ScoutOS Atoms API for AI agents',
    docsUrl: 'https://scoutos.com/docs'
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    keyPrefix: '',
    keyFormat: null, // No key needed - runs locally
    description: 'Local LLM server (no API key required)',
    docsUrl: 'https://ollama.com/documentation'
  }
};

/**
 * Gets provider metadata by its identifier.
 * 
 * @param {string} providerId - The provider identifier (e.g., 'openai', 'anthropic')
 * @returns {ProviderMetadata|null} Provider metadata object, or `null` if not found
 * 
 * @example
 * const provider = getProvider('openai');
 * if (provider) {
 *   console.log(provider.name);        // 'OpenAI'
 *   console.log(provider.description); // 'GPT-4, GPT-3.5 Turbo, ...'
 * }
 * 
 * const unknown = getProvider('unknown');
 * console.log(unknown); // null
 */
export function getProvider(providerId) {
  return PROVIDERS[providerId] || null;
}

/**
 * Gets all provider metadata as an array.
 * 
 * Useful for building provider selection UIs or iterating over all providers.
 * 
 * @returns {ProviderMetadata[]} Array of all provider metadata objects
 * 
 * @example
 * const providers = getAllProviders();
 * providers.forEach(p => {
 *   console.log(`${p.name}: ${p.description}`);
 * });
 * // OpenAI: GPT-4, GPT-3.5 Turbo, DALL-E, and embeddings
 * // Anthropic: Claude models for conversation and analysis
 * // ...
 */
export function getAllProviders() {
  return Object.values(PROVIDERS);
}

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the key is valid
 * @property {string} [error] - Error message if validation failed (undefined if valid)
 */

/**
 * Validates an API key format for a specific provider.
 * 
 * Checks both the prefix and the format pattern (if defined).
 * Ollama has no key validation since it runs locally without authentication.
 * 
 * @param {string} providerId - The provider identifier
 * @param {string} key - The API key to validate
 * @returns {ValidationResult} Object with `valid` boolean and optional `error` message
 * 
 * @example
 * // Valid OpenAI key
 * validateApiKey('openai', 'sk-proj-xxxxxxxxxxxx');
 * // { valid: true }
 * 
 * // Invalid prefix
 * validateApiKey('openai', 'invalid-key');
 * // { valid: false, error: 'Invalid key format. Expected prefix: sk-' }
 * 
 * // Unknown provider
 * validateApiKey('unknown', 'key');
 * // { valid: false, error: 'Unknown provider: unknown' }
 * 
 * // Ollama (no key needed)
 * validateApiKey('ollama', '');
 * // { valid: true }
 */
export function validateApiKey(providerId, key) {
  const provider = PROVIDERS[providerId];
  
  if (!provider) {
    return { valid: false, error: `Unknown provider: ${providerId}` };
  }
  
  // Ollama doesn't require an API key (runs locally)
  if (providerId === 'ollama') {
    // No key validation needed - Ollama runs locally without auth
    return { valid: true };
  }
  
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'API key is required' };
  }
  
  // Check prefix
  if (provider.keyPrefix && !key.startsWith(provider.keyPrefix)) {
    return { 
      valid: false, 
      error: `Invalid key format. Expected prefix: ${provider.keyPrefix}` 
    };
  }
  
  // Check format pattern if defined
  if (provider.keyFormat && !provider.keyFormat.test(key)) {
    return { 
      valid: false, 
      error: `Invalid key format for ${provider.name}` 
    };
  }
  
  return { valid: true };
}

/**
 * Masks an API key for safe display in the UI.
 * 
 * Shows the prefix (if any) plus dots and the last 4 characters.
 * This allows users to identify their key without exposing the full secret.
 * 
 * @param {string} providerId - The provider identifier (determines prefix handling)
 * @param {string} key - The API key to mask
 * @returns {string} Masked key string safe for display
 * 
 * @example
 * // OpenAI key
 * maskApiKey('openai', 'sk-proj-1234567890abcdef');
 * // 'sk-proj••••••••cdef'
 * 
 * // Short key
 * maskApiKey('openai', 'short');
 * // '***'
 * 
 * // Ollama (no standard prefix)
 * maskApiKey('ollama', 'anykey');
 * // 'anyk••••••••ykey' (shows first/last 4 chars)
 */
export function maskApiKey(providerId, key) {
  const provider = PROVIDERS[providerId];
  
  if (!key || key.length < 8) {
    return '***';
  }
  
  const prefixLen = provider?.keyPrefix?.length || 0;
  const visibleSuffix = 4;
  
  if (prefixLen > 0 && key.startsWith(provider.keyPrefix)) {
    // Show prefix, hide middle, show last 4
    const middleLen = key.length - prefixLen - visibleSuffix;
    if (middleLen > 0) {
      return `${provider.keyPrefix}${'•'.repeat(Math.min(middleLen, 8))}${key.slice(-visibleSuffix)}`;
    }
  }
  
  // Fallback: show first 4, hide middle, show last 4
  return `${key.slice(0, 4)}${'•'.repeat(8)}${key.slice(-4)}`;
}

/**
 * Finds providers matching a partial name or identifier.
 * 
 * Useful for autocomplete/search functionality in UIs.
 * Case-insensitive matching against both ID and display name.
 * 
 * @param {string} partial - Partial provider name or ID to search for
 * @returns {string[]} Array of matching provider IDs
 * 
 * @example
 * findProviders('open');
 * // ['openai', 'openrouter']
 * 
 * findProviders('CLAUDE');
 * // [] (no match - Claude is accessed via 'anthropic')
 * 
 * findProviders('anth');
 * // ['anthropic']
 */
export function findProviders(partial) {
  const search = partial.toLowerCase();
  return Object.keys(PROVIDERS).filter(id => {
    const provider = PROVIDERS[id];
    return id.includes(search) || 
           provider.name.toLowerCase().includes(search);
  });
}
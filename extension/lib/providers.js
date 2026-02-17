/**
 * Provider metadata and validation utilities
 * Contains information about each supported API provider
 */

/**
 * Provider metadata configuration
 * Each provider has:
 * - id: Unique identifier matching PROXY_MAP keys
 * - name: Human-readable display name
 * - keyPrefix: Expected prefix for API keys
 * - keyFormat: RegExp pattern for validating key format
 * - description: Brief description of the provider
 * - docsUrl: Link to API documentation
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
 * Get provider metadata by ID
 * @param {string} providerId - Provider identifier
 * @returns {Object | null} Provider metadata or null if not found
 */
export function getProvider(providerId) {
  return PROVIDERS[providerId] || null;
}

/**
 * Get all provider metadata
 * @returns {Object[]} Array of all provider metadata objects
 */
export function getAllProviders() {
  return Object.values(PROVIDERS);
}

/**
 * Validate an API key for a provider
 * @param {string} providerId - Provider identifier
 * @param {string} key - API key to validate
 * @returns {{valid: boolean, error?: string}} Validation result
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
 * Mask an API key for display (show prefix and last 4 chars)
 * @param {string} providerId - Provider identifier
 * @param {string} key - API key to mask
 * @returns {string} Masked key for safe display
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
 * Get provider ID from partial match (for autocomplete, etc.)
 * @param {string} partial - Partial provider name or ID
 * @returns {string[]} Matching provider IDs
 */
export function findProviders(partial) {
  const search = partial.toLowerCase();
  return Object.keys(PROVIDERS).filter(id => {
    const provider = PROVIDERS[id];
    return id.includes(search) || 
           provider.name.toLowerCase().includes(search);
  });
}
/**
 * @fileoverview Proxy URL mapping configuration and utilities for the OnHyper Dev extension.
 * 
 * This module defines how local proxy URLs are mapped to real API endpoints.
 * When a web app makes a request to a proxy URL (e.g., `/proxy/openai/v1/chat/completions`),
 * the extension intercepts it, adds authentication headers, and forwards to the real API.
 * 
 * Supported providers:
 * - **OpenAI** - GPT-4, GPT-3.5, DALL-E, embeddings
 * - **Anthropic** - Claude models
 * - **OpenRouter** - Unified API for multiple LLM providers
 * - **Scout (Atoms)** - ScoutOS Atoms API for AI agents
 * - **Ollama** - Local LLM server (no auth required)
 * 
 * @module lib/proxy-map
 * 
 * @example
 * // Check if a URL should be proxied
 * const match = matchProxyUrl('/proxy/openai/v1/chat/completions');
 * if (match) {
 *   console.log(match.provider); // 'openai'
 *   console.log(match.path);     // 'v1/chat/completions'
 * }
 * 
 * // Build the real API URL
 * const realUrl = buildRealUrl('openai', 'v1/chat/completions');
 * // 'https://api.openai.com/v1/chat/completions'
 */

/**
 * @typedef {Object} ProviderConfig
 * @property {RegExp} pattern - Pattern to match proxy URL paths
 * @property {string} target - Target URL template ($1 is replaced with captured path)
 * @property {function(string): Object.<string, string>} authHeader - Function to generate auth headers from API key
 */

/**
 * Proxy mapping configuration for each API provider.
 * 
 * Each provider configuration defines:
 * - `pattern`: RegExp to match and capture the path from proxy URLs
 * - `target`: Target URL template where `$1` is replaced by the captured path
 * - `authHeader`: Function that takes an API key and returns headers object
 * 
 * @constant {Object.<string, ProviderConfig>}
 * 
 * @example
 * // Get auth headers for OpenAI
 * const headers = PROXY_MAP.openai.authHeader('sk-xxxx');
 * // { 'Authorization': 'Bearer sk-xxxx' }
 * 
 * // Get auth headers for Anthropic
 * const headers = PROXY_MAP.anthropic.authHeader('sk-ant-xxxx');
 * // { 'x-api-key': 'sk-ant-xxxx', 'anthropic-version': '2023-06-01' }
 */
export const PROXY_MAP = {
  openai: {
    pattern: /^\/proxy\/openai\/(.*)$/,
    target: 'https://api.openai.com/$1',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` })
  },
  anthropic: {
    pattern: /^\/proxy\/anthropic\/(.*)$/,
    target: 'https://api.anthropic.com/$1',
    authHeader: (key) => ({ 
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    })
  },
  openrouter: {
    pattern: /^\/proxy\/openrouter\/(.*)$/,
    target: 'https://openrouter.ai/api/v1/$1',
    authHeader: (key) => ({ 
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://onhyper.io',
      'X-Title': 'OnHyper Dev'
    })
  },
  scout: {
    pattern: /^\/proxy\/scout-atoms\/(.*)$/,
    target: 'https://atoms.api.scoutos.com/$1',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` })
  },
  ollama: {
    pattern: /^\/proxy\/ollama\/(.*)$/,
    target: 'http://localhost:11434/$1',
    authHeader: () => ({}) // No auth needed - runs locally
  }
};

/**
 * @typedef {Object} ProxyMatch
 * @property {string} provider - The provider identifier (e.g., 'openai')
 * @property {string} path - The captured path component (e.g., 'v1/chat/completions')
 */

/**
 * Matches a URL against proxy patterns to determine if it should be proxied.
 * 
 * Handles full URLs (http://, https://, chrome-extension://) and paths.
 * Returns the provider and captured path if matched, or null if not a proxy URL.
 * 
 * @param {string} url - The URL or path to check (e.g., '/proxy/openai/v1/models')
 * @returns {ProxyMatch|null} Match result with provider and path, or null if no match
 * 
 * @example
 * // Match a path
 * matchProxyUrl('/proxy/openai/v1/models');
 * // { provider: 'openai', path: 'v1/models' }
 * 
 * // Match a full URL
 * matchProxyUrl('https://app.example.com/proxy/anthropic/v1/complete');
 * // { provider: 'anthropic', path: 'v1/complete' }
 * 
 * // No match
 * matchProxyUrl('/api/users');
 * // null
 */
export function matchProxyUrl(url) {
  // Extract pathname from full URL if needed
  let pathname = url;
  try {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('chrome-extension://')) {
      const parsed = new URL(url);
      pathname = parsed.pathname;
    }
  } catch {
    // Not a valid URL, treat as pathname
  }
  
  for (const [provider, config] of Object.entries(PROXY_MAP)) {
    const match = pathname.match(config.pattern);
    if (match) {
      return {
        provider,
        path: match[1]
      };
    }
  }
  
  return null;
}

/**
 * Builds the real API URL from a provider and captured path.
 * 
 * Takes the provider's target template and substitutes `$1` with the path.
 * Optionally appends a query string.
 * 
 * @param {string} provider - Provider identifier (e.g., 'openai', 'anthropic')
 * @param {string} path - Captured path from proxy URL (e.g., 'v1/chat/completions')
 * @param {string} [queryString=''] - Optional query string to append (with or without leading '?')
 * @returns {string} The real API URL
 * @throws {Error} If provider is not found in PROXY_MAP
 * 
 * @example
 * buildRealUrl('openai', 'v1/chat/completions');
 * // 'https://api.openai.com/v1/chat/completions'
 * 
 * buildRealUrl('openai', 'v1/models', '?limit=10');
 * // 'https://api.openai.com/v1/models?limit=10'
 */
export function buildRealUrl(provider, path, queryString = '') {
  const config = PROXY_MAP[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  let url = config.target.replace('$1', path);
  
  // Append query string if provided
  if (queryString) {
    // Ensure query string starts with ?
    const qs = queryString.startsWith('?') ? queryString : `?${queryString}`;
    url += qs;
  }
  
  return url;
}

/**
 * Gets authentication headers for a provider using its API key.
 * 
 * Returns an object with the appropriate headers for the provider's API.
 * Different providers use different header names and formats.
 * 
 * @param {string} provider - Provider identifier
 * @param {string} key - The decrypted API key for the provider
 * @returns {Object.<string, string>} Headers object for authentication
 * @throws {Error} If provider is not found in PROXY_MAP
 * 
 * @example
 * // OpenAI uses Bearer token
 * getAuthHeaders('openai', 'sk-xxxx');
 * // { 'Authorization': 'Bearer sk-xxxx' }
 * 
 * // Anthropic uses x-api-key header
 * getAuthHeaders('anthropic', 'sk-ant-xxxx');
 * // { 'x-api-key': 'sk-ant-xxxx', 'anthropic-version': '2023-06-01' }
 */
export function getAuthHeaders(provider, key) {
  const config = PROXY_MAP[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  return config.authHeader(key);
}

/**
 * Checks if a URL points to localhost or is a file:// URL.
 * 
 * Used to determine if requests should bypass proxy rules.
 * Localhost requests typically don't need CORS handling.
 * 
 * Checks for:
 * - `file://` protocol
 * - `localhost` hostname
 * - `127.0.0.1`, `0.0.0.0`, `::1` IPs
 * - `.localhost`, `.local` TLDs
 * - Private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
 * 
 * @param {string} url - URL to check
 * @returns {boolean} `true` if URL is localhost or file://
 * 
 * @example
 * isLocalhost('http://localhost:3000/api');     // true
 * isLocalhost('http://127.0.0.1:8080/test');    // true
 * isLocalhost('http://192.168.1.5/internal');   // true
 * isLocalhost('https://api.openai.com/v1');     // false
 */
export function isLocalhost(url) {
  try {
    const parsed = new URL(url);
    
    // Check for file:// protocol
    if (parsed.protocol === 'file:') {
      return true;
    }
    
    // Check for localhost variations
    const hostname = parsed.hostname.toLowerCase();
    // Handle both bracketed and non-bracketed IPv6 (some parsers include brackets)
    const cleanHostname = hostname.replace(/^\[|\]$/g, '');
    
    if (hostname === 'localhost' || 
        cleanHostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        cleanHostname === '::1' ||
        hostname === '::1' ||
        hostname === '0.0.0.0' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local')) {
      return true;
    }
    
    // Check for loopback IP ranges
    if (hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') ||
        hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') ||
        hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') ||
        hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') ||
        hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') ||
        hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.')) {
      return true;
    }
    
    return false;
  } catch {
    // Invalid URL, assume not localhost
    return false;
  }
}

/**
 * Gets a list of all supported provider identifiers.
 * 
 * @returns {string[]} Array of provider identifiers from PROXY_MAP
 * 
 * @example
 * getProviders();
 * // ['openai', 'anthropic', 'openrouter', 'scout', 'ollama']
 */
export function getProviders() {
  return Object.keys(PROXY_MAP);
}

/**
 * Checks if a provider is supported by the proxy system.
 * 
 * @param {string} provider - Provider identifier to check
 * @returns {boolean} `true` if the provider exists in PROXY_MAP
 * 
 * @example
 * isProviderSupported('openai');    // true
 * isProviderSupported('unknown');    // false
 */
export function isProviderSupported(provider) {
  return provider in PROXY_MAP;
}
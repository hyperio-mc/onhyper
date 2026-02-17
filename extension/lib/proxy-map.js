/**
 * Proxy URL mapping configuration and utilities
 * Maps local proxy URLs to real API endpoints with proper authentication
 */

/**
 * Proxy mapping configuration for each API provider
 * Each provider has:
 * - pattern: RegExp to match proxy URL path
 * - target: Target URL template ($1 is replaced with captured path)
 * - authHeader: Function to generate auth headers from API key
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
 * Match a URL against proxy patterns
 * @param {string} url - The URL or path to match
 * @returns {{provider: string, path: string} | null} Match result or null if no match
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
 * Build the real API URL from provider and captured path
 * @param {string} provider - Provider identifier (e.g., 'openai', 'anthropic')
 * @param {string} path - Captured path from proxy URL
 * @param {string} [queryString=''] - Optional query string to append
 * @returns {string} The real API URL
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
 * Get authentication headers for a provider
 * @param {string} provider - Provider identifier
 * @param {string} key - API key for the provider
 * @returns {Object} Headers object for authentication
 */
export function getAuthHeaders(provider, key) {
  const config = PROXY_MAP[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  return config.authHeader(key);
}

/**
 * Check if a URL is localhost or file:// protocol
 * @param {string} url - URL to check
 * @returns {boolean} True if localhost or file:// URL
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
 * Get list of supported providers
 * @returns {string[]} Array of provider identifiers
 */
export function getProviders() {
  return Object.keys(PROXY_MAP);
}

/**
 * Check if a provider is supported
 * @param {string} provider - Provider identifier to check
 * @returns {boolean} True if provider is supported
 */
export function isProviderSupported(provider) {
  return provider in PROXY_MAP;
}
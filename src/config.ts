/**
 * OnHyper.io Configuration
 * 
 * All configuration values are loaded from environment variables
 * with sensible defaults for development.
 */

/**
 * Get the data directory path
 * Priority:
 * 1. RAILWAY_VOLUME_MOUNT_PATH (auto-set by Railway when volume is attached)
 * 2. DATA_DIR (custom override)
 * 3. Default './data' for development
 */
function getDataDir(): string {
  // Railway auto-sets this when a volume is mounted
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return process.env.RAILWAY_VOLUME_MOUNT_PATH;
  }
  // Custom override
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  // Development default
  return './data';
}

const DATA_DIR = getDataDir();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  // Database paths - use data directory
  dataDir: DATA_DIR,
  sqlitePath: process.env.SQLITE_PATH || `${DATA_DIR}/onhyper.db`,
  lmdbPath: process.env.LMDB_PATH || `${DATA_DIR}/onhyper.lmdb`,

  // Static files (frontend)
  staticPath: process.env.STATIC_PATH || './public',

  // Security
  jwtSecret: process.env.ONHYPER_JWT_SECRET || 'change-me-in-production-use-secure-random-string',
  masterKey: process.env.ONHYPER_MASTER_KEY || 'change-me-in-production-32-bytes-hex',

  // Auth
  auth: {
    bcryptRounds: parseInt(process.env.AUTH_BCRYPT_ROUNDS || '10', 10),
    tokenLength: parseInt(process.env.AUTH_TOKEN_LENGTH || '32', 10),
    minPasswordLength: parseInt(process.env.AUTH_MIN_PASSWORD_LENGTH || '8', 10),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Proxy
  proxy: {
    timeoutMs: parseInt(process.env.PROXY_TIMEOUT_MS || '30000', 10),
    maxRequestSize: parseInt(process.env.PROXY_MAX_REQUEST_SIZE || '5242880', 10), // 5MB
    maxResponseSize: parseInt(process.env.PROXY_MAX_RESPONSE_SIZE || '5242880', 10), // 5MB
  },

  // Plans
  plans: {
    FREE: { requestsPerDay: 100, maxApps: 3, maxSecrets: 5 },
    HOBBY: { requestsPerDay: 1000, maxApps: 10, maxSecrets: 20 },
    PRO: { requestsPerDay: 10000, maxApps: 50, maxSecrets: 50 },
    BUSINESS: { requestsPerDay: 100000, maxApps: -1, maxSecrets: -1 }, // -1 = unlimited
  },
} as const;

/**
 * Proxy endpoint configuration
 * Maps endpoint slugs to target URLs and secret key names
 */
export const PROXY_ENDPOINTS = {
  'scout-atoms': {
    target: 'https://api.scoutos.com',
    secretKey: 'SCOUT_API_KEY',
    description: 'Scout OS Agents API - Use /world/{agent_id}/_interact for chat',
  },
  'ollama': {
    target: 'https://ollama.com/v1',
    secretKey: 'OLLAMA_API_KEY',
    description: 'Ollama API',
  },
  'openrouter': {
    target: 'https://openrouter.ai/api/v1',
    secretKey: 'OPENROUTER_API_KEY',
    description: 'OpenRouter API',
  },
  'anthropic': {
    target: 'https://api.anthropic.com/v1',
    secretKey: 'ANTHROPIC_API_KEY',
    description: 'Anthropic API',
  },
  'openai': {
    target: 'https://api.openai.com/v1',
    secretKey: 'OPENAI_API_KEY',
    description: 'OpenAI API',
  },
} as const;

export type ProxyEndpointName = keyof typeof PROXY_ENDPOINTS;
/**
 * OnHyper.io Configuration
 * 
 * Centralized configuration loaded from environment variables.
 * All configuration values have sensible defaults for development,
 * but production deployments must set critical secrets.
 * 
 * ## Environment Detection
 * 
 * Production mode is automatically detected when:
 * - `NODE_ENV=production`
 * - `RAILWAY_ENVIRONMENT` is set (Railway.app)
 * - `RENDER=true` (Render.com)
 * 
 * In production, the server validates that critical secrets are set.
 * 
 * ## Configuration Groups
 * 
 * | Group | Purpose |
 * |-------|---------|
 * | Server | Port, host, base URL |
 * | Database | SQLite and LMDB paths |
 * | Security | JWT secret, master key |
 * | Auth | Password hashing, token settings |
 * | Rate Limit | Request throttling |
 * | Proxy | Timeout and size limits |
 * | Plans | Tier limits for apps, secrets, requests |
 * 
 * ## Usage
 * 
 * ```typescript
 * import { config, validateProductionSecrets, PROXY_ENDPOINTS } from './config.js';
 * 
 * // Access configuration
 * console.log(config.port);           // 3000
 * console.log(config.jwtSecret);      // 'dev-...' or env var
 * console.log(config.plans.FREE);     // { requestsPerDay: 100, ... }
 * 
 * // Validate secrets before starting server
 * validateProductionSecrets();  // Throws if invalid
 * 
 * // Access proxy endpoint configuration
 * const endpoint = PROXY_ENDPOINTS['scoutos'];
 * // { target: 'https://api.scoutos.com', secretKey: 'SCOUT_API_KEY', ... }
 * ```
 * 
 * ## Security Warning
 * 
 * ⚠️ The default values for `ONHYPER_JWT_SECRET` and `ONHYPER_MASTER_KEY`
 * are intentionally insecure for development. The server will fail to start
 * in production mode if these are not overridden.
 * 
 * @module config
 */

/**
 * Determine if we're running in production mode
 * Checks multiple indicators:
 * 1. NODE_ENV=production
 * 2. RAILWAY_ENVIRONMENT (set by Railway.app)
 * 3. RENDER (set by Render.com)
 */
function isProductionMode(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const railwayEnv = process.env.RAILWAY_ENVIRONMENT;
  const renderEnv = process.env.RENDER;
  
  return (
    nodeEnv === 'production' ||
    nodeEnv === 'prod' ||
    !!railwayEnv ||
    renderEnv === 'true'
  );
}

/**
 * Critical secrets that MUST be set in production
 * These have default values for development only
 */
interface SecretValidation {
  envVar: string;
  description: string;
  defaultValue: string;
}

const CRITICAL_SECRETS: SecretValidation[] = [
  {
    envVar: 'ONHYPER_JWT_SECRET',
    description: 'JWT secret for signing authentication tokens',
    defaultValue: 'dev-jwt-secret-change-in-production',
  },
  {
    envVar: 'ONHYPER_MASTER_KEY',
    description: 'Master key for encrypting user secrets (32+ character hex string recommended)',
    defaultValue: 'dev-master-key-change-in-production',
  },
];

/**
 * Validate that all critical secrets are properly configured in production
 * 
 * @throws Error if any critical secret is missing or using default in production
 */
export function validateProductionSecrets(): void {
  if (!isProductionMode()) {
    // In development/test mode, allow defaults
    console.log('Running in development mode - default secrets allowed');
    return;
  }

  const missing: string[] = [];
  const usingDefaults: string[] = [];

  for (const secret of CRITICAL_SECRETS) {
    const value = process.env[secret.envVar];
    
    if (!value) {
      missing.push(secret.envVar);
    } else if (value === secret.defaultValue) {
      usingDefaults.push(secret.envVar);
    }
  }

  if (missing.length > 0 || usingDefaults.length > 0) {
    const errorParts: string[] = [];
    
    if (missing.length > 0) {
      errorParts.push(`Missing required environment variables: ${missing.join(', ')}`);
    }
    if (usingDefaults.length > 0) {
      errorParts.push(`Using insecure default values for: ${usingDefaults.join(', ')}`);
    }

    const errorMessage = `
╔════════════════════════════════════════════════════════════════════════╗
║                    CRITICAL SECURITY ERROR                              ║
╠════════════════════════════════════════════════════════════════════════╣
║  The server cannot start in production mode with missing or insecure    ║
║  secrets. This is a security safeguard to prevent running with          ║
║  known-default credentials.                                             ║
║                                                                         ║
║  ${errorParts.join('. ').padEnd(70)}║
║                                                                         ║
║  Required actions:                                                      ║
║  1. Set ONHYPER_JWT_SECRET to a secure random string (32+ chars)       ║
║  2. Set ONHYPER_MASTER_KEY to a secure random hex string (64 hex)      ║
║                                                                         ║
║  Example:                                                               ║
║    ONHYPER_JWT_SECRET="$(openssl rand -hex 32)"                         ║
║    ONHYPER_MASTER_KEY="$(openssl rand -hex 32)"                         ║
╚════════════════════════════════════════════════════════════════════════╝
`;
    throw new Error(errorMessage);
  }

  console.log('✓ Production secrets validated successfully');
}

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
  // DEFAULTS ARE FOR DEVELOPMENT ONLY - production will fail fast if not set
  jwtSecret: process.env.ONHYPER_JWT_SECRET || 'dev-jwt-secret-change-in-production',
  masterKey: process.env.ONHYPER_MASTER_KEY || 'dev-master-key-change-in-production',

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
    FREE: { requestsPerDay: 1000, maxApps: 3, maxSecrets: 5 },
    HOBBY: { requestsPerDay: 3000, maxApps: 10, maxSecrets: 20 },
    PRO: { requestsPerDay: 10000, maxApps: 50, maxSecrets: 50 },
    BUSINESS: { requestsPerDay: 100000, maxApps: -1, maxSecrets: -1 }, // -1 = unlimited
  },
} as const;

/**
 * Proxy endpoint configuration
 * Maps endpoint slugs to target URLs and secret key names
 */
export const PROXY_ENDPOINTS = {
  'scoutos': {
    target: 'https://api.scoutos.com',
    secretKey: 'SCOUT_API_KEY',
    description: 'ScoutOS Platform API - Agents, Workflows, Tables, Drive, Collections. Example: POST /proxy/scoutos/world/{agent_id}/_interact',
  },
  'onhyper': {
    target: 'https://onhyper.io',
    secretKey: 'ONHYPER_API_KEY',
    description: 'OnHyper API - manage apps, secrets, dashboard. Enable in Settings.',
    self: true,
  },
  'scout-atoms': {
    target: 'https://api.scoutos.com',
    secretKey: 'SCOUT_API_KEY',
    description: 'Scout OS Agents API (deprecated - use scoutos instead)',
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

/**
 * Plan tier hierarchy for feature access control
 * Higher number = higher tier with more access
 */
export const PLAN_TIERS = {
  FREE: 0,
  HOBBY: 1,
  PRO: 2,
  BUSINESS: 3,
} as const;

export type PlanTier = keyof typeof PLAN_TIERS;

/**
 * Array of plan tier names in order
 */
export const PLAN_TIER_NAMES: PlanTier[] = ['FREE', 'HOBBY', 'PRO', 'BUSINESS'];

/**
 * Get the numeric tier value for a plan name
 */
export function getPlanTier(planName: string): number {
  const tier = PLAN_TIERS[planName.toUpperCase() as keyof typeof PLAN_TIERS];
  return tier !== undefined ? tier : 0;
}

/**
 * Check if a user's plan meets or exceeds a required plan tier
 */
export function isPlanAtLeast(userPlan: string, requiredPlan: string): boolean {
  const userTier = getPlanTier(userPlan);
  const requiredTier = getPlanTier(requiredPlan);
  return userTier >= requiredTier;
}
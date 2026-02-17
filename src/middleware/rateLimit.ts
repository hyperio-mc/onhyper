/**
 * Rate Limiting Middleware for OnHyper.io
 * 
 * Implements daily rate limiting per user/IP with plan-based limits.
 * Also provides strict rate limiting for sensitive endpoints.
 * 
 * ## Rate Limit Strategy
 * 
 * - **Window**: 24 hours (resets at midnight UTC)
 * - **Identifier**: User ID if authenticated, otherwise IP + User-Agent hash
 * - **Limits**: Based on user's plan tier
 * 
 * ## Plan Limits
 * 
 * | Plan | Requests/Day |
 * |------|-------------|
 * | FREE | 100 |
 * | HOBBY | 1,000 |
 * | PRO | 10,000 |
 * | BUSINESS | Unlimited (-1) |
 * 
 * ## Response Headers
 * 
 * Every response includes rate limit info:
 * 
 * ```
 * X-RateLimit-Limit: 1000
 * X-RateLimit-Remaining: 847
 * X-RateLimit-Reset: 1704153600
 * ```
 * 
 * ## Usage
 * 
 * ```typescript
 * import { rateLimit, strictRateLimit } from './middleware/rateLimit.js';
 * 
 * // Apply general rate limiting to all routes
 * app.use('*', rateLimit);
 * 
 * // Apply strict rate limiting to sensitive endpoints
 * app.post('/api/auth/login', strictRateLimit, loginHandler);
 * app.post('/api/auth/signup', strictRateLimit, signupHandler);
 * ```
 * 
 * ## Strict Rate Limiting
 * 
 * For auth endpoints to prevent brute-force:
 * - **Window**: 1 minute
 * - **Limit**: 10 requests per minute
 * - **Purpose**: Prevent credential stuffing
 * 
 * ## Error Response
 * 
 * When rate limited:
 * 
 * ```json
 * {
 *   "error": "Rate limit exceeded",
 *   "limit": 100,
 *   "resetsAt": "2024-01-15T00:00:00.000Z"
 * }
 * ```
 * 
 * ## Implementation Note
 * 
 * Current implementation uses in-memory storage. For production
 * with multiple server instances, replace with Redis:
 * 
 * ```typescript
 * // Future: Redis implementation
 * const redis = new Redis(process.env.REDIS_URL);
 * const key = `ratelimit:${clientId}:${windowStart}`;
 * const count = await redis.incr(key);
 * await redis.expire(key, 86400);
 * ```
 * 
 * @module middleware/rateLimit
 */

import { Context, Next } from 'hono';
import { config } from '../config.js';
import { getAuthUser } from './auth.js';

// In-memory rate limit tracking (replace with Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get rate limit for a plan
 */
function getPlanLimit(plan: string): { requestsPerDay: number } {
  const planConfig = config.plans[plan as keyof typeof config.plans] || config.plans.FREE;
  return planConfig;
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(c: Context): string {
  const user = getAuthUser(c);
  if (user) {
    return `user:${user.userId}`;
  }
  
  // Fall back to IP + user agent for unauthenticated requests
  const ip = c.req.header('x-forwarded-for') || 
             c.req.header('x-real-ip') || 
             'unknown';
  const ua = c.req.header('user-agent')?.slice(0, 50) || 'unknown';
  return `ip:${ip}:${ua}`;
}

/**
 * Rate limiting middleware
 */
export async function rateLimit(c: Context, next: Next) {
  const clientId = getClientId(c);
  const user = getAuthUser(c);
  const plan = user?.plan || 'FREE';
  
  const planConfig = getPlanLimit(plan);
  const limit = planConfig.requestsPerDay;
  
  // Daily window
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const windowStart = Math.floor(now / dayMs) * dayMs;
  const resetTime = windowStart + dayMs;
  
  const key = `${clientId}:${windowStart}`;
  
  let usage = rateLimitStore.get(key);
  
  if (!usage) {
    usage = { count: 0, resetTime };
    rateLimitStore.set(key, usage);
  }
  
  // Check limit
  if (limit > 0 && usage.count >= limit) {
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', '0');
    c.header('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));
    
    return c.json({
      error: 'Rate limit exceeded',
      limit,
      resetsAt: new Date(resetTime).toISOString(),
    }, 429);
  }
  
  // Increment counter
  usage.count++;
  
  c.header('X-RateLimit-Limit', String(limit));
  c.header('X-RateLimit-Remaining', String(Math.max(0, limit - usage.count)));
  c.header('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));
  
  await next();
}

/**
 * Stricter rate limiting for sensitive endpoints (auth, proxy)
 */
export async function strictRateLimit(c: Context, next: Next) {
  const clientId = getClientId(c);
  const key = `strict:${clientId}`;
  
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10; // 10 requests per minute
  
  let usage = rateLimitStore.get(key);
  
  if (!usage || now > usage.resetTime) {
    usage = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(key, usage);
  }
  
  if (usage.count >= maxRequests) {
    return c.json({
      error: 'Too many requests. Please try again later.',
      resetsAt: new Date(usage.resetTime).toISOString(),
    }, 429);
  }
  
  usage.count++;
  await next();
}
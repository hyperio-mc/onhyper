/**
 * Subdomain Management Routes for OnHyper.io
 * 
 * Endpoints for checking availability, claiming, and managing subdomains.
 * Subdomains are unique identifiers that map to users' published apps.
 * 
 * ## Endpoints
 * 
 * ### GET /api/subdomains/check?name=X
 * Check if a subdomain is available (public, rate-limited).
 * 
 * **Query Parameters:**
 * - `name` - The subdomain to check (3-63 chars, lowercase, alphanumeric + hyphens)
 * 
 * **Response (200):**
 * ```json
 * {
 *   "available": true,
 *   "message": "Subdomain is available"
 * }
 * ```
 * 
 * **Errors:**
 * - 400: Invalid subdomain format
 * - 429: Rate limit exceeded (10 requests/minute)
 * 
 * ### POST /api/subdomains/claim
 * Claim a subdomain for the authenticated user.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Request Body:**
 * ```json
 * { "subdomain": "my-app" }
 * ```
 * 
 * **Response (200):**
 * ```json
 * { "success": true }
 * ```
 * 
 * **Errors:**
 * - 400: Invalid subdomain or validation failed
 * - 401: Not authenticated
 * - 409: Subdomain already claimed
 * - 429: Rate limit exceeded (5 requests/hour)
 * 
 * ### GET /api/subdomains/mine
 * List all subdomains owned by the authenticated user.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * { "subdomains": ["my-app", "another-app"] }
 * ```
 * 
 * ### DELETE /api/subdomains/:name
 * Release a subdomain back to the pool.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * { "success": true }
 * ```
 * 
 * **Errors:**
 * - 401: Not authenticated
 * - 403: Not owner of this subdomain
 * - 404: Subdomain not found
 * 
 * ## Rate Limiting
 * 
 * | Endpoint | Limit | Window |
 * |----------|-------|--------|
 * | GET /check | 10 req | 1 minute |
 * | POST /claim | 5 req | 1 hour |
 * 
 * @module routes/subdomains
 */

import { Hono } from 'hono';
import { Context, Next } from 'hono';
import { getAuthUser, optionalAuth } from '../middleware/auth.js';
import {
  validateSubdomain,
  isReserved,
  isSubdomainAvailable,
  claimSubdomain,
  releaseSubdomain,
  getUserSubdomains,
  canClaimSubdomain,
} from '../lib/subdomains.js';

const subdomains = new Hono();

// Apply optionalAuth to all routes to parse Bearer token
subdomains.use('*', optionalAuth);

// In-memory rate limit storage for subdomain endpoints
const subdomainRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of subdomainRateLimitStore.entries()) {
    if (now > value.resetTime) {
      subdomainRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client identifier for rate limiting (uses IP for public endpoints)
 */
function getCheckClientId(c: Context): string {
  const user = getAuthUser(c);
  if (user) {
    return `user:${user.userId}`;
  }
  // Fall back to IP for unauthenticated requests
  const ip = c.req.header('x-forwarded-for') || 
             c.req.header('x-real-ip') || 
             'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limiting for check endpoint: 10 requests per minute
 */
async function checkRateLimit(c: Context, next: Next) {
  const clientId = getCheckClientId(c);
  const key = `check:${clientId}`;
  
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;
  
  let usage = subdomainRateLimitStore.get(key);
  
  if (!usage || now > usage.resetTime) {
    usage = { count: 0, resetTime: now + windowMs };
    subdomainRateLimitStore.set(key, usage);
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

/**
 * Rate limiting for claim endpoint: 5 requests per hour
 */
async function claimRateLimit(c: Context, next: Next) {
  const user = getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  const clientId = `user:${user.userId}`;
  const key = `claim:${clientId}`;
  
  const now = Date.now();
  const windowMs = 3600000; // 1 hour
  const maxRequests = 5;
  
  let usage = subdomainRateLimitStore.get(key);
  
  if (!usage || now > usage.resetTime) {
    usage = { count: 0, resetTime: now + windowMs };
    subdomainRateLimitStore.set(key, usage);
  }
  
  if (usage.count >= maxRequests) {
    return c.json({
      error: 'Too many claim attempts. Please try again later.',
      resetsAt: new Date(usage.resetTime).toISOString(),
      remaining: maxRequests - usage.count,
    }, 429);
  }
  
  usage.count++;
  await next();
}

/**
 * GET /api/subdomains/check?name=X
 * Check if a subdomain is available
 * Public endpoint with rate limiting
 */
subdomains.get('/check', checkRateLimit, async (c) => {
  const name = c.req.query('name');
  
  if (!name) {
    return c.json({ 
      available: false, 
      message: 'Subdomain name is required' 
    }, 400);
  }
  
  const normalized = name.toLowerCase();
  
  // Validate format
  const validation = validateSubdomain(normalized);
  if (!validation.valid) {
    return c.json({ 
      available: false, 
      message: validation.error 
    }, 400);
  }
  
  // Check if reserved
  if (isReserved(normalized)) {
    return c.json({ 
      available: false, 
      message: 'This subdomain is reserved and cannot be claimed' 
    });
  }
  
  // Check availability
  const available = await isSubdomainAvailable(normalized);
  
  if (available) {
    return c.json({ 
      available: true, 
      message: 'Subdomain is available' 
    });
  } else {
    return c.json({ 
      available: false, 
      message: 'This subdomain is already claimed' 
    });
  }
});

/**
 * POST /api/subdomains/claim
 * Claim a subdomain for the authenticated user
 */
subdomains.post('/claim', claimRateLimit, async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { subdomain } = body;
    
    if (!subdomain) {
      return c.json({ 
        success: false, 
        error: 'Subdomain is required' 
      }, 400);
    }
    
    // Attempt to claim
    const result = await claimSubdomain(user.userId, subdomain);
    
    if (result.success) {
      return c.json({ success: true });
    } else {
      // Determine appropriate status code
      const statusCode = result.error?.includes('already claimed') ? 409 : 400;
      return c.json({ 
        success: false, 
        error: result.error 
      }, statusCode);
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to claim subdomain';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/subdomains/mine
 * List all subdomains owned by the authenticated user
 */
subdomains.get('/mine', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const subdomainList = await getUserSubdomains(user.userId);
  
  return c.json({ 
    subdomains: subdomainList,
    count: subdomainList.length
  });
});

/**
 * DELETE /api/subdomains/:name
 * Release a subdomain (verify ownership)
 */
subdomains.delete('/:name', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const name = c.req.param('name');
  
  if (!name) {
    return c.json({ 
      success: false, 
      error: 'Subdomain name is required' 
    }, 400);
  }
  
  const released = await releaseSubdomain(user.userId, name.toLowerCase());
  
  if (released) {
    return c.json({ success: true });
  } else {
    // Could be not owner or doesn't exist - return same error to not leak info
    return c.json({ 
      success: false, 
      error: 'Subdomain not found or you are not the owner' 
    }, 404);
  }
});

export { subdomains };
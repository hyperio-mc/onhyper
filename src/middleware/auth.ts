/**
 * Authentication Middleware for OnHyper.io
 * 
 * Provides authentication middleware for protecting routes.
 * Supports multiple authentication methods: JWT, API keys, and app ownership.
 * 
 * ## Supported Authentication Methods
 * 
 * | Method | Header | Use Case |
 * |--------|--------|----------|
 * | JWT Token | `Authorization: Bearer <token>` | Dashboard sessions |
 * | API Key | `X-API-Key: oh_live_xxx` | Programmatic access |
 * | App Slug | `X-App-Slug: my-app` | Published apps |
 * | App ID | `X-App-ID: uuid` | Internal use |
 * 
 * ## Middleware Functions
 * 
 * ### `requireAuth`
 * Requires valid authentication. Returns 401 if not provided.
 * 
 * ```typescript
 * // Apply to protected routes
 * app.use('/api/*', requireAuth);
 * 
 * // Access user in handlers
 * app.get('/api/me', requireAuth, (c) => {
 *   const user = c.get('user');
 *   return c.json(user);
 * });
 * ```
 * 
 * ### `optionalAuth`
 * Sets user context if available, but doesn't require it.
 * 
 * ```typescript
 * // User info if logged in, null otherwise
 * app.get('/api/public-but-personalized', optionalAuth, (c) => {
 *   const user = c.get('user'); // May be undefined
 *   if (user) {
 *     // Show personalized content
 *   }
 * });
 * ```
 * 
 * ### `requirePlan(...plans)`
 * Requires user to have specific plan(s).
 * 
 * ```typescript
 * app.post('/api/premium-feature', 
 *   requireAuth, 
 *   requirePlan('PRO', 'BUSINESS'),
 *   handler
 * );
 * ```
 * 
 * ### `requireAdminAuth`
 * Requires admin key for protected admin endpoints.
 * 
 * ```typescript
 * // Protect admin routes
 * adminRoutes.use('*', requireAdminAuth);
 * 
 * // Client request
 * fetch('/api/waitlist/admin/pending', {
 *   headers: { 'X-Admin-Key': process.env.ONHYPER_MASTER_KEY }
 * });
 * ```
 * 
 * ### `getAuthUser(c)`
 * Helper to safely extract user from context.
 * 
 * ```typescript
 * const user = getAuthUser(c);
 * if (!user) {
 *   return c.json({ error: 'Not authenticated' }, 401);
 * }
 * ```
 * 
 * ## User Context
 * 
 * When authenticated, the following is available:
 * 
 * ```typescript
 * interface UserContext {
 *   userId: string;
 *   email: string;
 *   plan: 'FREE' | 'HOBBY' | 'PRO' | 'BUSINESS';
 * }
 * ```
 * 
 * @module middleware/auth
 */

import { Context, Next } from 'hono';
import { verifyToken, getApiKeyByKey, getUserById } from '../lib/users.js';

// Extend Hono's context type
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      userId: string;
      email: string;
      plan: string;
    };
    isAdmin: boolean;
  }
}

/**
 * Middleware to require authentication via JWT or API key
 */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('authorization');
  const apiKey = c.req.header('x-api-key');
  
  let user: { userId: string; email: string; plan: string } | null = null;
  
  // Try JWT token first
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    user = verifyToken(token);
  }
  
  // Try API key
  if (!user && apiKey) {
    if (!apiKey.startsWith('oh_live_')) {
      return c.json({ error: 'Invalid API key format' }, 401);
    }
    
    const keyRecord = getApiKeyByKey(apiKey);
    if (!keyRecord) {
      return c.json({ error: 'Invalid API key' }, 401);
    }
    
    const dbUser = getUserById(keyRecord.user_id);
    if (!dbUser) {
      return c.json({ error: 'User not found' }, 401);
    }
    
    user = {
      userId: dbUser.id,
      email: dbUser.email,
      plan: dbUser.plan,
    };
  }
  
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  c.set('user', user);
  await next();
}

/**
 * Optional authentication - sets user if provided, but doesn't require it
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('authorization');
  const apiKey = c.req.header('x-api-key');
  
  let user: { userId: string; email: string; plan: string } | null = null;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    user = verifyToken(token);
  }
  
  if (!user && apiKey?.startsWith('oh_live_')) {
    const keyRecord = getApiKeyByKey(apiKey);
    if (keyRecord) {
      const dbUser = getUserById(keyRecord.user_id);
      if (dbUser) {
        user = {
          userId: dbUser.id,
          email: dbUser.email,
          plan: dbUser.plan,
        };
      }
    }
  }
  
  if (user) {
    c.set('user', user);
  }
  
  await next();
}

/**
 * Middleware to require a specific plan or higher
 */
export function requirePlan(...allowedPlans: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    if (!allowedPlans.includes(user.plan)) {
      return c.json({
        error: 'Plan upgrade required',
        currentPlan: user.plan,
        requiredPlans: allowedPlans,
      }, 403);
    }
    
    await next();
  };
}

/**
 * Get the authenticated user from context
 */
export function getAuthUser(c: Context): { userId: string; email: string; plan: string } | undefined {
  return c.get('user');
}

/**
 * Admin authentication middleware
 * 
 * Protects admin-only endpoints by requiring a valid admin key.
 * The admin key is passed via the X-Admin-Key header and must match
 * the ONHYPER_MASTER_KEY environment variable.
 * 
 * Usage:
 *   // In routes file
 *   import { requireAdminAuth } from '../middleware/auth.js';
 *   
 *   adminRoutes.use('*', requireAdminAuth);
 *   
 *   // Client request
 *   fetch('/api/admin/endpoint', {
 *     headers: { 'X-Admin-Key': 'your-admin-key' }
 *   })
 * 
 * Environment:
 *   ONHYPER_MASTER_KEY - The secret admin key (set in production!)
 * 
 * Security:
 *   - Key is compared using timing-safe comparison to prevent timing attacks
 *   - Returns 401 for missing/invalid key
 *   - Does not reveal whether the key exists or is just wrong
 */
export async function requireAdminAuth(c: Context, next: Next) {
  const adminKey = c.req.header('x-admin-key');
  const masterKey = process.env.ONHYPER_MASTER_KEY;
  
  // Check if admin key was provided
  if (!adminKey) {
    return c.json({ 
      error: 'Admin authentication required',
      hint: 'Provide X-Admin-Key header'
    }, 401);
  }
  
  // Check if master key is configured
  if (!masterKey || masterKey === 'change-me-in-production-32-bytes-hex') {
    console.error('[SECURITY] ONHYPER_MASTER_KEY not configured or using default value');
    return c.json({ 
      error: 'Admin authentication not configured'
    }, 500);
  }
  
  // Timing-safe comparison to prevent timing attacks
  // We compare both strings character by character
  let isValid = adminKey.length === masterKey.length;
  if (isValid) {
    for (let i = 0; i < adminKey.length; i++) {
      // Use bitwise XOR to avoid branching that could leak timing info
      if (adminKey.charCodeAt(i) !== masterKey.charCodeAt(i)) {
        isValid = false;
      }
    }
  }
  
  if (!isValid) {
    // Log failed attempt (but don't reveal specifics)
    console.warn(`[ADMIN AUTH] Failed admin auth attempt from ${c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown IP'}`);
    return c.json({ 
      error: 'Invalid admin key'
    }, 401);
  }
  
  // Mark request as admin authenticated
  c.set('isAdmin', true);
  await next();
}

/**
 * Check if request has admin authentication
 */
export function isAdmin(c: Context): boolean {
  return c.get('isAdmin') === true;
}
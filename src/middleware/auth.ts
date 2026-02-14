/**
 * Authentication middleware for OnHyper.io
 * 
 * Validates JWT tokens and API keys, attaching user info to the request context.
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
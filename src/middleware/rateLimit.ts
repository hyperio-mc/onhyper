/**
 * Rate limiting middleware for OnHyper.io
 * 
 * Implements sliding window rate limiting with configurable limits per plan.
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
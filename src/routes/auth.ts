/**
 * Authentication routes for OnHyper.io
 * 
 * Endpoints:
 * - POST /api/auth/signup - Create a new account
 * - POST /api/auth/login - Authenticate and get JWT
 * - POST /api/auth/token - Validate JWT and return user info
 */

import { Hono } from 'hono';
import { createUser, authenticateUser, generateToken, verifyToken, getUserById } from '../lib/users.js';
import { strictRateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';

const auth = new Hono();

/**
 * POST /api/auth/signup
 * Create a new user account
 */
auth.post('/signup', strictRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, plan } = body;
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }
    
    // Validate password
    if (password.length < config.auth.minPasswordLength) {
      return c.json({ 
        error: `Password must be at least ${config.auth.minPasswordLength} characters` 
      }, 400);
    }
    
    // Create user
    const user = await createUser(email, password, plan || 'FREE');
    
    // Generate JWT
    const token = generateToken(user);
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.created_at,
      },
      token,
    }, 201);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create account';
    
    if (message.includes('already registered')) {
      return c.json({ error: message }, 409);
    }
    
    return c.json({ error: message }, 400);
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email and password
 */
auth.post('/login', strictRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    // Authenticate
    const user = await authenticateUser(email, password);
    
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    // Generate JWT
    const token = generateToken(user);
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
      token,
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/auth/token
 * Validate a JWT token and return user info
 */
auth.post('/token', async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }
    
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
    
    // Get fresh user data
    const user = getUserById(payload.userId);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.created_at,
      },
    });
    
  } catch (error) {
    return c.json({ error: 'Token validation failed' }, 401);
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const dbUser = getUserById(user.userId);
  
  if (!dbUser) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  return c.json({
    id: dbUser.id,
    email: dbUser.email,
    plan: dbUser.plan,
    createdAt: dbUser.created_at,
  });
});

export { auth };
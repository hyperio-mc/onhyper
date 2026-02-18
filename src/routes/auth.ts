/**
 * Authentication Routes for OnHyper.io
 * 
 * Handles user authentication including signup, login, and token validation.
 * All endpoints use JSON request/response format.
 * 
 * ## Endpoints
 * 
 * ### POST /api/auth/signup
 * Create a new user account.
 * 
 * **Request Body:**
 * ```json
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword",
 *   "name": "Optional Name",
 *   "plan": "FREE",
 *   "source": "organic"
 * }
 * ```
 * 
 * **Response (201):**
 * ```json
 * {
 *   "user": { "id": "uuid", "email": "user@example.com", "plan": "FREE", "createdAt": "..." },
 *   "token": "eyJhbGciOiJIUzI1NiIs..."
 * }
 * ```
 * 
 * **Errors:**
 * - 400: Invalid email/password format
 * - 409: Email already registered
 * 
 * ### POST /api/auth/login
 * Authenticate and receive a JWT token.
 * 
 * **Request Body:**
 * ```json
 * { "email": "user@example.com", "password": "securepassword" }
 * ```
 * 
 * **Response (200):**
 * ```json
 * {
 *   "user": { "id": "uuid", "email": "user@example.com", "plan": "FREE" },
 *   "token": "eyJhbGciOiJIUzI1NiIs..."
 * }
 * ```
 * 
 * **Errors:**
 * - 400: Missing email or password
 * - 401: Invalid credentials
 * 
 * ### POST /api/auth/token
 * Validate an existing JWT token.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * {
 *   "valid": true,
 *   "user": { "id": "uuid", "email": "user@example.com", "plan": "FREE", "createdAt": "..." }
 * }
 * ```
 * 
 * **Errors:**
 * - 401: Missing or invalid token
 * - 404: User not found
 * 
 * ### GET /api/auth/me
 * Get current authenticated user info.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * { "id": "uuid", "email": "user@example.com", "plan": "FREE", "createdAt": "..." }
 * ```
 * 
 * **Errors:**
 * - 401: Not authenticated
 * - 404: User not found
 * 
 * @module routes/auth
 */

import { Hono } from 'hono';
import { createUser, authenticateUser, generateToken, verifyToken, getUserById, changeUserPassword, resetUserPassword, createPasswordResetToken, validatePasswordResetToken, deletePasswordResetToken } from '../lib/users.js';
import { strictRateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import { identifyServerUser, trackServerEvent } from '../lib/analytics.js';
import { sendWelcomeEmail, sendPasswordResetEmail, isEmailConfigured } from '../lib/email.js';

const auth = new Hono();

/**
 * POST /api/auth/signup
 * Create a new user account
 */
auth.post('/signup', strictRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, plan, source } = body;
    
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
    
    // Track signup event (server-side)
    trackServerEvent(user.id, 'signup', {
      email: user.email,
      plan: user.plan,
      source: source || 'organic',
    });
    
    // Identify user in analytics
    identifyServerUser(user.id, {
      email: user.email,
      plan: user.plan,
      createdAt: user.created_at,
    });
    
    // Send welcome email (async, don't block signup)
    // Extract name from email if not provided
    const userName = body.name || email.split('@')[0];
    
    if (isEmailConfigured()) {
      // Send welcome email in background
      sendWelcomeEmail(email, userName)
        .then(result => {
          if (result.success) {
            console.log(`[EMAIL] Welcome email sent to ${email}`);
          } else {
            console.error(`[EMAIL] Failed to send welcome email to ${email}:`, result.error);
          }
        })
        .catch(err => {
          console.error('[EMAIL] Welcome email error:', err);
        });
    } else {
      console.log(`[EMAIL] Email not configured - skipping welcome email for ${email}`);
    }
    
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
    
    // Track login event (server-side)
    trackServerEvent(user.id, 'login', {
      email: user.email,
    });
    
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

/**
 * PUT /api/auth/password
 * Change the current user's password
 * 
 * Headers: Authorization: Bearer <token>
 * Body: { currentPassword: string, newPassword: string }
 * Response: { success: true } or { error: string }
 */
auth.put('/password', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'Not authenticated' }, 401);
    }
    
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current password and new password are required' }, 400);
    }
    
    // Update password
    await changeUserPassword(user.userId, currentPassword, newPassword);
    
    return c.json({ success: true });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update password';
    
    // Map specific errors to status codes
    if (message.includes('incorrect')) {
      return c.json({ error: 'Token validation failed' }, 401);
    }
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
auth.post('/forgot-password', strictRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }
    
    // Create reset token (returns null if user doesn't exist)
    const result = createPasswordResetToken(email);
    
    // Always return success to avoid revealing if email exists
    if (!result) {
      // User doesn't exist, but return success anyway for security
      return c.json({ 
        success: true, 
        message: 'If an account with that email exists, a reset link has been sent.' 
      });
    }
    
    // Send password reset email
    if (isEmailConfigured()) {
      // Get user for name
      const user = getUserById(result.userId);
      const userName = user?.email?.split('@')[0];
      
      const emailResult = await sendPasswordResetEmail(email, result.token, userName);
      if (!emailResult.success) {
        console.error('[AUTH] Failed to send password reset email:', emailResult.error);
      }
    } else {
      console.log(`[AUTH] Email not configured - password reset token for ${email}: ${result.token}`);
    }
    
    // Track password reset request
    trackServerEvent(result.userId, 'password_reset_requested', {
      email: email,
    });
    
    return c.json({ 
      success: true, 
      message: 'If an account with that email exists, a reset link has been sent.' 
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process request';
    // Don't reveal internal errors
    return c.json({ 
      success: true, 
      message: 'If an account with that email exists, a reset link has been sent.' 
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 */
auth.post('/reset-password', strictRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const { token, password } = body;
    
    if (!token || !password) {
      return c.json({ error: 'Token and new password are required' }, 400);
    }
    
    // Validate password complexity
    if (password.length < config.auth.minPasswordLength) {
      return c.json({ 
        error: `Password must be at least ${config.auth.minPasswordLength} characters` 
      }, 400);
    }
    
    // Validate the reset token
    const tokenInfo = validatePasswordResetToken(token);
    
    if (!tokenInfo) {
      return c.json({ error: 'Invalid or expired reset token' }, 400);
    }
    
    // Update the password
    await resetUserPassword(tokenInfo.userId, password);
    
    // Delete the used token
    deletePasswordResetToken(token);
    
    // Track password reset completion
    trackServerEvent(tokenInfo.userId, 'password_reset_completed', {
      email: tokenInfo.email,
    });
    
    return c.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    return c.json({ error: message }, 500);
  }
});

export { auth };
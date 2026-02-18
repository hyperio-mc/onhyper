/**
 * User Management Utilities for OnHyper.io
 * 
 * Core user operations: creation, authentication, and API key management.
 * Handles password hashing with bcrypt and JWT token generation.
 * 
 * ## Security Model
 * 
 * - Passwords hashed with bcrypt (10 rounds by default)
 * - JWTs signed with server secret, 7-day expiration
 * - API keys prefixed with `oh_live_` for easy identification
 * 
 * ## Usage
 * 
 * ```typescript
 * import { 
 *   createUser, 
 *   authenticateUser, 
 *   generateToken, 
 *   verifyToken,
 *   createApiKey,
 *   getApiKeyByKey 
 * } from './lib/users.js';
 * 
 * // Sign up new user
 * const user = await createUser('user@example.com', 'password123', 'FREE');
 * 
 * // Login
 * const user = await authenticateUser('user@example.com', 'password123');
 * if (user) {
 *   const token = generateToken(user);
 *   // Return token to client
 * }
 * 
 * // Verify token from request
 * const payload = verifyToken(token);
 * if (payload) {
 *   const { userId, email, plan } = payload;
 * }
 * 
 * // Create API key for programmatic access
 * const apiKey = await createApiKey(user.id, user.plan);
 * // Returns: "oh_live_abc123..."
 * 
 * // Validate API key
 * const keyRecord = getApiKeyByKey('oh_live_abc123...');
 * if (keyRecord) {
 *   // Key is valid, get user from keyRecord.user_id
 * }
 * ```
 * 
 * ## Password Security
 * 
 * - Minimum length: 8 characters (configurable)
 * - Hashed with bcrypt (configurable rounds)
 * - Hashes never logged or returned in responses
 * 
 * ## JWT Tokens
 * 
 * ```typescript
 * // Token payload
 * {
 *   sub: userId,      // Subject (user ID)
 *   email: string,    // User email
 *   plan: string,     // User's plan tier
 *   iat: number,      // Issued at
 *   exp: number       // Expiration
 * }
 * ```
 * 
 * ## API Keys
 * 
 * - Format: `oh_live_{32-char-hex}`
 * - Stored in `api_keys` table
 * - Scoped to user and plan
 * - Can be revoked by user
 * 
 * @module lib/users
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getDatabase, User } from './db.js';
import { config } from '../config.js';

/**
 * Generate a secure random token for password reset
 */
function generateResetToken(): string {
  // Generate 32 bytes of random data and convert to hex
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new user
 */
export async function createUser(email: string, password: string, plan: string = 'FREE'): Promise<User> {
  const db = getDatabase();
  
  // Validate inputs
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }
  if (!password || password.length < config.auth.minPasswordLength) {
    throw new Error(`Password must be at least ${config.auth.minPasswordLength} characters`);
  }
  
  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('Email already registered');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  
  // Create user
  const id = randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO users (id, email, password_hash, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, email, passwordHash, plan, now, now);
  
  return {
    id,
    email,
    password_hash: passwordHash,
    plan,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Authenticate a user by email and password
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const db = getDatabase();
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  if (!user) {
    return null;
  }
  
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return null;
  }
  
  // Update last login time
  db.prepare('UPDATE users SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);
  
  return user;
}

/**
 * Get a user by ID
 */
export function getUserById(id: string): User | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined || null;
}

/**
 * Get a user by email
 */
export function getUserByEmail(email: string): User | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined || null;
}

/**
 * Update a user's plan
 */
export function updateUserPlan(userId: string, plan: string): void {
  const db = getDatabase();
  db.prepare('UPDATE users SET plan = ?, updated_at = ? WHERE id = ?')
    .run(plan, new Date().toISOString(), userId);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      plan: user.plan,
    },
    config.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): { userId: string; email: string; plan: string } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    return {
      userId: payload.sub as string,
      email: payload.email as string,
      plan: payload.plan as string,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a unique API key
 */
export function generateApiKey(): string {
  const prefix = 'oh_live_';
  const key = randomUUID().replace(/-/g, '');
  return `${prefix}${key}`;
}

/**
 * Create an API key for a user
 */
export async function createApiKey(userId: string, plan: string): Promise<string> {
  const db = getDatabase();
  
  const id = randomUUID();
  const key = generateApiKey();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO api_keys (id, user_id, key, plan, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, key, plan, now);
  
  return key;
}

/**
 * Get an API key record by key value
 */
export function getApiKeyByKey(key: string): { id: string; user_id: string; key: string; plan: string } | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM api_keys WHERE key = ?').get(key) as any || null;
}

/**
 * List all API keys for a user
 */
export function listApiKeysByUser(userId: string): Array<{ id: string; key: string; plan: string; created_at: string }> {
  const db = getDatabase();
  return db.prepare('SELECT id, key, plan, created_at FROM api_keys WHERE user_id = ?').all(userId) as any[];
}

/**
 * Delete an API key
 */
export function deleteApiKey(userId: string, keyId: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(keyId, userId);
  return result.changes > 0;
}

/**
 * Get a user's API key value by user ID
 * Returns the first active API key for the user (oh_live_xxx format)
 */
export function getUserApiKeyByUserId(userId: string): string | null {
  const db = getDatabase();
  const keyRecord = db.prepare('SELECT key FROM api_keys WHERE user_id = ? LIMIT 1').get(userId) as { key: string } | undefined;
  return keyRecord?.key || null;
}

// ============================================================================
// Password Reset Functions
// ============================================================================

/**
 * Create a password reset token for a user
 * Returns the token string, or null if user doesn't exist
 */
export function createPasswordResetToken(email: string): { token: string; userId: string } | null {
  const db = getDatabase();
  
  // Find user by email
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  if (!user) {
    return null;
  }
  
  // Delete any existing reset tokens for this user
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
  
  // Create new token
  const id = randomUUID();
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  
  db.prepare(`
    INSERT INTO password_resets (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, user.id, token, expiresAt);
  
  return { token, userId: user.id };
}

/**
 * Validate a password reset token
 * Returns the user ID if valid, null if invalid or expired
 */
export function validatePasswordResetToken(token: string): { userId: string; email: string } | null {
  const db = getDatabase();
  
  const reset = db.prepare(`
    SELECT pr.user_id, u.email, pr.expires_at
    FROM password_resets pr
    JOIN users u ON pr.user_id = u.id
    WHERE pr.token = ?
  `).get(token) as { user_id: string; email: string; expires_at: string } | undefined;
  
  if (!reset) {
    return null;
  }
  
  // Check if expired
  if (new Date(reset.expires_at) < new Date()) {
    // Delete expired token
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);
    return null;
  }
  
  return { userId: reset.user_id, email: reset.email };
}

/**
 * Delete a password reset token (after successful password reset)
 */
export function deletePasswordResetToken(token: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);
}

/**
 * Reset a user's password (for password reset flow)
 * Does not require current password - used when user has verified via reset token
 * @param userId The user's ID
 * @param newPassword The new password to set
 * @returns true if successful, throws error if validation fails
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const db = getDatabase();
  
  // Validate new password
  if (!newPassword || newPassword.length < config.auth.minPasswordLength) {
    throw new Error(`Password must be at least ${config.auth.minPasswordLength} characters`);
  }
  
  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
  
  // Update password
  const result = db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
  `).run(passwordHash, new Date().toISOString(), userId);
  
  return result.changes > 0;
}

/**
 * Change a user's password
 * Validates the current password before updating
 * @param userId The user's ID
 * @param currentPassword The user's current password
 * @param newPassword The new password to set
 * @returns true if successful, throws error if validation fails
 */
export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const db = getDatabase();
  
  // Get the user
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (!user) {
    throw new Error('User not found');
  }
  
  // Validate current password
  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!validPassword) {
    throw new Error('Current password is incorrect');
  }
  
  // Validate new password
  if (!newPassword || newPassword.length < config.auth.minPasswordLength) {
    throw new Error(`New password must be at least ${config.auth.minPasswordLength} characters`);
  }
  
  // Don't allow same password
  if (currentPassword === newPassword) {
    throw new Error('New password must be different from current password');
  }
  
  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
  
  // Update password
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(newPasswordHash, now, userId);
  
  return true;
}
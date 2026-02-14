/**
 * User management utilities for OnHyper.io
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getDatabase, User } from './db.js';
import { config } from '../config.js';

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
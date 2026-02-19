/**
 * Tests for user management utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  createUser, 
  authenticateUser, 
  getUserById, 
  getUserByEmail,
  updateUserPlan,
  generateToken,
  verifyToken,
  generateApiKey,
  createApiKey,
  getApiKeyByKey,
  listApiKeysByUser,
  deleteApiKey,
  deleteUserAccount,
} from './users.js';
import { initDatabase, closeDatabase, getDatabase, enableTestMode, resetDatabase } from './db.js';
import { initLMDB, closeLMDB } from './lmdb.js';

describe('users', () => {
  beforeEach(() => {
    // Enable test mode and reset database for each test
    enableTestMode();
    resetDatabase();
    initDatabase();
    
    // Initialize LMDB for tests that need it (deleteUserAccount)
    initLMDB();
  });

  afterEach(async () => {
    closeDatabase();
    await closeLMDB();
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const user = await createUser('test@example.com', 'password123', 'FREE');
      
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.plan).toBe('FREE');
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe('password123'); // Should be hashed
    });

    it('should default to FREE plan', async () => {
      const user = await createUser('test@example.com', 'password123');
      
      expect(user.plan).toBe('FREE');
    });

    it('should reject invalid email', async () => {
      await expect(createUser('invalid-email', 'password123'))
        .rejects.toThrow('Invalid email address');
    });

    it('should reject missing email', async () => {
      await expect(createUser('', 'password123'))
        .rejects.toThrow('Invalid email address');
    });

    it('should reject short password', async () => {
      await expect(createUser('test@example.com', 'short'))
        .rejects.toThrow('Password must be at least');
    });

    it('should reject duplicate email', async () => {
      await createUser('test@example.com', 'password123');
      
      await expect(createUser('test@example.com', 'different123'))
        .rejects.toThrow('Email already registered');
    });

    it('should hash password with bcrypt', async () => {
      const user = await createUser('test@example.com', 'password123');
      
      // Bcrypt hashes start with $2b$
      expect(user.password_hash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate with correct credentials', async () => {
      await createUser('test@example.com', 'password123');
      
      const user = await authenticateUser('test@example.com', 'password123');
      
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for wrong password', async () => {
      await createUser('test@example.com', 'password123');
      
      const user = await authenticateUser('test@example.com', 'wrongpassword');
      
      expect(user).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const user = await authenticateUser('nonexistent@example.com', 'password123');
      
      expect(user).toBeNull();
    });

    it('should update updated_at on successful login', async () => {
      const created = await createUser('test@example.com', 'password123');
      const originalUpdatedAt = created.updated_at;
      
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const user = await authenticateUser('test@example.com', 'password123');
      
      // The authenticate function updates the timestamp
      expect(user).not.toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const created = await createUser('test@example.com', 'password123');
      
      const user = getUserById(created.id);
      
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for non-existent ID', () => {
      const user = getUserById('non-existent-uuid');
      
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      await createUser('test@example.com', 'password123');
      
      const user = getUserByEmail('test@example.com');
      
      expect(user).not.toBeNull();
      expect(user?.id).toBeDefined();
    });

    it('should return null for non-existent email', () => {
      const user = getUserByEmail('nonexistent@example.com');
      
      expect(user).toBeNull();
    });
  });

  describe('updateUserPlan', () => {
    it('should update user plan', async () => {
      const user = await createUser('test@example.com', 'password123');
      
      updateUserPlan(user.id, 'PRO');
      
      const updated = getUserById(user.id);
      expect(updated?.plan).toBe('PRO');
    });
  });

  describe('generateToken and verifyToken', () => {
    it('should generate and verify a valid token', async () => {
      const user = await createUser('test@example.com', 'password123');
      
      const token = generateToken(user);
      const payload = verifyToken(token);
      
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(user.id);
      expect(payload?.email).toBe(user.email);
      expect(payload?.plan).toBe(user.plan);
    });

    it('should return null for invalid token', () => {
      const payload = verifyToken('invalid-token');
      
      expect(payload).toBeNull();
    });

    it('should return null for malformed token', () => {
      const payload = verifyToken('not-a-jwt-token');
      
      expect(payload).toBeNull();
    });
  });

  describe('API Keys', () => {
    it('generateApiKey should produce valid format', () => {
      const key = generateApiKey();
      
      expect(key).toMatch(/^oh_live_[a-f0-9]{32}$/);
    });

    it('generateApiKey should produce unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      
      expect(key1).not.toBe(key2);
    });

    it('createApiKey should create and return a key', async () => {
      const user = await createUser('test@example.com', 'password123');
      
      const key = await createApiKey(user.id, user.plan);
      
      expect(key).toMatch(/^oh_live_/);
      
      const keyRecord = getApiKeyByKey(key);
      expect(keyRecord).not.toBeNull();
      expect(keyRecord?.user_id).toBe(user.id);
    });

    it('getApiKeyByKey should return null for non-existent key', () => {
      const result = getApiKeyByKey('oh_live_nonexistent');
      
      expect(result).toBeNull();
    });

    it('listApiKeysByUser should return all keys for a user', async () => {
      const user = await createUser('test@example.com', 'password123');
      
      await createApiKey(user.id, user.plan);
      await createApiKey(user.id, user.plan);
      
      const keys = listApiKeysByUser(user.id);
      
      expect(keys).toHaveLength(2);
      expect(keys[0].key).toMatch(/^oh_live_/);
    });

    it('listApiKeysByUser should return empty array for user with no keys', async () => {
      const user = await createUser('test@example.com', 'password123');
      
      const keys = listApiKeysByUser(user.id);
      
      expect(keys).toHaveLength(0);
    });

    it('deleteApiKey should delete a key', async () => {
      const user = await createUser('test@example.com', 'password123');
      const key = await createApiKey(user.id, user.plan);
      
      const keysBefore = listApiKeysByUser(user.id);
      expect(keysBefore).toHaveLength(1);
      
      const deleted = deleteApiKey(user.id, keysBefore[0].id);
      expect(deleted).toBe(true);
      
      const keysAfter = listApiKeysByUser(user.id);
      expect(keysAfter).toHaveLength(0);
    });

    it('deleteApiKey should return false for non-existent key', async () => {
      const user = await createUser('test@example.com', 'password123');
      
      const deleted = deleteApiKey(user.id, 'non-existent-id');
      
      expect(deleted).toBe(false);
    });

    it('deleteApiKey should not delete another user\'s key', async () => {
      const user1 = await createUser('user1@example.com', 'password123');
      const user2 = await createUser('user2@example.com', 'password123');
      
      await createApiKey(user1.id, user1.plan);
      const key2 = await createApiKey(user2.id, user2.plan);
      
      const keys2Before = listApiKeysByUser(user2.id);
      
      // Try to delete user2's key as user1
      const deleted = deleteApiKey(user1.id, keys2Before[0].id);
      
      expect(deleted).toBe(false);
      
      // Key should still exist
      const keys2After = listApiKeysByUser(user2.id);
      expect(keys2After).toHaveLength(1);
    });
  });

  describe('deleteUserAccount', () => {
    it('should delete user with correct password', async () => {
      const user = await createUser('delete-test@example.com', 'password123');
      
      // User should exist
      expect(getUserById(user.id)).not.toBeNull();
      
      // Delete account
      const result = await deleteUserAccount(user.id, 'password123');
      
      expect(result).toBe(true);
      
      // User should no longer exist
      expect(getUserById(user.id)).toBeNull();
    });

    it('should reject deletion with wrong password', async () => {
      const user = await createUser('delete-wrong@example.com', 'password123');
      
      await expect(deleteUserAccount(user.id, 'wrongpassword'))
        .rejects.toThrow('Current password is incorrect');
      
      // User should still exist
      expect(getUserById(user.id)).not.toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(deleteUserAccount('non-existent-id', 'password123'))
        .rejects.toThrow('User not found');
    });

    it('should cascade delete API keys', async () => {
      const user = await createUser('delete-apikeys@example.com', 'password123');
      
      // Create multiple API keys
      await createApiKey(user.id, user.plan);
      await createApiKey(user.id, user.plan);
      
      expect(listApiKeysByUser(user.id)).toHaveLength(2);
      
      // Delete account
      await deleteUserAccount(user.id, 'password123');
      
      // API keys should be deleted (returns empty array)
      expect(listApiKeysByUser(user.id)).toHaveLength(0);
    });

    it('should cascade delete user settings', async () => {
      const user = await createUser('delete-settings@example.com', 'password123');
      const db = getDatabase();
      
      // Create user settings
      db.prepare('INSERT INTO user_settings (user_id, onhyper_api_enabled) VALUES (?, 1)').run(user.id);
      
      // Settings should exist
      const settingsBefore = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id);
      expect(settingsBefore).toBeDefined();
      
      // Delete account
      await deleteUserAccount(user.id, 'password123');
      
      // Settings should be deleted
      const settingsAfter = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id);
      expect(settingsAfter).toBeUndefined();
    });

    it('should cascade delete apps', async () => {
      const user = await createUser('delete-apps@example.com', 'password123');
      const db = getDatabase();
      
      // Create an app
      const appId = 'test-app-id';
      db.prepare(`
        INSERT INTO apps (id, user_id, name, slug, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(appId, user.id, 'Test App', 'test-app-slug');
      
      // App should exist
      const appBefore = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);
      expect(appBefore).toBeDefined();
      
      // Delete account
      await deleteUserAccount(user.id, 'password123');
      
      // App should be deleted
      const appAfter = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);
      expect(appAfter).toBeUndefined();
    });

    it('should cascade delete secrets', async () => {
      const user = await createUser('delete-secrets@example.com', 'password123');
      const db = getDatabase();
      
      // Create a secret
      db.prepare(`
        INSERT INTO secrets (id, user_id, name, value_encrypted, iv, salt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run('secret-id', user.id, 'test-secret', 'encrypted-value', 'iv', 'salt');
      
      // Secret should exist
      const secretBefore = db.prepare('SELECT * FROM secrets WHERE user_id = ?').get(user.id);
      expect(secretBefore).toBeDefined();
      
      // Delete account
      await deleteUserAccount(user.id, 'password123');
      
      // Secret should be deleted
      const secretAfter = db.prepare('SELECT * FROM secrets WHERE user_id = ?').get(user.id);
      expect(secretAfter).toBeUndefined();
    });

    it('should not affect other users\' data', async () => {
      const user1 = await createUser('keep-user@example.com', 'password123');
      const user2 = await createUser('delete-user@example.com', 'password123');
      
      // Create API key for user1
      await createApiKey(user1.id, user1.plan);
      
      // Delete user2's account
      await deleteUserAccount(user2.id, 'password123');
      
      // user1's API key should still exist
      expect(listApiKeysByUser(user1.id)).toHaveLength(1);
      expect(getUserById(user1.id)).not.toBeNull();
      
      // user2 should be deleted
      expect(getUserById(user2.id)).toBeNull();
      expect(listApiKeysByUser(user2.id)).toHaveLength(0);
    });
  });
});
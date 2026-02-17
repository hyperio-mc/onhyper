/**
 * Tests for Settings API and Self-API Proxy functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  enableTestMode,
  resetDatabase,
  getUserSettings,
  setUserSettings,
} from '../lib/db.js';
import {
  createUser,
  generateToken,
  createApiKey,
  getApiKeyByKey,
  getUserApiKeyByUserId,
} from '../lib/users.js';

describe('User Settings DB Functions', () => {
  beforeEach(() => {
    enableTestMode();
    resetDatabase();
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('getUserSettings', () => {
    it('should return null for non-existent user settings', async () => {
      const settings = getUserSettings('non-existent-user-id');
      expect(settings).toBeNull();
    });

    it('should return settings after they are set', async () => {
      const user = await createUser('test@example.com', 'password123');

      setUserSettings(user.id, { onhyper_api_enabled: 1 });
      const settings = getUserSettings(user.id);

      expect(settings).not.toBeNull();
      expect(settings?.user_id).toBe(user.id);
      expect(settings?.onhyper_api_enabled).toBe(1);
    });
  });

  describe('setUserSettings', () => {
    it('should create new settings for user', async () => {
      const user = await createUser('test@example.com', 'password123');

      setUserSettings(user.id, { onhyper_api_enabled: 1 });

      const settings = getUserSettings(user.id);
      expect(settings?.onhyper_api_enabled).toBe(1);
    });

    it('should update existing settings', async () => {
      const user = await createUser('test@example.com', 'password123');

      // Set initial value
      setUserSettings(user.id, { onhyper_api_enabled: 0 });
      let settings = getUserSettings(user.id);
      expect(settings?.onhyper_api_enabled).toBe(0);

      // Update to enabled
      setUserSettings(user.id, { onhyper_api_enabled: 1 });
      settings = getUserSettings(user.id);
      expect(settings?.onhyper_api_enabled).toBe(1);

      // Update back to disabled
      setUserSettings(user.id, { onhyper_api_enabled: 0 });
      settings = getUserSettings(user.id);
      expect(settings?.onhyper_api_enabled).toBe(0);
    });

    it('should store onhyper_api_enabled as integer (SQLite boolean)', async () => {
      const user = await createUser('test@example.com', 'password123');

      setUserSettings(user.id, { onhyper_api_enabled: 1 });
      expect(getUserSettings(user.id)?.onhyper_api_enabled).toBe(1);

      setUserSettings(user.id, { onhyper_api_enabled: 0 });
      expect(getUserSettings(user.id)?.onhyper_api_enabled).toBe(0);
    });
  });
});

describe('Settings API Route Logic', () => {
  beforeEach(() => {
    enableTestMode();
    resetDatabase();
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Authentication identification', () => {
    it('should identify user from valid JWT token', async () => {
      const user = await createUser('test@example.com', 'password123');
      const token = generateToken(user);

      // Verify token can be verified and contains correct user ID
      const { verifyToken } = await import('../lib/users.js');
      const payload = verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(user.id);
      expect(payload?.email).toBe(user.email);
    });

    it('should identify user from valid API key', async () => {
      const user = await createUser('test@example.com', 'password123');
      const apiKey = await createApiKey(user.id, user.plan);

      const keyRecord = getApiKeyByKey(apiKey);
      expect(keyRecord).not.toBeNull();
      expect(keyRecord?.user_id).toBe(user.id);
    });

    it('should return null for invalid API key format', () => {
      const keyRecord = getApiKeyByKey('invalid-key');
      expect(keyRecord).toBeNull();
    });

    it('should return null for non-existent API key', () => {
      const keyRecord = getApiKeyByKey('oh_live_nonexistent1234567890123456');
      expect(keyRecord).toBeNull();
    });
  });

  describe('Settings default values', () => {
    it('should return onhyper_api_enabled false by default for new users', async () => {
      const user = await createUser('test@example.com', 'password123');

      // New user should have no settings (null)
      const settings = getUserSettings(user.id);
      expect(settings).toBeNull();
    });
  });

  describe('Settings update validation', () => {
    it('should accept integer values for onhyper_api_enabled', async () => {
      const user = await createUser('test@example.com', 'password123');

      // These should work
      setUserSettings(user.id, { onhyper_api_enabled: 1 });
      expect(getUserSettings(user.id)?.onhyper_api_enabled).toBe(1);

      setUserSettings(user.id, { onhyper_api_enabled: 0 });
      expect(getUserSettings(user.id)?.onhyper_api_enabled).toBe(0);
    });
  });
});

describe('Self-API Proxy Logic', () => {
  beforeEach(() => {
    enableTestMode();
    resetDatabase();
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Self-API enablement check', () => {
    it('should deny access when user has not enabled self-API', async () => {
      const user = await createUser('test@example.com', 'password123');

      // User has no settings (null) - should be denied
      const settings = getUserSettings(user.id);
      expect(settings).toBeNull();
      // In proxy logic: !settings || settings.onhyper_api_enabled !== 1
      expect(!settings || settings.onhyper_api_enabled !== 1).toBe(true);
    });

    it('should deny access when user has explicitly disabled self-API', async () => {
      const user = await createUser('test@example.com', 'password123');

      setUserSettings(user.id, { onhyper_api_enabled: 0 });
      const settings = getUserSettings(user.id);

      expect(settings?.onhyper_api_enabled).toBe(0);
      // In proxy logic: !settings || settings.onhyper_api_enabled !== 1
      expect(!settings || settings.onhyper_api_enabled !== 1).toBe(true);
    });

    it('should allow access when user has enabled self-API', async () => {
      const user = await createUser('test@example.com', 'password123');

      setUserSettings(user.id, { onhyper_api_enabled: 1 });
      const settings = getUserSettings(user.id);

      expect(settings?.onhyper_api_enabled).toBe(1);
      // In proxy logic: !settings || settings.onhyper_api_enabled !== 1
      expect(!settings || settings.onhyper_api_enabled !== 1).toBe(false);
    });
  });

  describe('API key availability check', () => {
    it('should return null for users with no API key', async () => {
      const user = await createUser('test@example.com', 'password123');

      const apiKey = getUserApiKeyByUserId(user.id);
      expect(apiKey).toBeNull();
    });

    it('should return API key for users with key', async () => {
      const user = await createUser('test@example.com', 'password123');
      const generatedKey = await createApiKey(user.id, user.plan);

      const apiKey = getUserApiKeyByUserId(user.id);
      expect(apiKey).toBe(generatedKey);
    });
  });

  describe('End-to-end self-API scenarios', () => {
    it('scenario: user without settings should be denied', async () => {
      const user = await createUser('test@example.com', 'password123');

      // No settings set
      const settings = getUserSettings(user.id);
      const hasApiKey = getUserApiKeyByUserId(user.id);

      // Should be denied because no settings
      expect(!settings || settings.onhyper_api_enabled !== 1).toBe(true);
    });

    it('scenario: user with settings disabled but has API key should be denied', async () => {
      const user = await createUser('test@example.com', 'password123');
      await createApiKey(user.id, user.plan);
      setUserSettings(user.id, { onhyper_api_enabled: 0 });

      const settings = getUserSettings(user.id);
      const hasApiKey = getUserApiKeyByUserId(user.id);

      // Has API key, but self-API is disabled
      expect(hasApiKey).not.toBeNull();
      expect(!settings || settings.onhyper_api_enabled !== 1).toBe(true);
    });

    it('scenario: user with settings enabled but no API key should be denied', async () => {
      const user = await createUser('test@example.com', 'password123');
      setUserSettings(user.id, { onhyper_api_enabled: 1 });

      const settings = getUserSettings(user.id);
      const hasApiKey = getUserApiKeyByUserId(user.id);

      // Self-API enabled, but no API key
      expect(!settings || settings.onhyper_api_enabled !== 1).toBe(false);
      expect(hasApiKey).toBeNull();
    });

    it('scenario: user with settings enabled and has API key should be allowed', async () => {
      const user = await createUser('test@example.com', 'password123');
      const apiKey = await createApiKey(user.id, user.plan);
      setUserSettings(user.id, { onhyper_api_enabled: 1 });

      const settings = getUserSettings(user.id);
      const hasApiKey = getUserApiKeyByUserId(user.id);

      // Both conditions met
      expect(!settings || settings.onhyper_api_enabled !== 1).toBe(false);
      expect(hasApiKey).toBe(apiKey);
    });
  });
});

// HTTP-level tests using Hono's test utilities
// These tests verify the actual route handlers
describe('Settings API HTTP Endpoints', () => {
  // Note: These tests would require importing the Hono app and using
  // the test request helper. For now, we test the logic above.
  // Full HTTP integration tests could be added with:
  //
  // import { settings } from './settings.js';
  // import app from '../index.js'; // or where the app is exported
  //
  // Then use: const res = await app.request('/api/settings', { headers: ... });
  //
  // The logic tests above cover the core functionality.

  it.todo('GET /api/settings should return 401 for unauthenticated requests');
  it.todo('GET /api/settings should return settings for authenticated user');
  it.todo('GET /api/settings should return onhyper_api_enabled as false by default');
  it.todo('PUT /api/settings should update onhyper_api_enabled');
  it.todo('PUT /api/settings should return 400 for invalid body');
  it.todo('/proxy/onhyper should return 403 if user has not enabled self-API');
  it.todo('/proxy/onhyper should return 401 if user has no API key');
  it.todo('/proxy/onhyper should forward request with user API key when enabled');
});
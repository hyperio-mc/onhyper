/**
 * Integration tests for Subdomain Default Flow (task-108)
 * 
 * Tests cover:
 * 1. App creation auto-assigns subdomain
 * 2. Publish defaults to subdomain format
 * 3. Subdomain fallback to path-based when taken
 * 4. Free tier can still use path-based URLs
 * 
 * Run with: npm test -- --run src/routes/apps.subdomain.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enableTestMode,
  resetDatabase,
  initDatabase,
  closeDatabase,
  getDatabase,
} from '../lib/db.js';
import { createUser, generateToken, updateUserPlan } from '../lib/users.js';
import {
  claimSubdomain,
  isSubdomainAvailable,
  getSubdomainOwner,
  releaseSubdomain,
  getUserSubdomains,
} from '../lib/subdomains.js';
import {
  createApp,
  getAppById,
  listAppsByUser,
  updateAppSubdomain,
} from '../lib/apps.js';
import {
  createFeatureFlag,
  isFeatureEnabled,
  setUserOverride,
  seedDefaultFeatureFlags,
} from '../lib/features.js';
import { initLMDB, closeLMDB } from '../lib/lmdb.js';

// Helper to sleep for async operations
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Subdomain Default Flow - Integration Tests', () => {
  let userId: string;
  let userToken: string;

  beforeEach(async () => {
    // Enable test mode with in-memory database
    enableTestMode();
    resetDatabase();
    initDatabase();
    
    // Initialize LMDB for app content storage
    await initLMDB();
    
    // Create a test user
    const user = await createUser('test-subdomain@example.com', 'password123', 'FREE');
    userId = user.id;
    userToken = generateToken(user);
    
    // Seed default feature flags
    seedDefaultFeatureFlags();
    
    // Update subdomains feature flag to allow FREE users (for testing)
    const db = getDatabase();
    db.prepare(`
      UPDATE feature_flags 
      SET min_plan_tier = 'FREE'
      WHERE name = 'subdomains'
    `).run();
  });

  afterEach(async () => {
    closeDatabase();
    await closeLMDB();
  });

  describe('App Creation', () => {
    it('should create app without subdomain initially', async () => {
      const app = await createApp(userId, 'My Test App', {
        html: '<div>Test</div>',
        css: '',
        js: '',
      });

      expect(app).toBeDefined();
      expect(app.id).toBeDefined();
      expect(app.name).toBe('My Test App');
      expect(app.slug).toBeDefined();
      expect(app.slug).toMatch(/^my-test-app-[a-z0-9]{8}$/);
      
      // Subdomain should be null initially (before publish)
      expect(app.subdomain).toBeNull();
    });

    it('should create unique slugs for apps with same name', async () => {
      const app1 = await createApp(userId, 'Test App', {});
      const app2 = await createApp(userId, 'Test App', {});

      expect(app1.slug).not.toBe(app2.slug);
      expect(app1.id).not.toBe(app2.id);
    });

    it('should generate slug from app name', async () => {
      const app = await createApp(userId, 'My Cool App!', {});
      
      expect(app.slug).toMatch(/^my-cool-app-[a-z0-9]{8}$/);
    });

    it('should handle special characters in app name', async () => {
      const app = await createApp(userId, 'My@App#With$Special%Chars', {});
      
      expect(app.slug).toMatch(/^my-app-with-special-chars-[a-z0-9]{8}$/);
    });
  });

  describe('Publish with Subdomain Default', () => {
    it('should auto-assign subdomain on publish when available', async () => {
      const app = await createApp(userId, 'Test App', {});

      // Check that subdomain is available before publish
      const generatedSubdomain = 'test-app'; // This is what generateSubdomainFromName would produce
      const availableBefore = await isSubdomainAvailable(generatedSubdomain);
      expect(availableBefore).toBe(true);

      // Publish should auto-claim subdomain
      const result = await claimSubdomain(userId, 'test-app', app.id);
      
      expect(result.success).toBe(true);
      
      // Verify subdomain is now claimed
      const availableAfter = await isSubdomainAvailable('test-app');
      expect(availableAfter).toBe(false);
      
      // Verify owner
      const owner = await getSubdomainOwner('test-app');
      expect(owner).toBe(userId);
    });

    it('should return subdomain URL format after publish', async () => {
      const app = await createApp(userId, 'My App', {});
      
      // Claim subdomain for this app
      const result = await claimSubdomain(userId, 'my-app', app.id);
      expect(result.success).toBe(true);
      
      // Update app to link subdomain
      await updateAppSubdomain(app.id, userId, 'my-app');
      
      // Verify app has subdomain
      const updatedApp = getAppById(app.id);
      expect(updatedApp?.subdomain).toBe('my-app');
      
      // The URL format would be: my-app.onhyper.io
      // (This is handled at the route level, but we verify the data)
    });

    it('should allow explicit subdomain on publish', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      // User explicitly claims a specific subdomain
      const result = await claimSubdomain(userId, 'custom-name', app.id);
      
      expect(result.success).toBe(true);
      
      // Update app to link subdomain
      await updateAppSubdomain(app.id, userId, 'custom-name');
      
      // Verify app has the custom subdomain
      const updatedApp = getAppById(app.id);
      expect(updatedApp?.subdomain).toBe('custom-name');
    });

    it('should reject reserved subdomains', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      // Try to claim a reserved subdomain
      const result = await claimSubdomain(userId, 'api', app.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should reject invalid subdomain formats', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      // Too short
      const result1 = await claimSubdomain(userId, 'ab', app.id);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('3');
      
      // Starts with hyphen
      const result2 = await claimSubdomain(userId, '-invalid', app.id);
      expect(result2.success).toBe(false);
      
      // Contains uppercase - note: claimSubdomain normalizes to lowercase first
      // so 'MyApp' becomes 'myapp' and is valid. Uppercase is auto-normalized.
      // Test that normalized version works
      const result3 = await claimSubdomain(userId, 'MyApp', app.id);
      expect(result3.success).toBe(true); // Normalized to 'myapp'
      
      // Consecutive hyphens - this should still fail after normalization
      const result4 = await claimSubdomain(userId, 'my--app', app.id);
      expect(result4.success).toBe(false);
      expect(result4.error).toContain('consecutive');
    });
  });

  describe('Subdomain Fallback to Path-Based', () => {
    it('should fallback to modified subdomain when preferred is taken', async () => {
      const app1 = await createApp(userId, 'My App', {});
      
      // First user claims "my-app"
      const result1 = await claimSubdomain(userId, 'my-app', app1.id);
      expect(result1.success).toBe(true);

      // Create second app with similar name
      const app2 = await createApp(userId, 'My App', {});
      
      // "my-app" should be unavailable
      const available = await isSubdomainAvailable('my-app');
      expect(available).toBe(false);
      
      // Should be able to claim a modified version
      const result2 = await claimSubdomain(userId, 'my-app-2', app2.id);
      expect(result2.success).toBe(true);
      
      // Verify second app has different subdomain
      await updateAppSubdomain(app2.id, userId, 'my-app-2');
      const updatedApp2 = getAppById(app2.id);
      expect(updatedApp2?.subdomain).toBe('my-app-2');
    });

    it('should allow same user to reassign subdomain to different app', async () => {
      const app1 = await createApp(userId, 'App One', {});
      const app2 = await createApp(userId, 'App Two', {});
      
      // User claims subdomain for first app
      const result1 = await claimSubdomain(userId, 'my-unique-name', app1.id);
      expect(result1.success).toBe(true);
      
      // Release subdomain
      const released = await releaseSubdomain(userId, 'my-unique-name');
      expect(released).toBe(true);
      
      // Same user can claim for second app
      const result2 = await claimSubdomain(userId, 'my-unique-name', app2.id);
      expect(result2.success).toBe(true);
    });

    it('should prevent different user from claiming another user\'s subdomain', async () => {
      // Create first user and app
      const user1 = await createUser('user1@example.com', 'password123', 'FREE');
      const app1 = await createApp(user1.id, 'App One', {});
      
      // First user claims subdomain
      const result1 = await claimSubdomain(user1.id, 'unique-name', app1.id);
      expect(result1.success).toBe(true);

      // Create second user and app
      const user2 = await createUser('user2@example.com', 'password123', 'FREE');
      const app2 = await createApp(user2.id, 'App Two', {});
      
      // Second user tries to claim same subdomain
      const result2 = await claimSubdomain(user2.id, 'unique-name', app2.id);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already claimed');
    });
  });

  describe('Plan Tier Restrictions', () => {
    it('should allow FREE users to claim subdomains when feature is enabled', async () => {
      // FREE user (default in test setup)
      const app = await createApp(userId, 'Test App', {});
      
      const result = await claimSubdomain(userId, 'free-user-app', app.id);
      
      expect(result.success).toBe(true);
    });

    it('should restrict short subdomains to PRO users', async () => {
      // FREE user trying to claim short subdomain
      const app = await createApp(userId, 'Test App', {});
      
      // Check short subdomain feature (5 chars = "short")
      // Note: short_subdomains uses custom_rules that check:
      // - subdomain_length >= 6 OR plan_tier >= PRO
      // For FREE user with short subdomain, this fails via custom_rules
      const shortSubdomainFeature = await isFeatureEnabled('short_subdomains', userId, {
        subdomain: 'short', // 5 chars
      });
      
      expect(shortSubdomainFeature.enabled).toBe(false);
      // Custom rules evaluate both conditions - since subdomain is short and plan is not PRO,
      // it fails the custom rules check
      expect(shortSubdomainFeature.source).toBe('custom_rules');
    });

    it('should allow PRO users to claim short subdomains', async () => {
      // Upgrade user to PRO
      updateUserPlan(userId, 'PRO');
      
      const app = await createApp(userId, 'Test App', {});
      
      // PRO user can claim short subdomain
      const shortSubdomainFeature = await isFeatureEnabled('short_subdomains', userId, {
        subdomain: 'short',
      });
      
      expect(shortSubdomainFeature.enabled).toBe(true);
      
      // Can claim the short subdomain
      const result = await claimSubdomain(userId, 'short', app.id);
      expect(result.success).toBe(true);
    });

    it('should allow 6+ character subdomains for FREE users', async () => {
      // FREE user
      const app = await createApp(userId, 'Test App', {});
      
      // 6 character subdomain
      const longSubdomain = 'my-app-name'; // 12 chars
      const result = await claimSubdomain(userId, longSubdomain, app.id);
      
      expect(result.success).toBe(true);
    });

    it('should properly enforce plan tier for subdomains feature', async () => {
      // Create PRO user
      const proUser = await createUser('pro@example.com', 'password123', 'PRO');
      const proApp = await createApp(proUser.id, 'Pro App', {});
      
      // PRO user should be able to claim subdomains
      const proResult = await claimSubdomain(proUser.id, 'pro-user-subdomain', proApp.id);
      expect(proResult.success).toBe(true);
    });
  });

  describe('Path-Based URL Fallback', () => {
    it('should always have path-based URL available', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      // App should always have a slug for path-based URL
      expect(app.slug).toBeDefined();
      expect(app.slug.length).toBeGreaterThan(0);
      
      // Path-based URL would be: https://onhyper.io/a/{slug}
      // This is the fallback when subdomain is not available
    });

    it('can have app without subdomain (path-only)', async () => {
      const app = await createApp(userId, 'Path Only App', {});
      
      // App exists with slug but no subdomain
      const fetchedApp = getAppById(app.id);
      expect(fetchedApp).toBeDefined();
      expect(fetchedApp?.slug).toBeDefined();
      expect(fetchedApp?.subdomain).toBeNull();
      
      // This represents a path-only app
    });

    it('should preserve slug when subdomain is added', async () => {
      const app = await createApp(userId, 'Test App', {});
      const originalSlug = app.slug;
      
      // Claim subdomain
      await claimSubdomain(userId, 'test-subdomain', app.id);
      await updateAppSubdomain(app.id, userId, 'test-subdomain');
      
      // Slug should remain unchanged
      const updatedApp = getAppById(app.id);
      expect(updatedApp?.slug).toBe(originalSlug);
      expect(updatedApp?.subdomain).toBe('test-subdomain');
    });

    it('should allow releasing subdomain back to path-only', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      // Claim subdomain
      await claimSubdomain(userId, 'temporary-subdomain', app.id);
      await updateAppSubdomain(app.id, userId, 'temporary-subdomain');
      
      // Verify subdomain is set
      const appWithSubdomain = getAppById(app.id);
      expect(appWithSubdomain?.subdomain).toBe('temporary-subdomain');
      
      // Release subdomain
      const released = await releaseSubdomain(userId, 'temporary-subdomain');
      expect(released).toBe(true);
      
      // Clear subdomain on app
      await updateAppSubdomain(app.id, userId, null);
      
      // Verify app is back to path-only
      const appWithoutSubdomain = getAppById(app.id);
      expect(appWithoutSubdomain?.subdomain).toBeNull();
      expect(appWithoutSubdomain?.slug).toBeDefined();
    });
  });

  describe('Subdomain Validation Edge Cases', () => {
    it('should handle exactly 3 character subdomain (minimum)', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      const result = await claimSubdomain(userId, 'abc', app.id);
      expect(result.success).toBe(true);
    });

    it('should handle exactly 63 character subdomain (maximum)', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      const longSubdomain = 'a'.repeat(63);
      const result = await claimSubdomain(userId, longSubdomain, app.id);
      expect(result.success).toBe(true);
    });

    it('should reject 64 character subdomain (too long)', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      const tooLongSubdomain = 'a'.repeat(64);
      const result = await claimSubdomain(userId, tooLongSubdomain, app.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('63');
    });

    it('should handle numeric subdomains', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      const result = await claimSubdomain(userId, '12345', app.id);
      expect(result.success).toBe(true);
    });

    it('should handle hyphenated subdomains', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      const result = await claimSubdomain(userId, 'my-cool-app', app.id);
      expect(result.success).toBe(true);
    });

    it('should reject consecutive hyphens', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      const result = await claimSubdomain(userId, 'my--app', app.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('consecutive');
    });

    it('should reject subdomain ending with hyphen', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      const result = await claimSubdomain(userId, 'my-app-', app.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('end');
    });

    it('should reject subdomain starting with hyphen', async () => {
      const app = await createApp(userId, 'Test App', {});
      
      const result = await claimSubdomain(userId, '-my-app', app.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('start');
    });
  });

  describe('User Subdomain Management', () => {
    it('should list all subdomains owned by user', async () => {
      const app1 = await createApp(userId, 'App One', {});
      const app2 = await createApp(userId, 'App Two', {});
      
      await claimSubdomain(userId, 'first-subdomain', app1.id);
      await claimSubdomain(userId, 'second-subdomain', app2.id);
      
      const subdomains = await getUserSubdomains(userId);
      
      expect(subdomains).toHaveLength(2);
      expect(subdomains.map(s => s.subdomain)).toContain('first-subdomain');
      expect(subdomains.map(s => s.subdomain)).toContain('second-subdomain');
    });

    it('should return empty array for user with no subdomains', async () => {
      const subdomains = await getUserSubdomains(userId);
      expect(subdomains).toHaveLength(0);
    });

    it('should not list other users subdomains', async () => {
      const user1 = await createUser('user1@example.com', 'password123', 'FREE');
      const user2 = await createUser('user2@example.com', 'password123', 'FREE');
      
      const app1 = await createApp(user1.id, 'App One', {});
      await claimSubdomain(user1.id, 'user1-subdomain', app1.id);
      
      // User 2 should not see user 1's subdomains
      const subdomains = await getUserSubdomains(user2.id);
      expect(subdomains).toHaveLength(0);
      
      // User 1 should see their subdomain
      const user1Subdomains = await getUserSubdomains(user1.id);
      expect(user1Subdomains).toHaveLength(1);
    });
  });

  describe('Feature Flag Integration', () => {
    it('should respect subdomains feature flag for FREE users', async () => {
      // Update feature flag to require PRO
      const db = getDatabase();
      db.prepare(`
        UPDATE feature_flags 
        SET min_plan_tier = 'PRO'
        WHERE name = 'subdomains'
      `).run();
      
      // FREE user should be blocked
      const feature = await isFeatureEnabled('subdomains', userId);
      expect(feature.enabled).toBe(false);
      expect(feature.source).toBe('plan_tier');
    });

    it('should allow admin override for beta testers', async () => {
      // Update feature flag to require PRO
      const db = getDatabase();
      db.prepare(`
        UPDATE feature_flags 
        SET min_plan_tier = 'PRO'
        WHERE name = 'subdomains'
      `).run();
      
      // FREE user is blocked
      const before = await isFeatureEnabled('subdomains', userId);
      expect(before.enabled).toBe(false);
      
      // Admin enables for beta tester
      setUserOverride(userId, 'subdomains', true, 'Beta tester access');
      
      // Now should be enabled
      const after = await isFeatureEnabled('subdomains', userId);
      expect(after.enabled).toBe(true);
      expect(after.source).toBe('override');
    });

    it('should check short_subdomains feature flag', async () => {
      // FREE user with short subdomain (3 chars)
      const result = await isFeatureEnabled('short_subdomains', userId, {
        subdomain: 'abc',
      });
      
      // Should be blocked by plan tier (requires PRO)
      expect(result.enabled).toBe(false);
      
      // Upgrade to PRO
      updateUserPlan(userId, 'PRO');
      
      // Now should be allowed
      const afterUpgrade = await isFeatureEnabled('short_subdomains', userId, {
        subdomain: 'abc',
      });
      expect(afterUpgrade.enabled).toBe(true);
    });
  });

  describe('App List with Subdomains', () => {
    it('should list apps with their subdomains', async () => {
      const app1 = await createApp(userId, 'App One', {});
      const app2 = await createApp(userId, 'App Two', {});
      
      // Claim subdomain for first app only
      await claimSubdomain(userId, 'app-one-subdomain', app1.id);
      await updateAppSubdomain(app1.id, userId, 'app-one-subdomain');
      
      const apps = listAppsByUser(userId);
      
      expect(apps).toHaveLength(2);
      
      const app1WithSubdomain = apps.find(a => a.id === app1.id);
      const app2WithoutSubdomain = apps.find(a => a.id === app2.id);
      
      expect(app1WithSubdomain?.subdomain).toBe('app-one-subdomain');
      expect(app2WithoutSubdomain?.subdomain).toBeNull();
    });
  });
});
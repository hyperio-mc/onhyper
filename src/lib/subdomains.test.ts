/**
 * Tests for Subdomain Management Library
 * Run with: npm test -- --run src/lib/subdomains.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  RESERVED_SUBDOMAINS,
  isReserved,
  validateSubdomain,
  claimSubdomain,
  isSubdomainAvailable,
  getSubdomainOwner,
  releaseSubdomain,
  getUserSubdomains,
  canClaimSubdomain,
} from './subdomains.js';
import { initDatabase, closeDatabase, enableTestMode, resetDatabase } from './db.js';
import { createUser } from './users.js';

describe('subdomains', () => {
  // Initialize database once for all tests
  beforeAll(() => {
    enableTestMode();
    initDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('RESERVED_SUBDOMAINS', () => {
    it('should contain www', () => {
      expect(RESERVED_SUBDOMAINS).toContain('www');
    });

    it('should contain api', () => {
      expect(RESERVED_SUBDOMAINS).toContain('api');
    });

    it('should contain admin', () => {
      expect(RESERVED_SUBDOMAINS).toContain('admin');
    });

    it('should contain blog', () => {
      expect(RESERVED_SUBDOMAINS).toContain('blog');
    });

    it('should contain staging', () => {
      expect(RESERVED_SUBDOMAINS).toContain('staging');
    });

    it('should contain auth', () => {
      expect(RESERVED_SUBDOMAINS).toContain('auth');
    });

    it('should contain db', () => {
      expect(RESERVED_SUBDOMAINS).toContain('db');
    });

    it('should contain ns', () => {
      expect(RESERVED_SUBDOMAINS).toContain('ns');
    });

    it('should have about 50 reserved subdomains', () => {
      expect(RESERVED_SUBDOMAINS.length).toBeGreaterThan(40);
      expect(RESERVED_SUBDOMAINS.length).toBeLessThan(60);
    });
  });

  describe('isReserved', () => {
    describe('reserved subdomains', () => {
      it('should identify "www" as reserved', () => {
        expect(isReserved('www')).toBe(true);
      });

      it('should identify "api" as reserved', () => {
        expect(isReserved('api')).toBe(true);
      });

      it('should identify "admin" as reserved', () => {
        expect(isReserved('admin')).toBe(true);
      });

      it('should identify "docs" as reserved', () => {
        expect(isReserved('docs')).toBe(true);
      });

      it('should identify "blog" as reserved', () => {
        expect(isReserved('blog')).toBe(true);
      });

      it('should identify "staging" as reserved', () => {
        expect(isReserved('staging')).toBe(true);
      });

      it('should identify "auth" as reserved', () => {
        expect(isReserved('auth')).toBe(true);
      });

      it('should identify "mail" as reserved', () => {
        expect(isReserved('mail')).toBe(true);
      });

      it('should identify "db" as reserved', () => {
        expect(isReserved('db')).toBe(true);
      });
    });

    describe('non-reserved subdomains', () => {
      it('should not identify "my-app" as reserved', () => {
        expect(isReserved('my-app')).toBe(false);
      });

      it('should not identify "myapp" as reserved', () => {
        expect(isReserved('myapp')).toBe(false);
      });

      it('should not identify "app123" as reserved', () => {
        expect(isReserved('app123')).toBe(false);
      });

      it('should not identify "my-cool-project" as reserved', () => {
        expect(isReserved('my-cool-project')).toBe(false);
      });
    });

    describe('case insensitivity', () => {
      it('should identify "WWW" as reserved (uppercase)', () => {
        expect(isReserved('WWW')).toBe(true);
      });

      it('should identify "Api" as reserved (mixed case)', () => {
        expect(isReserved('Api')).toBe(true);
      });

      it('should identify "ADMIN" as reserved (all caps)', () => {
        expect(isReserved('ADMIN')).toBe(true);
      });

      it('should identify "Docs" as reserved (title case)', () => {
        expect(isReserved('Docs')).toBe(true);
      });

      it('should identify "BLOG" as reserved (all caps)', () => {
        expect(isReserved('BLOG')).toBe(true);
      });

      it('should not identify "MY-APP" as reserved (uppercase non-reserved)', () => {
        expect(isReserved('MY-APP')).toBe(false);
      });
    });
  });

  describe('validateSubdomain', () => {
    describe('valid subdomains', () => {
      it('should accept "myapp"', () => {
        const result = validateSubdomain('myapp');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept "my-app" (with hyphen)', () => {
        const result = validateSubdomain('my-app');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept "app123" (alphanumeric)', () => {
        const result = validateSubdomain('app123');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept "a-b-c" (multiple hyphens)', () => {
        const result = validateSubdomain('a-b-c');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept "my-cool-app"', () => {
        const result = validateSubdomain('my-cool-app');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept minimum length subdomain (3 chars)', () => {
        const result = validateSubdomain('abc');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept maximum length subdomain (63 chars)', () => {
        const longSubdomain = 'a'.repeat(63);
        const result = validateSubdomain(longSubdomain);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept numeric subdomain with letters', () => {
        const result = validateSubdomain('v2-api');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept "a1b" (mixed short)', () => {
        const result = validateSubdomain('a1b');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept "123" (numbers only)', () => {
        const result = validateSubdomain('123');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept "12345" (numbers only, longer)', () => {
        const result = validateSubdomain('12345');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('too short', () => {
      it('should reject "ab" (2 characters)', () => {
        const result = validateSubdomain('ab');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('3');
      });

      it('should reject single character "a"', () => {
        const result = validateSubdomain('a');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('3');
      });

      it('should reject empty string', () => {
        const result = validateSubdomain('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('3');
      });
    });

    describe('too long', () => {
      it('should reject 64 characters (just over limit)', () => {
        const longSubdomain = 'a'.repeat(64);
        const result = validateSubdomain(longSubdomain);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('63');
      });

      it('should reject 100 characters', () => {
        const longSubdomain = 'a'.repeat(100);
        const result = validateSubdomain(longSubdomain);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('63');
      });
    });

    describe('starts with hyphen', () => {
      it('should reject "-myapp"', () => {
        const result = validateSubdomain('-myapp');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('start');
        expect(result.error).toContain('hyphen');
      });

      it('should reject "-abc"', () => {
        const result = validateSubdomain('-abc');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('hyphen');
      });
    });

    describe('ends with hyphen', () => {
      it('should reject "myapp-"', () => {
        const result = validateSubdomain('myapp-');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('end');
        expect(result.error).toContain('hyphen');
      });

      it('should reject "abc-"', () => {
        const result = validateSubdomain('abc-');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('hyphen');
      });
    });

    describe('consecutive hyphens', () => {
      it('should reject "my--app"', () => {
        const result = validateSubdomain('my--app');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('consecutive');
      });

      it('should reject "a---b"', () => {
        const result = validateSubdomain('a---b');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('consecutive');
      });

      it('should reject "my---cool---app"', () => {
        const result = validateSubdomain('my---cool---app');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('consecutive');
      });
    });

    describe('uppercase letters', () => {
      it('should reject "MyApp"', () => {
        const result = validateSubdomain('MyApp');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lowercase');
      });

      it('should reject "MY-APP"', () => {
        const result = validateSubdomain('MY-APP');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lowercase');
      });

      it('should reject "MyCoolApp"', () => {
        const result = validateSubdomain('MyCoolApp');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lowercase');
      });
    });

    describe('special characters', () => {
      it('should reject "my_app" (underscore)', () => {
        const result = validateSubdomain('my_app');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "my.app" (period)', () => {
        const result = validateSubdomain('my.app');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "my app" (space)', () => {
        const result = validateSubdomain('my app');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "my@app" (@ symbol)', () => {
        const result = validateSubdomain('my@app');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "my#app" (hash)', () => {
        const result = validateSubdomain('my#app');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "my!app" (exclamation)', () => {
        const result = validateSubdomain('my!app');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('note: format validation only', () => {
      it('should accept "www" as a valid format (but it is reserved)', () => {
        // validateSubdomain only checks format, not reserved status
        const result = validateSubdomain('www');
        expect(result.valid).toBe(true);
        // Use isReserved() to check if reserved
        expect(isReserved('www')).toBe(true);
      });

      it('should accept "api" as a valid format (but it is reserved)', () => {
        const result = validateSubdomain('api');
        expect(result.valid).toBe(true);
        expect(isReserved('api')).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    describe('just hyphens', () => {
      it('should reject "---"', () => {
        const result = validateSubdomain('---');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "----"', () => {
        const result = validateSubdomain('----');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "-"', () => {
        const result = validateSubdomain('-');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "--"', () => {
        const result = validateSubdomain('--');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('unicode characters', () => {
      it('should reject "myapp🔥" (emoji)', () => {
        const result = validateSubdomain('myapp🔥');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "café" (accented character)', () => {
        const result = validateSubdomain('café');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "my-app-日本語" (Japanese)', () => {
        const result = validateSubdomain('my-app-日本語');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "приложение" (Russian)', () => {
        const result = validateSubdomain('приложение');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject "应用" (Chinese)', () => {
        const result = validateSubdomain('应用');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Database operations', () => {
    let userId: string;
    const subdomain = 'test-app-unique-1';

    beforeEach(async () => {
      // Reset database for clean state
      resetDatabase();
      initDatabase();
      
      // Create a real user for foreign key constraint
      const user = await createUser('test-subdomain@example.com', 'password123');
      userId = user.id;
    });

    afterEach(() => {
      // Database will be reset in beforeEach, no need to close here
    });

    it('should report subdomain as available initially', async () => {
      const available = await isSubdomainAvailable(subdomain);
      expect(available).toBe(true);
    });

    it('should claim an available subdomain', async () => {
      const result = await claimSubdomain(userId, subdomain);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should report subdomain as unavailable after claim', async () => {
      await claimSubdomain(userId, subdomain);
      const available = await isSubdomainAvailable(subdomain);
      expect(available).toBe(false);
    });

    it('should return the owner of claimed subdomain', async () => {
      await claimSubdomain(userId, subdomain);
      const owner = await getSubdomainOwner(subdomain);
      expect(owner).toBe(userId);
    });

    it('should reject claim for already claimed subdomain', async () => {
      await claimSubdomain(userId, subdomain);
      
      // Create another user to try claiming
      const otherUser = await createUser('other@example.com', 'password123');
      const result = await claimSubdomain(otherUser.id, subdomain);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already claimed');
    });

    it('should get user subdomains', async () => {
      await claimSubdomain(userId, subdomain);
      const subdomains = await getUserSubdomains(userId);
      expect(subdomains).toHaveLength(1);
      expect(subdomains[0].subdomain).toBe(subdomain);
      expect(subdomains[0].app_id).toBeNull();
      expect(subdomains[0].app_name).toBeNull();
      expect(subdomains[0].claimed_at).toBeDefined();
    });

    it('should not allow non-owner to release', async () => {
      await claimSubdomain(userId, subdomain);
      
      const otherUser = await createUser('other2@example.com', 'password123');
      const released = await releaseSubdomain(otherUser.id, subdomain);
      expect(released).toBe(false);
    });

    it('should allow owner to release', async () => {
      await claimSubdomain(userId, subdomain);
      const released = await releaseSubdomain(userId, subdomain);
      expect(released).toBe(true);
    });

    it('should report subdomain as available after release', async () => {
      await claimSubdomain(userId, subdomain);
      await releaseSubdomain(userId, subdomain);
      const available = await isSubdomainAvailable(subdomain);
      expect(available).toBe(true);
    });

    it('should reject claim for reserved subdomain', async () => {
      const result = await claimSubdomain(userId, 'api');
      expect(result.success).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should reject claim for invalid format', async () => {
      const result = await claimSubdomain(userId, 'ab');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('canClaimSubdomain', () => {
    let userId: string;

    beforeEach(async () => {
      // Reset database for clean state
      resetDatabase();
      initDatabase();
      
      // Create a real user
      const user = await createUser('canclaim@example.com', 'password123');
      userId = user.id;
    });

    afterEach(() => {
      // Database will be reset in beforeEach
    });

    it('should return valid for claimable subdomain', async () => {
      const result = await canClaimSubdomain('available-subdomain-test');
      expect(result.valid).toBe(true);
    });

    it('should return error for reserved subdomain', async () => {
      const result = await canClaimSubdomain('www');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should return error for invalid format', async () => {
      const result = await canClaimSubdomain('--invalid');
      expect(result.valid).toBe(false);
    });

    it('should return error for too short subdomain', async () => {
      const result = await canClaimSubdomain('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('3');
    });

    it('should return error for already claimed subdomain', async () => {
      await claimSubdomain(userId, 'claimed-subdomain');
      const result = await canClaimSubdomain('claimed-subdomain');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already claimed');
    });
  });
});
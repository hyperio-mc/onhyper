/**
 * LMDB Database Setup for OnHyper.io
 * 
 * High-performance key-value storage for frequently accessed content.
 * Complements SQLite for data that needs fast reads without complex queries.
 * 
 * ## Why LMDB?
 * 
 * | Feature | SQLite | LMDB |
 * |---------|--------|------|
 * | Complex queries | ✓ | ✗ |
 * | ACID transactions | ✓ | ✓ |
 * | Read performance | Good | Excellent |
 * | Write performance | Good | Excellent |
 * | Use case | Auth, apps, usage | Content cache |
 * 
 * ## Data Stored in LMDB
 * 
 * - **App Content**: HTML, CSS, JS for fast rendering
 * - **App Metadata**: Quick lookup by ID without joins
 * - **User App Lists**: Pre-computed app IDs per user
 * 
 * ## Key Patterns
 * 
 * ```typescript
 * // App content (rendered pages)
 * app:{appId}:content → { appId, html, css, js, updatedAt }
 * 
 * // App metadata cache
 * app:{appId}:meta → { appId, userId, name, slug }
 * 
 * // User's app list (for dashboard)
 * user:{userId}:apps → [appId1, appId2, ...]
 * ```
 * 
 * ## Usage
 * 
 * ```typescript
 * import { 
 *   initLMDB, 
 *   AppContentStore, 
 *   AppMetaStore,
 *   UserAppsStore 
 * } from './lib/lmdb.js';
 * 
 * // Initialize at startup
 * initLMDB();
 * 
 * // Store app content
 * await AppContentStore.save(appId, { 
 *   appId, 
 *   html: '<div>...</div>', 
 *   css: '...', 
 *   js: '...',
 *   updatedAt: new Date().toISOString()
 * });
 * 
 * // Retrieve content (fast!)
 * const content = AppContentStore.get(appId);
 * 
 * // Get user's apps
 * const appIds = UserAppsStore.list(userId);
 * ```
 * 
 * ## Persistence
 * 
 * LMDB data is persisted to disk at the path specified by `config.lmdbPath`:
 * - Development: `./data/onhyper.lmdb/`
 * - Production: `$DATA_DIR/onhyper.lmdb/` or `$RAILWAY_VOLUME_MOUNT_PATH/onhyper.lmdb/`
 * 
 * ## Fallback Strategy
 * 
 * If LMDB read fails, fall back to SQLite:
 * ```typescript
 * const content = AppContentStore.get(appId);
 * if (!content) {
 *   // Fallback to SQLite
 *   const app = getAppById(appId);
 *   return { html: app.html, css: app.css, js: app.js };
 * }
 * ```
 * 
 * @module lib/lmdb
 */

import { open, Database } from 'lmdb';
import { config } from '../config.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

// Value types stored in LMDB
export interface AppContent {
  appId: string;
  html: string;
  css: string;
  js: string;
  updatedAt: string;
}

export interface AppMeta {
  appId: string;
  userId: string;
  name: string;
  slug: string;
}

// LMDB wrapper class for typed operations
let db: Database | null = null;

/**
 * Initialize the LMDB database
 */
export function initLMDB(): Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  const dbPath = config.lmdbPath;
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  db = open({
    path: dbPath,
    compression: true,
  });

  return db;
}

/**
 * Get the LMDB instance
 */
export function getLMDB(): Database {
  if (!db) {
    throw new Error('LMDB not initialized. Call initLMDB() first.');
  }
  return db;
}

/**
 * Close the LMDB connection
 */
export async function closeLMDB(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

// Key patterns for LMDB storage
export const LMDB_KEYS = {
  // App content: app:{appId}:content
  appContent: (appId: string) => `app:${appId}:content`,
  
  // App metadata cache: app:{appId}:meta
  appMeta: (appId: string) => `app:${appId}:meta`,
  
  // User's app list: user:{userId}:apps (JSON array of app IDs)
  userApps: (userId: string) => `user:${userId}:apps`,
  
  // Rate limit counter: ratelimit:{identifier}:{timestamp}
  rateLimit: (identifier: string, timestamp: number) => `ratelimit:${identifier}:${timestamp}`,
} as const;

/**
 * App content operations
 */
export const AppContentStore = {
  async save(appId: string, content: AppContent): Promise<void> {
    const db = getLMDB();
    await db.put(LMDB_KEYS.appContent(appId), content);
  },

  get(appId: string): AppContent | undefined {
    const db = getLMDB();
    return db.get(LMDB_KEYS.appContent(appId));
  },

  async delete(appId: string): Promise<boolean> {
    const db = getLMDB();
    return db.remove(LMDB_KEYS.appContent(appId));
  },
};

/**
 * App metadata operations
 */
export const AppMetaStore = {
  async save(appId: string, meta: AppMeta): Promise<void> {
    const db = getLMDB();
    await db.put(LMDB_KEYS.appMeta(appId), meta);
  },

  get(appId: string): AppMeta | undefined {
    const db = getLMDB();
    return db.get(LMDB_KEYS.appMeta(appId));
  },

  async delete(appId: string): Promise<boolean> {
    const db = getLMDB();
    return db.remove(LMDB_KEYS.appMeta(appId));
  },
};

/**
 * User app list operations
 */
export const UserAppsStore = {
  async add(userId: string, appId: string): Promise<void> {
    const db = getLMDB();
    const key = LMDB_KEYS.userApps(userId);
    const existing: string[] = db.get(key) || [];
    if (!existing.includes(appId)) {
      existing.push(appId);
      await db.put(key, existing);
    }
  },

  list(userId: string): string[] {
    const db = getLMDB();
    return db.get(LMDB_KEYS.userApps(userId)) || [];
  },

  async remove(userId: string, appId: string): Promise<void> {
    const db = getLMDB();
    const key = LMDB_KEYS.userApps(userId);
    const existing: string[] = db.get(key) || [];
    const updated = existing.filter(id => id !== appId);
    if (updated.length > 0) {
      await db.put(key, updated);
    } else {
      await db.remove(key);
    }
  },
};

/**
 * App file storage (for ZIP uploads)
 * Key format: app_files:{appId}:{path}
 */
export const AppFilesStore = {
  async save(appId: string, path: string, content: string): Promise<void> {
    const db = getLMDB();
    const key = `app_files:${appId}:${path}`;
    await db.put(key, content);
    // Add to index
    const indexKey = `app_files_index:${appId}`;
    const files: string[] = db.get(indexKey) || [];
    if (!files.includes(path)) {
      files.push(path);
      await db.put(indexKey, files);
    }
  },

  get(appId: string, path: string): string | undefined {
    const db = getLMDB();
    const key = `app_files:${appId}:${path}`;
    return db.get(key);
  },

  async delete(appId: string, path: string): Promise<void> {
    const db = getLMDB();
    const key = `app_files:${appId}:${path}`;
    await db.remove(key);
  },

  list(appId: string): string[] {
    const db = getLMDB();
    const indexKey = `app_files_index:${appId}`;
    const files: string[] = db.get(indexKey) || [];
    return files;
  },

  async deleteAll(appId: string): Promise<void> {
    const files = this.list(appId);
    const db = getLMDB();
    for (const path of files) {
      const key = `app_files:${appId}:${path}`;
      await db.remove(key);
    }
    // Remove the index
    const indexKey = `app_files_index:${appId}`;
    await db.remove(indexKey);
  },

  async _addToIndex(appId: string, path: string): Promise<void> {
    const db = getLMDB();
    const indexKey = `app_files_index:${appId}`;
    const files: string[] = db.get(indexKey) || [];
    if (!files.includes(path)) {
      files.push(path);
      await db.put(indexKey, files);
    }
  },
};
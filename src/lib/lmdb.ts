/**
 * LMDB Database Setup for OnHyper.io
 * 
 * Fast key-value storage for app content and other non-relational data.
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
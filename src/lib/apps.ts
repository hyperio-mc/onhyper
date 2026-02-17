/**
 * App Management for OnHyper.io
 * 
 * CRUD operations for published web applications.
 * Apps are the core entity - users create HTML/CSS/JS apps that call APIs.
 * 
 * ## Data Storage
 * 
 * Apps are stored in **both** SQLite and LMDB:
 * 
 * - **SQLite**: Persistent storage, relationships, queries
 * - **LMDB**: Fast content retrieval for rendering
 * 
 * This dual-storage approach ensures both durability and performance.
 * 
 * ## Slug Generation
 * 
 * App URLs use slugs derived from the app name:
 * 
 * ```
 * name: "My Cool App!" → slug: "my-cool-app-a1b2c3"
 * ```
 * 
 * - Lowercase alphanumeric + hyphens
 * - Max 64 characters from name
 * - UUID suffix for uniqueness
 * 
 * ## Usage
 * 
 * ```typescript
 * import { createApp, getAppById, getAppBySlug, listAppsByUser, updateApp, deleteApp } from './lib/apps.js';
 * 
 * // Create an app
 * const app = await createApp('user-uuid', 'My App', {
 *   html: '<div id="app"></div>',
 *   css: '#app { color: blue; }',
 *   js: 'console.log("Hello!");'
 * });
 * // → { id, name, slug: 'my-app-abc123', ... }
 * 
 * // Get by ID
 * const app = getAppById('app-uuid');
 * 
 * // Get by slug (for rendering)
 * const app = getAppBySlug('my-app-abc123');
 * 
 * // List user's apps
 * const apps = listAppsByUser('user-uuid');
 * 
 * // Update an app
 * await updateApp('app-uuid', 'user-uuid', { html: '<div>New content</div>' });
 * 
 * // Delete an app
 * await deleteApp('app-uuid', 'user-uuid');
 * 
 * // Check plan limits
 * const count = getAppCount('user-uuid');
 * if (count >= planLimits.maxApps) {
 *   // Deny creation
 * }
 * ```
 * 
 * ## URL Pattern
 * 
 * Published apps are accessible at:
 * ```
 * https://onhyper.io/a/{slug}
 * ```
 * 
 * @module lib/apps
 */

import { randomUUID } from 'crypto';
import { getDatabase, App } from './db.js';
import { AppContentStore, AppMetaStore, UserAppsStore } from './lmdb.js';

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Generate a unique slug
 */
function generateUniqueSlug(name: string): string {
  const baseSlug = generateSlug(name);
  const suffix = randomUUID().slice(0, 8);
  return `${baseSlug}-${suffix}`;
}

/**
 * Create a new app
 */
export async function createApp(
  userId: string,
  name: string,
  data: { html?: string; css?: string; js?: string }
): Promise<App> {
  const db = getDatabase();
  
  // Generate unique slug
  const slug = generateUniqueSlug(name);
  
  // Create app record
  const id = randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO apps (id, user_id, name, slug, html, css, js, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, name, slug, data.html || null, data.css || null, data.js || null, now, now);
  
  // Store content in LMDB for fast access
  await AppContentStore.save(id, {
    appId: id,
    html: data.html || '',
    css: data.css || '',
    js: data.js || '',
    updatedAt: now,
  });
  
  // Store metadata in LMDB
  await AppMetaStore.save(id, {
    appId: id,
    userId,
    name,
    slug,
  });
  
  // Add to user's app list
  await UserAppsStore.add(userId, id);
  
  return getAppById(id)!;
}

/**
 * Get an app by ID
 */
export function getAppById(id: string): App | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM apps WHERE id = ?').get(id) as App | undefined || null;
}

/**
 * Get an app by slug
 */
export function getAppBySlug(slug: string): App | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM apps WHERE slug = ?').get(slug) as App | undefined || null;
}

/**
 * List all apps for a user
 */
export function listAppsByUser(userId: string): App[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM apps WHERE user_id = ? ORDER BY created_at DESC').all(userId) as App[];
}

/**
 * Update an app
 */
export async function updateApp(
  appId: string,
  userId: string,
  data: { name?: string; html?: string; css?: string; js?: string }
): Promise<App | null> {
  const db = getDatabase();
  
  // Verify ownership
  const app = getAppById(appId);
  if (!app || app.user_id !== userId) {
    return null;
  }
  
  const now = new Date().toISOString();
  
  // Build update query
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.html !== undefined) {
    updates.push('html = ?');
    values.push(data.html);
  }
  if (data.css !== undefined) {
    updates.push('css = ?');
    values.push(data.css);
  }
  if (data.js !== undefined) {
    updates.push('js = ?');
    values.push(data.js);
  }
  
  if (updates.length === 0) {
    return app;
  }
  
  updates.push('updated_at = ?');
  values.push(now);
  values.push(appId);
  
  db.prepare(`UPDATE apps SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  // Update LMDB content store
  const content = await AppContentStore.get(appId);
  await AppContentStore.save(appId, {
    appId,
    html: data.html ?? content?.html ?? '',
    css: data.css ?? content?.css ?? '',
    js: data.js ?? content?.js ?? '',
    updatedAt: now,
  });
  
  return getAppById(appId);
}

/**
 * Delete an app
 */
export async function deleteApp(appId: string, userId: string): Promise<boolean> {
  const db = getDatabase();
  
  // Verify ownership
  const app = getAppById(appId);
  if (!app || app.user_id !== userId) {
    return false;
  }
  
  // Delete from SQLite
  const result = db.prepare('DELETE FROM apps WHERE id = ?').run(appId);
  
  // Delete from LMDB
  await AppContentStore.delete(appId);
  await AppMetaStore.delete(appId);
  await UserAppsStore.remove(userId, appId);
  
  return result.changes > 0;
}

/**
 * Get app count for a user
 */
export function getAppCount(userId: string): number {
  const db = getDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM apps WHERE user_id = ?')
    .get(userId) as { count: number };
  return result.count;
}

/**
 * Update an app's subdomain
 * Sets the subdomain field and tracking columns
 */
export async function updateAppSubdomain(
  appId: string,
  userId: string,
  subdomain: string | null
): Promise<App | null> {
  const db = getDatabase();
  
  // Verify ownership
  const app = getAppById(appId);
  if (!app || app.user_id !== userId) {
    return null;
  }
  
  const now = new Date().toISOString();
  
  if (subdomain) {
    // Update with new subdomain
    db.prepare(`
      UPDATE apps 
      SET subdomain = ?, subdomain_claimed_at = ?, subdomain_owner_id = ?, updated_at = ?
      WHERE id = ?
    `).run(subdomain.toLowerCase(), now, userId, now, appId);
  } else {
    // Clear subdomain
    db.prepare(`
      UPDATE apps 
      SET subdomain = NULL, subdomain_claimed_at = NULL, subdomain_owner_id = NULL, updated_at = ?
      WHERE id = ?
    `).run(now, appId);
  }
  
  return getAppById(appId);
}
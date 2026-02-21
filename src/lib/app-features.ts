/**
 * Per-App Feature Flag Management for OnHyper.io
 * 
 * Allows customers to create and manage feature flags for their own apps.
 * Each flag has a name, value (boolean or string), and optional description.
 * 
 * ## Use Cases
 * 
 * - Toggle features on/off without redeploying
 * - A/B testing with different flag values
 * - Gradual rollouts by checking flag values
 * - Environment-specific configuration
 * 
 * ## API Endpoints
 * 
 * - GET /api/features/:appId - Public endpoint for apps to fetch their flags
 * - GET /api/apps/:appId/features - Get flags (owner only)
 * - POST /api/apps/:appId/features - Create flag (owner only)
 * - PUT /api/apps/:appId/features/:flagName - Update flag (owner only)
 * - DELETE /api/apps/:appId/features/:flagName - Delete flag (owner only)
 * 
 * ## Usage
 * 
 * ```typescript
 * import { 
 *   createAppFeatureFlag, 
 *   getAppFeatureFlags, 
 *   getAppFeatureFlag,
 *   updateAppFeatureFlag,
 *   deleteAppFeatureFlag 
 * } from './lib/app-features.js';
 * 
 * // Create a flag
 * const flag = createAppFeatureFlag(appId, 'new_ui_enabled', {
 *   value: 'true',
 *   description: 'Enable the new UI design'
 * });
 * 
 * // Get all flags for an app
 * const flags = getAppFeatureFlags(appId);
 * 
 * // Get a specific flag
 * const flag = getAppFeatureFlag(appId, 'new_ui_enabled');
 * 
 * // Update a flag
 * updateAppFeatureFlag(appId, 'new_ui_enabled', { value: 'false' });
 * 
 * // Delete a flag
 * deleteAppFeatureFlag(appId, 'new_ui_enabled');
 * ```
 * 
 * @module lib/app-features
 */

import { getDatabase } from './db.js';

/**
 * App feature flag stored in database
 */
export interface AppFeatureFlag {
  id: number;
  app_id: string;
  name: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create parameters for a new feature flag
 */
export interface CreateAppFeatureFlagParams {
  name: string;
  value: string;
  description?: string;
}

/**
 * Update parameters for an existing feature flag
 */
export interface UpdateAppFeatureFlagParams {
  value?: string;
  description?: string;
}

/**
 * Public representation of a feature flag (for API responses)
 */
export interface PublicAppFeatureFlag {
  name: string;
  value: string;
  description?: string;
}

/**
 * Create a new feature flag for an app
 * 
 * @param appId - The app ID
 * @param params - Flag parameters (name, value, description)
 * @returns The created feature flag
 * @throws Error if flag with same name already exists
 */
export function createAppFeatureFlag(
  appId: string,
  params: CreateAppFeatureFlagParams
): AppFeatureFlag {
  const db = getDatabase();
  
  // Validate name format
  if (!params.name || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(params.name)) {
    throw new Error('Flag name must start with a letter and contain only letters, numbers, underscores, and hyphens');
  }
  
  // Validate name length
  if (params.name.length > 64) {
    throw new Error('Flag name must be 64 characters or less');
  }
  
  // Validate value length
  if (params.value.length > 1000) {
    throw new Error('Flag value must be 1000 characters or less');
  }
  
  // Check if flag already exists
  const existing = db.prepare(
    'SELECT id FROM app_feature_flags WHERE app_id = ? AND name = ?'
  ).get(appId, params.name);
  
  if (existing) {
    throw new Error(`Feature flag "${params.name}" already exists`);
  }
  
  const now = new Date().toISOString();
  
  const result = db.prepare(`
    INSERT INTO app_feature_flags (app_id, name, value, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(appId, params.name, params.value, params.description || null, now, now);
  
  return getAppFeatureFlag(appId, params.name)!;
}

/**
 * Get a specific feature flag for an app
 * 
 * @param appId - The app ID
 * @param name - The flag name
 * @returns The feature flag or null if not found
 */
export function getAppFeatureFlag(appId: string, name: string): AppFeatureFlag | null {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM app_feature_flags WHERE app_id = ? AND name = ?'
  ).get(appId, name) as AppFeatureFlag | undefined || null;
}

/**
 * Get all feature flags for an app
 * 
 * @param appId - The app ID
 * @returns Array of feature flags
 */
export function getAppFeatureFlags(appId: string): AppFeatureFlag[] {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM app_feature_flags WHERE app_id = ? ORDER BY name'
  ).all(appId) as AppFeatureFlag[];
}

/**
 * Get feature flags for an app in public format
 * This is used by the public API endpoint that apps call to fetch their flags
 * 
 * @param appId - The app ID
 * @returns Array of public feature flags (name, value, description only)
 */
export function getPublicAppFeatureFlags(appId: string): PublicAppFeatureFlag[] {
  const flags = getAppFeatureFlags(appId);
  return flags.map(f => ({
    name: f.name,
    value: f.value,
    description: f.description || undefined,
  }));
}

/**
 * Update a feature flag
 * 
 * @param appId - The app ID
 * @param name - The flag name
 * @param params - Update parameters (value, description)
 * @returns The updated feature flag or null if not found
 */
export function updateAppFeatureFlag(
  appId: string,
  name: string,
  params: UpdateAppFeatureFlagParams
): AppFeatureFlag | null {
  const db = getDatabase();
  
  // Check if flag exists
  const existing = getAppFeatureFlag(appId, name);
  if (!existing) {
    return null;
  }
  
  // Build update query
  const updates: string[] = [];
  const values: any[] = [];
  
  if (params.value !== undefined) {
    if (params.value.length > 1000) {
      throw new Error('Flag value must be 1000 characters or less');
    }
    updates.push('value = ?');
    values.push(params.value);
  }
  
  if (params.description !== undefined) {
    updates.push('description = ?');
    values.push(params.description || null);
  }
  
  if (updates.length === 0) {
    return existing;
  }
  
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(appId);
  values.push(name);
  
  db.prepare(
    `UPDATE app_feature_flags SET ${updates.join(', ')} WHERE app_id = ? AND name = ?`
  ).run(...values);
  
  return getAppFeatureFlag(appId, name)!;
}

/**
 * Delete a feature flag
 * 
 * @param appId - The app ID
 * @param name - The flag name
 * @returns True if deleted, false if not found
 */
export function deleteAppFeatureFlag(appId: string, name: string): boolean {
  const db = getDatabase();
  const result = db.prepare(
    'DELETE FROM app_feature_flags WHERE app_id = ? AND name = ?'
  ).run(appId, name);
  return result.changes > 0;
}

/**
 * Delete all feature flags for an app
 * Called when an app is deleted
 * 
 * @param appId - The app ID
 */
export function deleteAllAppFeatureFlags(appId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM app_feature_flags WHERE app_id = ?').run(appId);
}

/**
 * Count feature flags for an app
 * 
 * @param appId - The app ID
 * @returns Number of feature flags
 */
export function countAppFeatureFlags(appId: string): number {
  const db = getDatabase();
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM app_feature_flags WHERE app_id = ?'
  ).get(appId) as { count: number };
  return result.count;
}

/**
 * Parse a feature flag value
 * Handles common formats: boolean strings, numbers, JSON
 * 
 * @param value - The raw string value
 * @returns Parsed value (boolean, number, object, or string)
 */
export function parseFlagValue(value: string): boolean | number | object | string {
  // Try parsing as JSON first (handles objects, arrays, numbers, booleans)
  try {
    return JSON.parse(value);
  } catch {
    // Not valid JSON, return as string
    return value;
  }
}

/**
 * Get feature flags as a key-value object (useful for apps)
 * 
 * @param appId - The app ID
 * @returns Object with flag names as keys and parsed values
 */
export function getAppFeatureFlagsAsObject(appId: string): Record<string, any> {
  const flags = getAppFeatureFlags(appId);
  const result: Record<string, any> = {};
  
  for (const flag of flags) {
    result[flag.name] = parseFlagValue(flag.value);
  }
  
  return result;
}
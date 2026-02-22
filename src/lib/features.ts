/**
 * Feature Flag System for OnHyper.io
 * 
 * Provides comprehensive feature flag management with:
 * - Global feature enable/disable
 * - Gradual rollout by percentage
 * - Plan tier restrictions
 * - Custom rules (JSON-based conditions)
 * - Per-user overrides (admin or beta testing)
 * 
 * ## Decision Order
 * 
 * When checking if a feature is enabled for a user:
 * 1. User override (if exists) - skip all other checks
 * 2. Custom rules evaluation (if configured)
 * 3. Minimum plan tier check
 * 4. Rollout percentage (deterministic hash)
 * 5. Global enabled flag
 * 
 * ## Usage
 * 
 * ```typescript
 * import { isFeatureEnabled, createFeatureFlag } from './lib/features.js';
 * 
 * // Check if feature is enabled for a user
 * const result = await isFeatureEnabled('subdomains', user.id);
 * if (!result.enabled) {
 *   return c.json({ error: result.reason }, 403);
 * }
 * 
 * // Create a new feature flag
 * await createFeatureFlag({
 *   name: 'new_feature',
 *   display_name: 'New Feature',
 *   description: 'A brand new feature',
 *   min_plan_tier: 'FREE',
 * });
 * ```
 * 
 * @module lib/features
 */

import { randomUUID } from 'crypto';
import { getDatabase, FeatureFlag, UserFeatureOverride } from './db.js';
import { PLAN_TIERS, PLAN_TIER_NAMES, getPlanTier, isPlanAtLeast, PlanTier } from '../config.js';
import { getUserById } from './users.js';

// ============================================================================
// Types
// ============================================================================

export interface CreateFeatureFlagParams {
  name: string;
  display_name: string;
  description?: string;
  enabled?: boolean;
  rollout_percentage?: number;
  min_plan_tier?: PlanTier;
  custom_rules?: CustomRules | null;
}

export interface UpdateFeatureFlagParams {
  display_name?: string;
  description?: string;
  enabled?: boolean;
  rollout_percentage?: number;
  min_plan_tier?: PlanTier;
  custom_rules?: CustomRules | null;
}

export interface FeatureCheckResult {
  enabled: boolean;
  reason: string;
  source: 'override' | 'custom_rules' | 'plan_tier' | 'rollout' | 'global' | 'not_found';
}

/**
 * Custom rules structure for feature flag conditions
 * Examples:
 * - { type: 'plan_tier', operator: '>=', value: 'PRO' }
 * - { type: 'and', conditions: [...] }
 * - { type: 'subdomain_length', operator: '<', value: 6 }
 */
export interface CustomRules {
  type: 'and' | 'or' | 'not' | 'plan_tier' | 'subdomain_length' | 'email_domain' | 'custom';
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  value?: any;
  conditions?: CustomRules[];
  field?: string;
}

export interface FeatureFlagWithStatus extends FeatureFlag {
  userStatus?: {
    enabled: boolean;
    reason: string;
    source: string;
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get a feature flag by name
 */
export function getFeatureFlag(name: string): FeatureFlag | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM feature_flags WHERE name = ?');
  const row = stmt.get(name);
  return row ? row as FeatureFlag : null;
}

/**
 * Check if a feature is enabled for a specific user
 * 
 * Decision order:
 * 1. User override (if exists and not expired)
 * 2. Custom rules evaluation
 * 3. Minimum plan tier check
 * 4. Rollout percentage (deterministic)
 * 5. Global enabled flag
 */
export async function isFeatureEnabled(
  featureName: string,
  userId: string,
  context?: Record<string, any>
): Promise<FeatureCheckResult> {
  const db = getDatabase();
  
  // Get the feature flag
  const flag = getFeatureFlag(featureName);
  if (!flag) {
    return {
      enabled: false,
      reason: 'Feature not found',
      source: 'not_found',
    };
  }
  
  // 1. Check user override first
  const override = getUserOverride(userId, featureName);
  if (override && !isOverrideExpired(override)) {
    return {
      enabled: override.enabled === 1,
      reason: override.reason || (override.enabled === 1 ? 'Enabled by override' : 'Disabled by override'),
      source: 'override',
    };
  }
  
  // 2. Check custom rules
  if (flag.custom_rules) {
    try {
      const rules: CustomRules = JSON.parse(flag.custom_rules);
      const rulesResult = evaluateCustomRules(rules, { userId, ...context });
      if (!rulesResult) {
        return {
          enabled: false,
          reason: 'Feature disabled by custom rules',
          source: 'custom_rules',
        };
      }
    } catch (e) {
      console.error(`Error parsing custom rules for ${featureName}:`, e);
    }
  }
  
  // 3. Check minimum plan tier
  const user = getUserById(userId);
  if (user && flag.min_plan_tier) {
    const requiredTier = flag.min_plan_tier.toUpperCase();
    if (!isPlanAtLeast(user.plan, requiredTier)) {
      return {
        enabled: false,
        reason: `Requires ${requiredTier} plan or higher`,
        source: 'plan_tier',
      };
    }
  }
  
  // 4. Check rollout percentage
  if (flag.rollout_percentage < 100) {
    const inRollout = isInRollout(userId, featureName, flag.rollout_percentage);
    if (!inRollout) {
      return {
        enabled: false,
        reason: 'Feature not yet available to your account',
        source: 'rollout',
      };
    }
  }
  
  // 5. Global enabled check
  if (!flag.enabled) {
    return {
      enabled: false,
      reason: 'Feature is globally disabled',
      source: 'global',
    };
  }
  
  return {
    enabled: true,
    reason: 'Feature enabled',
    source: 'global',
  };
}

/**
 * Check if a user is in a rollout percentage
 * Uses deterministic hashing based on userId + featureName
 */
export function isInRollout(userId: string, featureName: string, percentage: number): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;
  
  // Deterministic hash: userId + featureName
  const hash = simpleHash(`${userId}:${featureName}`);
  const bucket = hash % 100; // 0-99
  return bucket < percentage;
}

/**
 * Simple string hash function (deterministic, not cryptographic)
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Evaluate custom rules against a context
 */
export function evaluateCustomRules(rules: CustomRules, context: Record<string, any>): boolean {
  switch (rules.type) {
    case 'and':
      if (!rules.conditions) return true;
      return rules.conditions.every(r => evaluateCustomRules(r, context));
    
    case 'or':
      if (!rules.conditions) return false;
      return rules.conditions.some(r => evaluateCustomRules(r, context));
    
    case 'not':
      if (!rules.conditions || rules.conditions.length === 0) return true;
      return !evaluateCustomRules(rules.conditions[0], context);
    
    case 'plan_tier':
      return evaluateOperator(
        context.userPlan || getPlanTierForUser(context.userId),
        rules.operator || '>=',
        getPlanTier(rules.value)
      );
    
    case 'subdomain_length':
      const subdomainLength = context.subdomain?.length || 0;
      return evaluateOperator(subdomainLength, rules.operator || '<', rules.value);
    
    case 'email_domain':
      const email = context.email || getEmailForUser(context.userId) || '';
      const domain = email.split('@')[1] || '';
      
      if (rules.operator === 'in' && Array.isArray(rules.value)) {
        return rules.value.includes(domain);
      }
      return evaluateOperator(domain, rules.operator || '==', rules.value);
    
    case 'custom':
      // Custom field evaluation
      if (!rules.field) return true;
      const fieldValue = context[rules.field];
      return evaluateOperator(fieldValue, rules.operator || '==', rules.value);
    
    default:
      return true;
  }
}

/**
 * Evaluate a comparison operator
 */
function evaluateOperator(left: any, operator: string, right: any): boolean {
  switch (operator) {
    case '==': return left == right;
    case '!=': return left != right;
    case '>': return left > right;
    case '<': return left < right;
    case '>=': return left >= right;
    case '<=': return left <= right;
    case 'in': return Array.isArray(right) && right.includes(left);
    case 'not_in': return Array.isArray(right) && !right.includes(left);
    default: return true;
  }
}

/**
 * Get plan tier for a user (helper)
 */
function getPlanTierForUser(userId: string): number {
  const user = getUserById(userId);
  return user ? getPlanTier(user.plan) : 0;
}

/**
 * Get email for a user (helper)
 */
function getEmailForUser(userId: string): string | null {
  const user = getUserById(userId);
  return user?.email || null;
}

/**
 * Check if an override is expired
 */
function isOverrideExpired(override: UserFeatureOverride): boolean {
  if (!override.expires_at) return false;
  const expiresAt = new Date(override.expires_at);
  return expiresAt < new Date();
}

/**
 * Get user override for a feature
 */
function getUserOverride(userId: string, featureName: string): UserFeatureOverride | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM user_feature_overrides 
    WHERE user_id = ? AND feature_name = ?
  `);
  const row = stmt.get(userId, featureName);
  return row ? row as UserFeatureOverride : null;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new feature flag
 */
export function createFeatureFlag(params: CreateFeatureFlagParams): FeatureFlag {
  const db = getDatabase();
  
  const id = Date.now(); // Simple integer ID
  const customRulesJson = params.custom_rules ? JSON.stringify(params.custom_rules) : null;
  
  const stmt = db.prepare(`
    INSERT INTO feature_flags (
      name, display_name, description, enabled, rollout_percentage, 
      min_plan_tier, custom_rules
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    params.name,
    params.display_name,
    params.description || null,
    params.enabled !== false ? 1 : 0,
    params.rollout_percentage ?? 100,
    params.min_plan_tier || 'FREE',
    customRulesJson
  );
  
  return getFeatureFlag(params.name)!;
}

/**
 * Update an existing feature flag
 */
export function updateFeatureFlag(name: string, params: UpdateFeatureFlagParams): FeatureFlag | null {
  const db = getDatabase();
  
  // Build dynamic UPDATE query
  const updates: string[] = [];
  const values: any[] = [];
  
  if (params.display_name !== undefined) {
    updates.push('display_name = ?');
    values.push(params.display_name);
  }
  if (params.description !== undefined) {
    updates.push('description = ?');
    values.push(params.description);
  }
  if (params.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(params.enabled ? 1 : 0);
  }
  if (params.rollout_percentage !== undefined) {
    updates.push('rollout_percentage = ?');
    values.push(params.rollout_percentage);
  }
  if (params.min_plan_tier !== undefined) {
    updates.push('min_plan_tier = ?');
    values.push(params.min_plan_tier);
  }
  if (params.custom_rules !== undefined) {
    updates.push('custom_rules = ?');
    values.push(params.custom_rules ? JSON.stringify(params.custom_rules) : null);
  }
  
  if (updates.length === 0) {
    return getFeatureFlag(name);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(name);
  
  const stmt = db.prepare(`
    UPDATE feature_flags 
    SET ${updates.join(', ')}
    WHERE name = ?
  `);
  
  stmt.run(...values);
  return getFeatureFlag(name);
}

/**
 * Delete a feature flag
 */
export function deleteFeatureFlag(name: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM feature_flags WHERE name = ?');
  const result = stmt.run(name);
  return result.changes > 0;
}

/**
 * List all feature flags
 */
export function listFeatureFlags(): FeatureFlag[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM feature_flags ORDER BY name');
  return stmt.all() as FeatureFlag[];
}

/**
 * List feature flags with user status
 */
export function listFeatureFlagsWithUserStatus(userId: string): FeatureFlagWithStatus[] {
  const db = getDatabase();
  
  // Get all flags
  const flags = listFeatureFlags();
  
  // Get all overrides for this user
  const overridesStmt = db.prepare('SELECT * FROM user_feature_overrides WHERE user_id = ?');
  const overrides = overridesStmt.all(userId) as UserFeatureOverride[];
  const overrideMap = new Map(overrides.map(o => [o.feature_name, o]));
  
  // Add user status to each flag
  return flags.map(flag => {
    const status = checkFeatureForUser(flag, userId, overrideMap.get(flag.name));
    return {
      ...flag,
      userStatus: status,
    };
  });
}

/**
 * Check feature for user (sync version for listing)
 */
function checkFeatureForUser(
  flag: FeatureFlag,
  userId: string,
  override: UserFeatureOverride | undefined
): { enabled: boolean; reason: string; source: string } {
  // Check override first
  if (override && !(override.expires_at && new Date(override.expires_at) < new Date())) {
    return {
      enabled: override.enabled === 1,
      reason: override.reason || 'User override',
      source: 'override',
    };
  }
  
  // Check enabled
  if (!flag.enabled) {
    return {
      enabled: false,
      reason: 'Feature is globally disabled',
      source: 'global',
    };
  }
  
  // Check plan tier
  const user = getUserById(userId);
  if (user && flag.min_plan_tier) {
    const requiredTier = flag.min_plan_tier.toUpperCase();
    if (!isPlanAtLeast(user.plan, requiredTier)) {
      return {
        enabled: false,
        reason: `Requires ${requiredTier} plan or higher`,
        source: 'plan_tier',
      };
    }
  }
  
  // Check rollout
  if (flag.rollout_percentage < 100) {
    const inRollout = isInRollout(userId, flag.name, flag.rollout_percentage);
    if (!inRollout) {
      return {
        enabled: false,
        reason: 'Feature not yet available to your account',
        source: 'rollout',
      };
    }
  }
  
  return {
    enabled: true,
    reason: 'Feature enabled',
    source: 'global',
  };
}

// ============================================================================
// Override Management
// ============================================================================

/**
 * Set a user override for a feature
 */
export function setUserOverride(
  userId: string,
  featureName: string,
  enabled: boolean,
  reason?: string,
  expiresAt?: Date
): UserFeatureOverride {
  const db = getDatabase();
  
  const id = Date.now();
  const expiresAtStr = expiresAt ? expiresAt.toISOString() : null;
  
  const stmt = db.prepare(`
    INSERT INTO user_feature_overrides (user_id, feature_name, enabled, reason, expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, feature_name) DO UPDATE SET
      enabled = excluded.enabled,
      reason = excluded.reason,
      expires_at = excluded.expires_at,
      created_at = CURRENT_TIMESTAMP
  `);
  
  stmt.run(userId, featureName, enabled ? 1 : 0, reason || null, expiresAtStr);
  
  return getUserOverride(userId, featureName)!;
}

/**
 * Remove a user override
 */
export function removeUserOverride(userId: string, featureName: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM user_feature_overrides 
    WHERE user_id = ? AND feature_name = ?
  `);
  const result = stmt.run(userId, featureName);
  return result.changes > 0;
}

/**
 * List all overrides for a user
 */
export function listUserOverrides(userId: string): UserFeatureOverride[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM user_feature_overrides WHERE user_id = ?');
  return stmt.all(userId) as UserFeatureOverride[];
}

/**
 * List all overrides for a feature (admin use)
 */
export function listFeatureOverrides(featureName: string): (UserFeatureOverride & { email?: string })[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT ufo.*, u.email 
    FROM user_feature_overrides ufo
    LEFT JOIN users u ON u.id = ufo.user_id
    WHERE ufo.feature_name = ?
  `);
  return stmt.all(featureName) as (UserFeatureOverride & { email?: string })[];
}

// ============================================================================
// Seed Data
// ============================================================================

/**
 * Seed default feature flags
 * Should only be run once during setup
 */
export function seedDefaultFeatureFlags(): void {
  const db = getDatabase();
  
  // Check if flags already exist
  const existing = db.prepare('SELECT COUNT(*) as count FROM feature_flags').get() as { count: number };
  if (existing.count > 0) {
    console.log('Feature flags already exist, skipping seed');
    return;
  }
  
  // Insert default flags
  const defaults: CreateFeatureFlagParams[] = [
    {
      name: 'subdomains',
      display_name: 'Custom Subdomains',
      description: 'Allow users to claim custom subdomains for their apps',
      enabled: true,
      rollout_percentage: 100,
      min_plan_tier: 'FREE',
    },
    {
      name: 'short_subdomains',
      display_name: 'Short Subdomains',
      description: 'Allow subdomains with fewer than 6 characters (premium feature)',
      enabled: true,
      rollout_percentage: 100,
      min_plan_tier: 'PRO',
      custom_rules: {
        type: 'or',
        conditions: [
          { type: 'subdomain_length', operator: '>=', value: 6 },
          { type: 'plan_tier', operator: '>=', value: 'PRO' },
        ],
      },
    },
  ];
  
  for (const flag of defaults) {
    createFeatureFlag(flag);
    console.log(`Created feature flag: ${flag.name}`);
  }
}

// Re-export types
export type { FeatureFlag, UserFeatureOverride };
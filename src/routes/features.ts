/**
 * Feature Flag API Routes for OnHyper.io
 * 
 * Provides endpoints for managing and checking feature flags.
 * 
 * ## Public Endpoints (require auth)
 * 
 * - GET /api/features - List all flags with user status
 * - GET /api/features/:name - Get detailed flag info
 * 
 * ## App Feature Flags (public endpoint for apps)
 * 
 * - GET /api/features/:appId/public - Get all feature flags for an app
 * 
 * ## App Feature Flag Management (require auth + ownership)
 * 
 * - GET /api/apps/:appId/features - List flags for an app
 * - POST /api/apps/:appId/features - Create a new flag
 * - PUT /api/apps/:appId/features/:flagName - Update a flag
 * - DELETE /api/apps/:appId/features/:flagName - Delete a flag
 * 
 * ## Admin Endpoints (require admin auth)
 * 
 * - POST /api/admin/features - Create a new flag
 * - PUT /api/admin/features/:name - Update a flag
 * - DELETE /api/admin/features/:name - Delete a flag
 * - POST /api/admin/features/:name/override - Set user override
 * - DELETE /api/admin/features/:name/override/:userId - Remove override
 * 
 * @module routes/features
 */

import { Hono } from 'hono';
import { 
  getFeatureFlag, 
  listFeatureFlags, 
  listFeatureFlagsWithUserStatus,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  setUserOverride,
  removeUserOverride,
  listFeatureOverrides,
  CreateFeatureFlagParams,
  UpdateFeatureFlagParams,
} from '../lib/features.js';
import {
  createAppFeatureFlag,
  getAppFeatureFlag,
  getAppFeatureFlags,
  getPublicAppFeatureFlags,
  updateAppFeatureFlag,
  deleteAppFeatureFlag,
  getAppFeatureFlagsAsObject,
  CreateAppFeatureFlagParams,
  UpdateAppFeatureFlagParams,
} from '../lib/app-features.js';
import { getAuthUser, requireAdminAuth } from '../middleware/auth.js';
import { getUserById } from '../lib/users.js';
import { getAppById } from '../lib/apps.js';

// Public routes (require user auth)
const featuresRouter = new Hono();

// Admin routes (require admin auth)
const adminFeaturesRouter = new Hono();
adminFeaturesRouter.use('*', requireAdminAuth);

// ============================================================================
// Public Endpoints
// ============================================================================

/**
 * GET /api/features
 * List all feature flags with user status
 * 
 * Returns all feature flags with the current user's access status for each.
 */
featuresRouter.get('/', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const flags = listFeatureFlagsWithUserStatus(user.userId);
  
  return c.json({
    flags: flags.map(f => ({
      name: f.name,
      display_name: f.display_name,
      description: f.description,
      enabled: f.enabled === 1,
      min_plan_tier: f.min_plan_tier,
      userStatus: f.userStatus,
    })),
    count: flags.length,
  });
});

/**
 * GET /api/features/:name
 * Get detailed info about a specific feature flag
 */
featuresRouter.get('/:name', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const name = c.req.param('name');
  const flag = getFeatureFlag(name);
  
  if (!flag) {
    return c.json({ error: 'Feature not found' }, 404);
  }
  
  // Get user status by checking with the library
  const flagsWithStatus = listFeatureFlagsWithUserStatus(user.userId);
  const flagWithStatus = flagsWithStatus.find(f => f.name === name);
  
  return c.json({
    name: flag.name,
    display_name: flag.display_name,
    description: flag.description,
    enabled: flag.enabled === 1,
    rollout_percentage: flag.rollout_percentage,
    min_plan_tier: flag.min_plan_tier,
    userStatus: flagWithStatus?.userStatus || {
      enabled: flag.enabled === 1,
      reason: 'Unknown',
      source: 'global',
    },
  });
});

// ============================================================================
// Admin Endpoints
// ============================================================================

/**
 * GET /api/admin/features
 * List all feature flags (admin view - shows all details)
 */
adminFeaturesRouter.get('/', async (c) => {
  const flags = listFeatureFlags();
  
  return c.json({
    flags: flags.map(f => ({
      id: f.id,
      name: f.name,
      display_name: f.display_name,
      description: f.description,
      enabled: f.enabled === 1,
      rollout_percentage: f.rollout_percentage,
      min_plan_tier: f.min_plan_tier,
      custom_rules: f.custom_rules ? JSON.parse(f.custom_rules) : null,
      created_at: f.created_at,
      updated_at: f.updated_at,
    })),
    count: flags.length,
  });
});

/**
 * POST /api/admin/features
 * Create a new feature flag
 */
adminFeaturesRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      name, 
      display_name, 
      description, 
      enabled, 
      rollout_percentage, 
      min_plan_tier,
      custom_rules 
    } = body;
    
    if (!name || !display_name) {
      return c.json({ error: 'name and display_name are required' }, 400);
    }
    
    // Validate name format (lowercase, underscores, no spaces)
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return c.json({ 
        error: 'Feature name must be lowercase, start with a letter, and contain only letters, numbers, and underscores' 
      }, 400);
    }
    
    // Check if flag already exists
    const existing = getFeatureFlag(name);
    if (existing) {
      return c.json({ error: 'Feature flag with this name already exists' }, 409);
    }
    
    const params: CreateFeatureFlagParams = {
      name,
      display_name,
      description,
      enabled: enabled !== false,
      rollout_percentage: rollout_percentage ?? 100,
      min_plan_tier: min_plan_tier || 'FREE',
      custom_rules: custom_rules || null,
    };
    
    const flag = createFeatureFlag(params);
    
    return c.json({
      success: true,
      flag: {
        id: flag.id,
        name: flag.name,
        display_name: flag.display_name,
        description: flag.description,
        enabled: flag.enabled === 1,
        rollout_percentage: flag.rollout_percentage,
        min_plan_tier: flag.min_plan_tier,
      },
    }, 201);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create feature flag';
    return c.json({ error: message }, 400);
  }
});

/**
 * GET /api/admin/features/:name
 * Get detailed flag info (admin view)
 */
adminFeaturesRouter.get('/:name', async (c) => {
  const name = c.req.param('name');
  const flag = getFeatureFlag(name);
  
  if (!flag) {
    return c.json({ error: 'Feature not found' }, 404);
  }
  
  // Get all overrides for this feature
  const overrides = listFeatureOverrides(name);
  
  return c.json({
    id: flag.id,
    name: flag.name,
    display_name: flag.display_name,
    description: flag.description,
    enabled: flag.enabled === 1,
    rollout_percentage: flag.rollout_percentage,
    min_plan_tier: flag.min_plan_tier,
    custom_rules: flag.custom_rules ? JSON.parse(flag.custom_rules) : null,
    created_at: flag.created_at,
    updated_at: flag.updated_at,
    overrides: overrides.map(o => ({
      user_id: o.user_id,
      email: o.email,
      enabled: o.enabled === 1,
      reason: o.reason,
      expires_at: o.expires_at,
      created_at: o.created_at,
    })),
  });
});

/**
 * PUT /api/admin/features/:name
 * Update an existing feature flag
 */
adminFeaturesRouter.put('/:name', async (c) => {
  try {
    const name = c.req.param('name');
    
    // Check if flag exists
    const existing = getFeatureFlag(name);
    if (!existing) {
      return c.json({ error: 'Feature not found' }, 404);
    }
    
    const body = await c.req.json();
    const { 
      display_name, 
      description, 
      enabled, 
      rollout_percentage, 
      min_plan_tier,
      custom_rules 
    } = body;
    
    const params: UpdateFeatureFlagParams = {};
    
    if (display_name !== undefined) params.display_name = display_name;
    if (description !== undefined) params.description = description;
    if (enabled !== undefined) params.enabled = enabled;
    if (rollout_percentage !== undefined) params.rollout_percentage = rollout_percentage;
    if (min_plan_tier !== undefined) params.min_plan_tier = min_plan_tier;
    if (custom_rules !== undefined) params.custom_rules = custom_rules;
    
    const flag = updateFeatureFlag(name, params);
    
    return c.json({
      success: true,
      flag: flag ? {
        id: flag.id,
        name: flag.name,
        display_name: flag.display_name,
        description: flag.description,
        enabled: flag.enabled === 1,
        rollout_percentage: flag.rollout_percentage,
        min_plan_tier: flag.min_plan_tier,
      } : null,
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update feature flag';
    return c.json({ error: message }, 400);
  }
});

/**
 * DELETE /api/admin/features/:name
 * Delete a feature flag
 */
adminFeaturesRouter.delete('/:name', async (c) => {
  const name = c.req.param('name');
  
  // Check if flag exists
  const existing = getFeatureFlag(name);
  if (!existing) {
    return c.json({ error: 'Feature not found' }, 404);
  }
  
  // Don't allow deleting core features
  const protectedFeatures = ['subdomains', 'short_subdomains'];
  if (protectedFeatures.includes(name)) {
    return c.json({ 
      error: 'Cannot delete core feature flags. Disable them instead.',
      hint: 'Use PUT /api/admin/features/:name with enabled=false'
    }, 400);
  }
  
  const deleted = deleteFeatureFlag(name);
  
  return c.json({
    success: deleted,
    deleted: name,
  });
});

/**
 * POST /api/admin/features/:name/override
 * Set a user override for a feature
 */
adminFeaturesRouter.post('/:name/override', async (c) => {
  try {
    const featureName = c.req.param('name');
    
    // Check if feature exists
    const existing = getFeatureFlag(featureName);
    if (!existing) {
      return c.json({ error: 'Feature not found' }, 404);
    }
    
    const body = await c.req.json();
    const { user_id, enabled, reason, expires_at } = body;
    
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }
    
    if (enabled === undefined) {
      return c.json({ error: 'enabled is required' }, 400);
    }
    
    // Verify user exists
    const user = getUserById(user_id);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const expiresAt = expires_at ? new Date(expires_at) : undefined;
    
    // Validate expiration date is in the future
    if (expiresAt && expiresAt < new Date()) {
      return c.json({ error: 'Expiration date must be in the future' }, 400);
    }
    
    const override = setUserOverride(user_id, featureName, enabled, reason, expiresAt);
    
    return c.json({
      success: true,
      override: {
        user_id: override.user_id,
        feature_name: override.feature_name,
        enabled: override.enabled === 1,
        reason: override.reason,
        expires_at: override.expires_at,
      },
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set override';
    return c.json({ error: message }, 400);
  }
});

/**
 * DELETE /api/admin/features/:name/override/:userId
 * Remove a user override for a feature
 */
adminFeaturesRouter.delete('/:name/override/:userId', async (c) => {
  const featureName = c.req.param('name');
  const userId = c.req.param('userId');
  
  // Check if feature exists
  const existing = getFeatureFlag(featureName);
  if (!existing) {
    return c.json({ error: 'Feature not found' }, 404);
  }
  
  const removed = removeUserOverride(userId, featureName);
  
  return c.json({
    success: removed,
    removed: removed ? { user_id: userId, feature_name: featureName } : null,
  });
});

/**
 * GET /api/admin/features/:name/overrides
 * List all overrides for a feature
 */
adminFeaturesRouter.get('/:name/overrides', async (c) => {
  const featureName = c.req.param('name');
  
  // Check if feature exists
  const existing = getFeatureFlag(featureName);
  if (!existing) {
    return c.json({ error: 'Feature not found' }, 404);
  }
  
  const overrides = listFeatureOverrides(featureName);
  
  return c.json({
    feature: featureName,
    overrides: overrides.map(o => ({
      user_id: o.user_id,
      email: o.email,
      enabled: o.enabled === 1,
      reason: o.reason,
      expires_at: o.expires_at,
      created_at: o.created_at,
    })),
    count: overrides.length,
  });
});

export { featuresRouter, adminFeaturesRouter };
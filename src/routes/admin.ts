/**
 * Admin API Routes for OnHyper.io
 * 
 * Provides endpoints for system administration:
 * - User management (list, view, plan changes)
 * - Feature flag migration (sync code defaults to DB)
 * - System status and statistics
 * 
 * All endpoints require X-Admin-Key header matching ONHYPER_MASTER_KEY.
 * 
 * ## Endpoints
 * 
 * ### User Management
 * - GET /api/admin/users - List users with pagination and filtering
 * - GET /api/admin/users/:userId - Get user details
 * - PATCH /api/admin/users/:userId/plan - Update user plan (also in index.ts)
 * 
 * ### Feature Flag Management
 * - GET /api/admin/features/diff - Show drift between code and DB
 * - POST /api/admin/features/migrate - Sync code defaults to DB
 * 
 * ### System Status
 * - GET /api/admin/status - System health and statistics
 * 
 * @module routes/admin
 */

import { Hono } from 'hono';
import { requireAdminAuth } from '../middleware/auth.js';
import { getDatabase } from '../lib/db.js';
import { getUserById } from '../lib/users.js';
import { getFeatureFlag, updateFeatureFlag } from '../lib/features.js';

export const admin = new Hono();

// All admin routes require authentication
admin.use('*', requireAdminAuth);

// ============================================================================
// Code Defaults for Feature Flags
// ============================================================================

/**
 * Feature flag defaults defined in code.
 * These values represent the "source of truth" for migrations.
 * 
 * When code is updated (e.g., min_plan_tier changes), update here
 * and run POST /api/admin/features/migrate to sync to DB.
 */
const FEATURE_FLAG_DEFAULTS = {
  subdomains: {
    display_name: 'Custom Subdomains',
    description: 'Allow users to claim custom subdomains for their apps',
    enabled: true,
    rollout_percentage: 100,
    min_plan_tier: 'FREE',
    custom_rules: null,
  },
  short_subdomains: {
    display_name: 'Short Subdomains',
    description: 'Allow subdomains with fewer than 6 characters (premium feature)',
    enabled: true,
    rollout_percentage: 100,
    min_plan_tier: 'PRO',
    custom_rules: {
      type: 'or' as const,
      conditions: [
        { type: 'subdomain_length' as const, operator: '>=' as const, value: 6 },
        { type: 'plan_tier' as const, operator: '>=' as const, value: 'PRO' },
      ],
    },
  },
};

// ============================================================================
// User Management
// ============================================================================

/**
 * GET /api/admin/users
 * List all users with pagination and filtering
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 * - search: Filter by email (partial match)
 * - plan: Filter by plan tier (FREE, HOBBY, PRO, BUSINESS)
 */
admin.get('/users', async (c) => {
  const db = getDatabase();
  
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const search = c.req.query('search')?.trim();
  const plan = c.req.query('plan')?.toUpperCase();
  
  const offset = (page - 1) * limit;
  
  // Build query with optional filters
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  
  if (search) {
    conditions.push('u.email LIKE ?');
    params.push(`%${search}%`);
  }
  
  if (plan && ['FREE', 'HOBBY', 'PRO', 'BUSINESS'].includes(plan)) {
    conditions.push('u.plan = ?');
    params.push(plan);
  }
  
  const whereClause = conditions.length > 0 
    ? 'WHERE ' + conditions.join(' AND ')
    : '';
  
  // Main query with counts
  const usersQuery = `
    SELECT 
      u.id, 
      u.email, 
      u.plan, 
      u.created_at, 
      u.updated_at,
      COUNT(DISTINCT a.id) as app_count,
      COUNT(DISTINCT s.id) as secret_count,
      COUNT(DISTINCT sr.subdomain) as subdomain_count
    FROM users u
    LEFT JOIN apps a ON u.id = a.user_id
    LEFT JOIN secrets s ON u.id = s.user_id
    LEFT JOIN subdomain_reservations sr ON u.id = sr.owner_id
    ${whereClause}
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const users = db.prepare(usersQuery).all(...params, limit, offset);
  
  // Count query for pagination
  const countQuery = `SELECT COUNT(*) as count FROM users u ${whereClause}`;
  const countResult = db.prepare(countQuery).get(...params) as { count: number };
  
  return c.json({
    users: users.map((u: any) => ({
      id: u.id,
      email: u.email,
      plan: u.plan,
      app_count: u.app_count,
      secret_count: u.secret_count,
      subdomain_count: u.subdomain_count,
      created_at: u.created_at,
      updated_at: u.updated_at,
    })),
    pagination: {
      page,
      limit,
      total: countResult.count,
      totalPages: Math.ceil(countResult.count / limit),
    },
  });
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information
 */
admin.get('/users/:userId', async (c) => {
  const db = getDatabase();
  const userId = c.req.param('userId');
  
  // Get user
  const user = getUserById(userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  // Get apps
  const apps = db.prepare(`
    SELECT id, name, slug, created_at, subdomain
    FROM apps WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
  
  // Get subdomains
  const subdomains = db.prepare(`
    SELECT subdomain, claimed_at
    FROM subdomain_reservations WHERE owner_id = ?
    ORDER BY claimed_at DESC
  `).all(userId);
  
  // Get secrets (masked)
  const secrets = db.prepare(`
    SELECT name, created_at
    FROM secrets WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
  
  // Get API keys
  const apiKeys = db.prepare(`
    SELECT id, key, plan, created_at
    FROM api_keys WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
  
  // Get feature flag overrides
  const overrides = db.prepare(`
    SELECT feature_name, enabled, reason, expires_at, created_at
    FROM user_feature_overrides WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
  
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    apps,
    subdomains,
    secrets: secrets.map((s: any) => ({ ...s, key_count: 1 })),
    api_keys: apiKeys.map((k: any) => ({
      ...k,
      key: k.key.substring(0, 12) + '...', // Mask the key
    })),
    feature_overrides: overrides,
  });
});

/**
 * PATCH /api/admin/users/:userId
 * Update user fields (currently only plan is supported)
 * 
 * Note: Plan updates are also available at /api/admin/users/:userId/plan
 * This endpoint is provided for consistency and future expansion.
 */
admin.patch('/users/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  
  // Verify user exists
  const user = getUserById(userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  const db = getDatabase();
  const updates: string[] = [];
  const values: (string | null)[] = [];
  
  // Only allow certain fields to be updated
  if (body.plan !== undefined) {
    if (!['FREE', 'HOBBY', 'PRO', 'BUSINESS'].includes(body.plan)) {
      return c.json({ error: 'Invalid plan. Must be FREE, HOBBY, PRO, or BUSINESS' }, 400);
    }
    updates.push('plan = ?');
    values.push(body.plan);
  }
  
  if (updates.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }
  
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(userId);
  
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updatedUser = getUserById(userId);
  
  return c.json({
    success: true,
    user: {
      id: updatedUser!.id,
      email: updatedUser!.email,
      plan: updatedUser!.plan,
      updated_at: updatedUser!.updated_at,
    },
  });
});

// ============================================================================
// Feature Flag Migration
// ============================================================================

/**
 * GET /api/admin/features/diff
 * Show differences between code defaults and database values
 */
admin.get('/features/diff', async (c) => {
  const diff: {
    name: string;
    in_code: boolean;
    in_db: boolean;
    differences: {
      field: string;
      code_value: any;
      db_value: any;
    }[];
  }[] = [];
  
  for (const [name, codeDefaults] of Object.entries(FEATURE_FLAG_DEFAULTS)) {
    const dbFlag = getFeatureFlag(name);
    
    const differences: { field: string; code_value: any; db_value: any }[] = [];
    
    if (dbFlag) {
      // Check each field
      if (dbFlag.min_plan_tier !== codeDefaults.min_plan_tier) {
        differences.push({
          field: 'min_plan_tier',
          code_value: codeDefaults.min_plan_tier,
          db_value: dbFlag.min_plan_tier,
        });
      }
      
      if (dbFlag.display_name !== codeDefaults.display_name) {
        differences.push({
          field: 'display_name',
          code_value: codeDefaults.display_name,
          db_value: dbFlag.display_name,
        });
      }
      
      if (dbFlag.description !== codeDefaults.description) {
        differences.push({
          field: 'description',
          code_value: codeDefaults.description,
          db_value: dbFlag.description,
        });
      }
      
      const dbEnabled = dbFlag.enabled === 1;
      if (dbEnabled !== codeDefaults.enabled) {
        differences.push({
          field: 'enabled',
          code_value: codeDefaults.enabled,
          db_value: dbEnabled,
        });
      }
      
      if (dbFlag.rollout_percentage !== codeDefaults.rollout_percentage) {
        differences.push({
          field: 'rollout_percentage',
          code_value: codeDefaults.rollout_percentage,
          db_value: dbFlag.rollout_percentage,
        });
      }
    }
    
    diff.push({
      name,
      in_code: true,
      in_db: !!dbFlag,
      differences,
    });
  }
  
  // Check for flags in DB that aren't in code
  const db = getDatabase();
  const dbFlags = db.prepare('SELECT name FROM feature_flags').all() as { name: string }[];
  
  for (const { name } of dbFlags) {
    if (!FEATURE_FLAG_DEFAULTS[name as keyof typeof FEATURE_FLAG_DEFAULTS]) {
      diff.push({
        name,
        in_code: false,
        in_db: true,
        differences: [],
      });
    }
  }
  
  return c.json({
    sync_needed: diff.some(d => d.differences.length > 0),
    flags: diff,
  });
});

/**
 * POST /api/admin/features/migrate
 * Sync code defaults to database
 * 
 * Updates feature flags in the database to match code defaults.
 * Only updates fields that differ - preserves user overrides and other data.
 */
admin.post('/features/migrate', async (c) => {
  const results: {
    name: string;
    action: 'created' | 'updated' | 'skipped';
    changes?: string[];
  }[] = [];
  
  for (const [name, defaults] of Object.entries(FEATURE_FLAG_DEFAULTS)) {
    const existing = getFeatureFlag(name);
    
    if (!existing) {
      // Flag doesn't exist in DB - would need to create it
      // For safety, we'll skip creation and log it
      results.push({
        name,
        action: 'skipped',
        changes: ['Flag does not exist in database - manual creation required'],
      });
      continue;
    }
    
    // Update existing flag
    const changes: string[] = [];
    
    if (existing.min_plan_tier !== defaults.min_plan_tier) {
      changes.push(`min_plan_tier: ${existing.min_plan_tier} → ${defaults.min_plan_tier}`);
    }
    
    if (existing.display_name !== defaults.display_name) {
      changes.push(`display_name updated`);
    }
    
    if (existing.description !== defaults.description) {
      changes.push(`description updated`);
    }
    
    const existingEnabled = existing.enabled === 1;
    if (existingEnabled !== defaults.enabled) {
      changes.push(`enabled: ${existingEnabled} → ${defaults.enabled}`);
    }
    
    if (existing.rollout_percentage !== defaults.rollout_percentage) {
      changes.push(`rollout_percentage: ${existing.rollout_percentage} → ${defaults.rollout_percentage}`);
    }
    
    if (changes.length > 0) {
      // Perform update
      updateFeatureFlag(name, {
        display_name: defaults.display_name,
        description: defaults.description,
        enabled: defaults.enabled,
        rollout_percentage: defaults.rollout_percentage,
        min_plan_tier: defaults.min_plan_tier,
        custom_rules: defaults.custom_rules,
      });
      
      results.push({
        name,
        action: 'updated',
        changes,
      });
    } else {
      results.push({
        name,
        action: 'skipped',
        changes: ['No changes needed'],
      });
    }
  }
  
  const updated = results.filter(r => r.action === 'updated').length;
  const skipped = results.filter(r => r.action === 'skipped').length;
  
  return c.json({
    success: true,
    message: `Migration complete: ${updated} updated, ${skipped} skipped`,
    results,
    summary: {
      total: results.length,
      updated,
      skipped,
    },
  });
});

// ============================================================================
// System Status
// ============================================================================

/**
 * GET /api/admin/status
 * Get system health and statistics
 */
admin.get('/status', async (c) => {
  const db = getDatabase();
  
  // User counts by plan
  const userStats = db.prepare(`
    SELECT 
      plan,
      COUNT(*) as count
    FROM users
    GROUP BY plan
    ORDER BY 
      CASE plan
        WHEN 'FREE' THEN 1
        WHEN 'HOBBY' THEN 2
        WHEN 'PRO' THEN 3
        WHEN 'BUSINESS' THEN 4
        ELSE 5
      END
  `).all() as { plan: string; count: number }[];
  
  // Total counts
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const totalApps = db.prepare('SELECT COUNT(*) as count FROM apps').get() as { count: number };
  const totalSecrets = db.prepare('SELECT COUNT(*) as count FROM secrets').get() as { count: number };
  const totalSubdomains = db.prepare('SELECT COUNT(*) as count FROM subdomain_reservations').get() as { count: number };
  const totalApiKeys = db.prepare('SELECT COUNT(*) as count FROM api_keys').get() as { count: number };
  
  // Feature flags
  const featureFlags = db.prepare('SELECT COUNT(*) as count FROM feature_flags').get() as { count: number };
  const featureOverrides = db.prepare('SELECT COUNT(*) as count FROM user_feature_overrides').get() as { count: number };
  
  // Waitlist stats
  const waitlistStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected
    FROM waitlist_entries
  `).get() as { total: number; pending: number; approved: number; rejected: number };
  
  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ?').get(sevenDaysAgo) as { count: number };
  const recentApps = db.prepare('SELECT COUNT(*) as count FROM apps WHERE created_at >= ?').get(sevenDaysAgo) as { count: number };
  
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    stats: {
      users: {
        total: totalUsers.count,
        by_plan: userStats.reduce((acc, { plan, count }) => {
          acc[plan] = count;
          return acc;
        }, {} as Record<string, number>),
      },
      apps: totalApps.count,
      secrets: totalSecrets.count,
      subdomains: totalSubdomains.count,
      api_keys: totalApiKeys.count,
      feature_flags: featureFlags.count,
      feature_overrides: featureOverrides.count,
      waitlist: waitlistStats,
    },
    recent_activity: {
      last_7_days: {
        new_users: recentUsers.count,
        new_apps: recentApps.count,
      },
    },
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      railway_environment: process.env.RAILWAY_ENVIRONMENT || null,
    },
  });
});

// ============================================================================
// Quick Actions
// ============================================================================

/**
 * POST /api/admin/upgrade-user
 * Quick endpoint to upgrade a user by email
 * 
 * Request body:
 * - email: User email
 * - plan: Target plan (FREE, HOBBY, PRO, BUSINESS)
 */
admin.post('/upgrade-user', async (c) => {
  const { email, plan } = await c.req.json();
  
  if (!email || !plan) {
    return c.json({ error: 'email and plan are required' }, 400);
  }
  
  if (!['FREE', 'HOBBY', 'PRO', 'BUSINESS'].includes(plan)) {
    return c.json({ error: 'Invalid plan. Must be FREE, HOBBY, PRO, or BUSINESS' }, 400);
  }
  
  const db = getDatabase();
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  const oldPlan = user.plan;
  
  db.prepare('UPDATE users SET plan = ?, updated_at = ? WHERE email = ?')
    .run(plan, new Date().toISOString(), email);
  
  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      old_plan: oldPlan,
      new_plan: plan,
    },
  });
});

export default admin;
/**
 * Admin User Management Routes for OnHyper.io
 * 
 * Provides admin endpoints for managing user accounts.
 * All routes require X-Admin-Key header matching ONHYPER_MASTER_KEY.
 * 
 * @see src/middleware/auth.ts - requireAdminAuth implementation
 */

import { Hono } from 'hono';
import { getDatabase } from '../lib/db.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { updateUserPlan, getUserById, getUserByEmail } from '../lib/users.js';
import { PLAN_TIER_NAMES } from '../config.js';

export const adminUsers = new Hono();

// All admin routes require admin auth
adminUsers.use('*', requireAdminAuth);

/**
 * List all users (paginated)
 * GET /api/admin/users
 */
adminUsers.get('/', async (c) => {
  const db = getDatabase();
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search');

  let query = 'SELECT id, email, plan, created_at, updated_at FROM users';
  const params: (string | number)[] = [];

  if (search) {
    query += ' WHERE email LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const users = db.prepare(query).all(...params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM users';
  if (search) {
    countQuery += ' WHERE email LIKE ?';
  }
  const countResult = db.prepare(countQuery).get(...(search ? [`%${search}%`] : [])) as { count: number };

  return c.json({
    users,
    pagination: {
      total: countResult.count,
      limit,
      offset,
      hasMore: offset + limit < countResult.count
    }
  });
});

/**
 * Get a specific user by ID
 * GET /api/admin/users/:userId
 */
adminUsers.get('/:userId', async (c) => {
  const userId = c.req.param('userId');
  const user = getUserById(userId);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Get additional stats
  const db = getDatabase();
  const appCount = db.prepare('SELECT COUNT(*) as count FROM apps WHERE user_id = ?').get(userId) as { count: number };
  const secretCount = db.prepare('SELECT COUNT(*) as count FROM secrets WHERE user_id = ?').get(userId) as { count: number };

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      created_at: user.created_at,
      updated_at: user.updated_at,
      stats: {
        apps: appCount.count,
        secrets: secretCount.count
      }
    }
  });
});

/**
 * Update a user's plan
 * PATCH /api/admin/users/:userId/plan
 * 
 * Body: { "plan": "FREE" | "HOBBY" | "PRO" | "BUSINESS" | "INTERNAL" }
 */
adminUsers.patch('/:userId/plan', async (c) => {
  const userId = c.req.param('userId');
  
  // Parse request body
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { plan } = body;

  // Validate plan
  if (!plan || !PLAN_TIER_NAMES.includes(plan)) {
    return c.json({ 
      error: 'Invalid plan',
      validPlans: PLAN_TIER_NAMES 
    }, 400);
  }

  // Check user exists
  const user = getUserById(userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const previousPlan = user.plan;

  // Update plan
  updateUserPlan(userId, plan);

  // Log the change
  console.log(`[ADMIN] Plan updated: ${user.email} (${userId}) ${previousPlan} → ${plan}`);

  return c.json({
    success: true,
    user: {
      id: userId,
      email: user.email,
      previousPlan,
      newPlan: plan
    }
  });
});

/**
 * Update a user's plan by email (convenience endpoint)
 * PATCH /api/admin/users/by-email/:email/plan
 * 
 * Body: { "plan": "FREE" | "HOBBY" | "PRO" | "BUSINESS" | "INTERNAL" }
 */
adminUsers.patch('/by-email/:email/plan', async (c) => {
  const email = decodeURIComponent(c.req.param('email'));
  
  // Parse request body
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { plan } = body;

  // Validate plan
  if (!plan || !PLAN_TIER_NAMES.includes(plan)) {
    return c.json({ 
      error: 'Invalid plan',
      validPlans: PLAN_TIER_NAMES 
    }, 400);
  }

  // Find user by email
  const user = getUserByEmail(email);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const previousPlan = user.plan;

  // Update plan
  updateUserPlan(user.id, plan);

  // Log the change
  console.log(`[ADMIN] Plan updated: ${email} (${user.id}) ${previousPlan} → ${plan}`);

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      previousPlan,
      newPlan: plan
    }
  });
});

/**
 * Get available plans
 * GET /api/admin/plans
 */
adminUsers.get('/plans/list', async (c) => {
  return c.json({
    plans: PLAN_TIER_NAMES.map(name => ({
      name,
      description: getPlanDescription(name)
    }))
  });
});

function getPlanDescription(plan: string): string {
  const descriptions: Record<string, string> = {
    FREE: 'Free tier - 1000 requests/day, 3 apps, 5 secrets',
    HOBBY: 'Hobby tier - 3000 requests/day, 10 apps, 20 secrets',
    PRO: 'Pro tier - 10000 requests/day, 50 apps, 50 secrets',
    BUSINESS: 'Business tier - 100000 requests/day, unlimited apps and secrets',
    INTERNAL: 'Internal tier - Unlimited everything (for team use only)'
  };
  return descriptions[plan] || 'Unknown plan';
}
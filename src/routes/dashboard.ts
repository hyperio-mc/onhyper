/**
 * Dashboard routes for OnHyper.io
 * 
 * Endpoints:
 * - GET /api/dashboard/stats - Get dashboard statistics for the authenticated user
 */

import { Hono } from 'hono';
import { getAppCount } from '../lib/apps.js';
import { getSecretCount } from '../lib/secrets.js';
import { getTodayUsageCount } from '../lib/usage.js';
import { getAuthUser } from '../middleware/auth.js';

const dashboard = new Hono();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics for the authenticated user
 */
dashboard.get('/stats', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const [appCount, keysConfigured, requestCount] = await Promise.all([
    Promise.resolve(getAppCount(user.userId)),
    Promise.resolve(getSecretCount(user.userId)),
    Promise.resolve(getTodayUsageCount(user.userId)),
  ]);
  
  return c.json({
    appCount,
    requestCount,
    keysConfigured,
  });
});

export { dashboard };
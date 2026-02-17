/**
 * Dashboard Routes for OnHyper.io
 * 
 * Provides aggregate statistics for the user dashboard.
 * Aggregates data from apps, secrets, and usage tables.
 * 
 * ## Endpoints
 * 
 * ### GET /api/dashboard/stats
 * Get statistics for the authenticated user's dashboard.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * {
 *   "appCount": 5,
 *   "requestCount": 1234,
 *   "keysConfigured": 3
 * }
 * ```
 * 
 * **Fields:**
 * - `appCount` - Number of published apps
 * - `requestCount` - API requests made today
 * - `keysConfigured` - Number of secrets stored
 * 
 * **Errors:**
 * - 401: Not authenticated
 * 
 * ## Usage
 * 
 * ```javascript
 * // Fetch dashboard stats
 * const response = await fetch('/api/dashboard/stats', {
 *   headers: { 'Authorization': `Bearer ${token}` }
 * });
 * const stats = await response.json();
 * 
 * // Display in UI
 * document.getElementById('stat-apps').textContent = stats.appCount;
 * document.getElementById('stat-requests').textContent = stats.requestCount;
 * document.getElementById('stat-keys').textContent = stats.keysConfigured;
 * ```
 * 
 * @module routes/dashboard
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
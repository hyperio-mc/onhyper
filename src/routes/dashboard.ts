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
import { listApiKeysByUser, createApiKey } from '../lib/users.js';

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

/**
 * GET /api/dashboard/api-keys
 * Get the user's API keys (for programmatic access)
 */
dashboard.get('/api-keys', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const keys = listApiKeysByUser(user.userId);
  
  // Mask keys for security (show first 12 chars + ...)
  const maskedKeys = keys.map(k => ({
    id: k.id,
    key: k.key.substring(0, 12) + '...' + k.key.substring(k.key.length - 8),
    fullKey: k.key, // Include full key for copy functionality
    plan: k.plan,
    createdAt: k.created_at
  }));
  
  return c.json({ keys: maskedKeys });
});

/**
 * POST /api/dashboard/api-keys
 * Generate a new API key for the user
 */
dashboard.post('/api-keys', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  // Get user plan from JWT payload
  const plan = user.plan || 'FREE';
  
  // Create new API key
  const key = await createApiKey(user.userId, plan);
  
  // Track event
  console.log(`[Dashboard] API key generated for user ${user.userId}`);
  
  return c.json({ 
    key,
    message: 'API key generated. Copy it now - it won\'t be shown again in full.'
  });
});

export { dashboard };
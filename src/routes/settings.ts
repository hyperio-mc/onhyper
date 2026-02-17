/**
 * Settings Routes for OnHyper.io
 * 
 * Manages user settings for features like self-API access.
 * 
 * ## Endpoints
 * 
 * ### GET /api/settings
 * Get current user's settings.
 * Requires authentication (JWT or API key).
 * 
 * ### PUT /api/settings
 * Update user settings.
 * Requires authentication.
 * Body: { onhyper_api_enabled: boolean }
 */

import { Hono } from 'hono';
import { getUserSettings, setUserSettings } from '../lib/db.js';
import { verifyToken } from '../lib/users.js';
import { getApiKeyByKey } from '../lib/users.js';

const settings = new Hono();

/**
 * Identify user from request
 */
function identifyUser(c: any): { userId: string } | null {
  const authHeader = c.req.header('authorization');
  const apiKeyHeader = c.req.header('x-api-key');
  
  // JWT token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      return { userId: payload.userId };
    }
  }
  
  // API key
  if (apiKeyHeader?.startsWith('oh_live_')) {
    const keyRecord = getApiKeyByKey(apiKeyHeader);
    if (keyRecord) {
      return { userId: keyRecord.user_id };
    }
  }
  
  return null;
}

/**
 * GET /api/settings
 */
settings.get('/', async (c) => {
  const identity = identifyUser(c);
  
  if (!identity) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  const userSettings = getUserSettings(identity.userId);
  
  return c.json({
    onhyper_api_enabled: userSettings?.onhyper_api_enabled === 1,
  });
});

/**
 * PUT /api/settings
 */
settings.put('/', async (c) => {
  const identity = identifyUser(c);
  
  if (!identity) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  try {
    const body = await c.req.json();
    
    if (typeof body.onhyper_api_enabled !== 'boolean') {
      return c.json({ error: 'onhyper_api_enabled must be a boolean' }, 400);
    }
    
    setUserSettings(identity.userId, {
      onhyper_api_enabled: body.onhyper_api_enabled,
    });
    
    return c.json({
      success: true,
      onhyper_api_enabled: body.onhyper_api_enabled,
    });
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400);
  }
});

export { settings };

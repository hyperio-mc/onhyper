/**
 * Secrets management routes for OnHyper.io
 * 
 * Endpoints:
 * - GET /api/secrets - List user's secrets (masked)
 * - POST /api/secrets - Add a new secret
 * - DELETE /api/secrets/:name - Delete a secret
 */

import { Hono } from 'hono';
import { storeSecret, listSecrets, deleteSecret, hasSecret, getSecretCount } from '../lib/secrets.js';
import { getAuthUser } from '../middleware/auth.js';
import { config } from '../config.js';

const secrets = new Hono();

/**
 * GET /api/secrets
 * List all secrets for the authenticated user (values are masked)
 */
secrets.get('/', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const secretList = listSecrets(user.userId);
  
  return c.json({
    secrets: secretList,
    count: secretList.length,
  });
});

/**
 * POST /api/secrets
 * Add a new secret
 */
secrets.post('/', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { name, value } = body;
    
    if (!name || !value) {
      return c.json({ error: 'Secret name and value are required' }, 400);
    }
    
    // Validate name format
    const normalizedName = name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (normalizedName.length < 3 || normalizedName.length > 64) {
      return c.json({ error: 'Secret name must be 3-64 characters' }, 400);
    }
    
    // Check plan limits
    const plan = user.plan as keyof typeof config.plans;
    const planConfig = config.plans[plan] || config.plans.FREE;
    const currentCount = getSecretCount(user.userId);
    
    if (planConfig.maxSecrets > 0 && currentCount >= planConfig.maxSecrets) {
      return c.json({
        error: 'Secret limit reached for your plan',
        current: currentCount,
        limit: planConfig.maxSecrets,
        plan: user.plan,
      }, 403);
    }
    
    // Store the secret
    const secret = await storeSecret(user.userId, name, value);
    
    return c.json({
      id: secret.id,
      name: secret.name,
      created: true,
      // Note: We don't return the value for security
      message: 'Secret stored successfully. The value cannot be retrieved after creation.',
    }, 201);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store secret';
    
    if (message.includes('already exists')) {
      return c.json({ error: message }, 409);
    }
    
    return c.json({ error: message }, 400);
  }
});

/**
 * DELETE /api/secrets/:name
 * Delete a secret by name
 */
secrets.delete('/:name', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const name = c.req.param('name');
  
  if (!name) {
    return c.json({ error: 'Secret name is required' }, 400);
  }
  
  const deleted = deleteSecret(user.userId, name);
  
  if (!deleted) {
    return c.json({ error: `Secret "${name}" not found` }, 404);
  }
  
  return c.json({
    deleted: true,
    name: name.toUpperCase(),
  });
});

/**
 * GET /api/secrets/check/:name
 * Check if a secret exists (without revealing its value)
 */
secrets.get('/check/:name', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const name = c.req.param('name');
  const exists = hasSecret(user.userId, name);
  
  return c.json({
    name: name.toUpperCase(),
    exists,
  });
});

export { secrets };
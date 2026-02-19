/**
 * Secrets Management Routes for OnHyper.io
 * 
 * Secure storage and management of API keys and other secrets.
 * Secrets are encrypted at rest and values are never returned after creation.
 * 
 * ## Security Model
 * 
 * - Secrets are encrypted with AES-256-GCM before storage
 * - Each secret has a unique salt for key derivation
 * - Values are **never** returned via API (only shown once at creation)
 * - Names are normalized to uppercase with underscores
 * 
 * ## Endpoints
 * 
 * ### GET /api/secrets
 * List all secrets for the authenticated user.
 * Values are masked with `••••••••` placeholders.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * {
 *   "secrets": [
 *     {
 *       "id": "uuid",
 *       "name": "SCOUT_API_KEY",
 *       "masked": "••••••••••••••••",
 *       "created_at": "2024-01-15T..."
 *     }
 *   ],
 *   "count": 1
 * }
 * ```
 * 
 * ### POST /api/secrets
 * Store a new secret. The value is encrypted and cannot be retrieved.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Request Body:**
 * ```json
 * {
 *   "name": "SCOUT_API_KEY",
 *   "value": "sk-ant-api03-xxxxxxxxxxxx"
 * }
 * ```
 * 
 * **Response (201):**
 * ```json
 * {
 *   "id": "uuid",
 *   "name": "SCOUT_API_KEY",
 *   "created": true,
 *   "message": "Secret stored successfully. The value cannot be retrieved after creation."
 * }
 * ```
 * 
 * **Errors:**
 * - 400: Missing name or value, invalid name format
 * - 401: Not authenticated
 * - 403: Secret limit reached for plan
 * - 409: Secret with this name already exists
 * 
 * ### DELETE /api/secrets/:name
 * Delete a secret by name.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * { "deleted": true, "name": "SCOUT_API_KEY" }
 * ```
 * 
 * **Errors:**
 * - 401: Not authenticated
 * - 404: Secret not found
 * 
 * ### GET /api/secrets/check/:name
 * Check if a secret exists without revealing its value.
 * Useful for validating proxy readiness.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * { "name": "SCOUT_API_KEY", "exists": true }
 * ```
 * 
 * ## Name Convention
 * 
 * Secret names are automatically normalized:
 * - Converted to uppercase
 * - Non-alphanumeric characters replaced with underscores
 * - Must be 3-64 characters
 * 
 * Example: `scout-api-key` → `SCOUT_API_KEY`
 * 
 * ## Plan Limits
 * 
 * | Plan | Max Secrets |
 * |------|-------------|
 * | FREE | 5 |
 * | HOBBY | 20 |
 * | PRO | 50 |
 * | BUSINESS | Unlimited |
 * 
 * @module routes/secrets
 */

import { Hono } from 'hono';
import { storeSecret, listSecrets, deleteSecret, hasSecret, getSecretCount, createCustomSecret, listCustomSecrets, getCustomSecret, deleteCustomSecret, updateCustomSecret } from '../lib/secrets.js';
import { getAuthUser } from '../middleware/auth.js';
import { config } from '../config.js';
import { logAuditEvent } from '../lib/db.js';

const secrets = new Hono();

/**
 * Extract client IP and user agent from request
 */
function getRequestMetadata(c: Parameters<typeof getAuthUser>[0]): { ipAddress: string | undefined; userAgent: string | undefined } {
  const forwardedFor = c.req.header('x-forwarded-for');
  const realIp = c.req.header('x-real-ip');
  const ip = forwardedFor?.split(',')[0].trim() || realIp || undefined;
  const userAgent = c.req.header('user-agent') || undefined;
  return { ipAddress: ip, userAgent };
}

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
    
    // Audit log
    const metadata = getRequestMetadata(c);
    logAuditEvent({
      userId: user.userId,
      action: 'secret_create',
      resourceType: 'secret',
      resourceId: secret.id,
      details: { secret_name: secret.name },
      ...metadata,
    });
    
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
  
  // Audit log
  const metadata = getRequestMetadata(c);
  logAuditEvent({
    userId: user.userId,
    action: 'secret_delete',
    resourceType: 'secret',
    details: { secret_name: name.toUpperCase() },
    ...metadata,
  });
  
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

// ============================================================================
// CUSTOM SECRETS (User-defined API backends)
// ============================================================================

/**
 * GET /api/secrets/custom
 * List all custom secrets for the authenticated user
 */
secrets.get('/custom', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const customSecrets = listCustomSecrets(user.userId);
  
  return c.json({
    secrets: customSecrets,
    count: customSecrets.length,
  });
});

/**
 * POST /api/secrets/custom
 * Create a new custom secret
 */
secrets.post('/custom', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { name, base_url, api_key, auth_type, auth_header } = body;
    
    if (!name || !base_url || !api_key || !auth_type) {
      return c.json({ error: 'Name, base_url, api_key, and auth_type are required' }, 400);
    }
    
    if (auth_type !== 'bearer' && auth_type !== 'custom') {
      return c.json({ error: 'auth_type must be "bearer" or "custom"' }, 400);
    }
    
    if (auth_type === 'custom' && !auth_header) {
      return c.json({ error: 'auth_header is required for custom auth type' }, 400);
    }
    
    // Check total secrets limit (regular + custom)
    const plan = user.plan as keyof typeof config.plans;
    const planConfig = config.plans[plan] || config.plans.FREE;
    const currentCount = getSecretCount(user.userId) + listCustomSecrets(user.userId).length;
    
    if (planConfig.maxSecrets > 0 && currentCount >= planConfig.maxSecrets) {
      return c.json({
        error: 'Secret limit reached for your plan',
        current: currentCount,
        limit: planConfig.maxSecrets,
        plan: user.plan,
      }, 403);
    }
    
    const secret = await createCustomSecret(
      user.userId,
      name,
      base_url,
      api_key,
      auth_type,
      auth_header
    );
    
    // Audit log
    const metadata = getRequestMetadata(c);
    logAuditEvent({
      userId: user.userId,
      action: 'secret_create',
      resourceType: 'custom_secret',
      resourceId: secret.id,
      details: { secret_name: secret.name, base_url: secret.base_url },
      ...metadata,
    });
    
    return c.json({
      id: secret.id,
      name: secret.name,
      base_url: secret.base_url,
      auth_type: secret.auth_type,
      auth_header: secret.auth_header,
      created: true,
      message: 'Custom API created successfully. Use /proxy/custom/' + secret.id + '/... to make requests.',
    }, 201);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create custom secret';
    
    if (message.includes('already exists')) {
      return c.json({ error: message }, 409);
    }
    
    return c.json({ error: message }, 400);
  }
});

/**
 * GET /api/secrets/custom/:id
 * Get a custom secret by ID (metadata only, no API key)
 */
secrets.get('/custom/:id', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const id = c.req.param('id');
  const secret = getCustomSecret(user.userId, id);
  
  if (!secret) {
    return c.json({ error: 'Custom secret not found' }, 404);
  }
  
  return c.json(secret);
});

/**
 * PUT /api/secrets/custom/:id
 * Update a custom secret
 */
secrets.put('/custom/:id', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const id = c.req.param('id');
  
  try {
    const body = await c.req.json();
    const { name, base_url, api_key, auth_type, auth_header } = body;
    
    // Validate auth_type if provided
    if (auth_type && auth_type !== 'bearer' && auth_type !== 'custom') {
      return c.json({ error: 'auth_type must be "bearer" or "custom"' }, 400);
    }
    
    if (auth_type === 'custom' && !auth_header) {
      return c.json({ error: 'auth_header is required for custom auth type' }, 400);
    }
    
    const secret = await updateCustomSecret(user.userId, id, {
      name,
      base_url,
      api_key,
      auth_type,
      auth_header: auth_header !== undefined ? auth_header : undefined,
    });
    
    // Audit log
    const metadata = getRequestMetadata(c);
    logAuditEvent({
      userId: user.userId,
      action: 'secret_update',
      resourceType: 'custom_secret',
      resourceId: id,
      details: { secret_name: secret.name },
      ...metadata,
    });
    
    return c.json({
      id: secret.id,
      name: secret.name,
      base_url: secret.base_url,
      auth_type: secret.auth_type,
      auth_header: secret.auth_header,
      updated: true,
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update custom secret';
    
    if (message.includes('not found')) {
      return c.json({ error: message }, 404);
    }
    
    if (message.includes('already exists')) {
      return c.json({ error: message }, 409);
    }
    
    return c.json({ error: message }, 400);
  }
});

/**
 * DELETE /api/secrets/custom/:id
 * Delete a custom secret
 */
secrets.delete('/custom/:id', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const id = c.req.param('id');
  const deleted = deleteCustomSecret(user.userId, id);
  
  if (!deleted) {
    return c.json({ error: 'Custom secret not found' }, 404);
  }
  
  // Audit log
  const metadata = getRequestMetadata(c);
  logAuditEvent({
    userId: user.userId,
    action: 'secret_delete',
    resourceType: 'custom_secret',
    resourceId: id,
    details: { secret_id: id },
    ...metadata,
  });
  
  return c.json({
    deleted: true,
    id,
  });
});

export { secrets };
/**
 * App management routes for OnHyper.io
 * 
 * Endpoints:
 * - GET /api/apps - List user's apps
 * - POST /api/apps - Create a new app
 * - GET /api/apps/:id - Get app details
 * - PUT /api/apps/:id - Update an app
 * - DELETE /api/apps/:id - Delete an app
 */

import { Hono } from 'hono';
import { createApp, getAppById, listAppsByUser, updateApp, deleteApp, getAppCount } from '../lib/apps.js';
import { getAuthUser } from '../middleware/auth.js';
import { config } from '../config.js';

const apps = new Hono();

/**
 * GET /api/apps
 * List all apps for the authenticated user
 */
apps.get('/', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const appList = listAppsByUser(user.userId);
  
  return c.json({
    apps: appList.map(app => ({
      id: app.id,
      name: app.name,
      slug: app.slug,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
    })),
    count: appList.length,
  });
});

/**
 * POST /api/apps
 * Create a new app
 */
apps.post('/', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { name, html, css, js } = body;
    
    if (!name || name.trim().length === 0) {
      return c.json({ error: 'App name is required' }, 400);
    }
    
    // Check plan limits
    const plan = user.plan as keyof typeof config.plans;
    const planConfig = config.plans[plan] || config.plans.FREE;
    const currentCount = getAppCount(user.userId);
    
    if (planConfig.maxApps > 0 && currentCount >= planConfig.maxApps) {
      return c.json({
        error: 'App limit reached for your plan',
        current: currentCount,
        limit: planConfig.maxApps,
        plan: user.plan,
      }, 403);
    }
    
    // Create the app
    const app = await createApp(user.userId, name, { html, css, js });
    
    const baseUrl = config.baseUrl;
    
    return c.json({
      id: app.id,
      name: app.name,
      slug: app.slug,
      url: `${baseUrl}/a/${app.slug}`,
      createdAt: app.created_at,
    }, 201);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create app';
    return c.json({ error: message }, 400);
  }
});

/**
 * GET /api/apps/:id
 * Get app details
 */
apps.get('/:id', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const id = c.req.param('id');
  const app = getAppById(id);
  
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }
  
  // Verify ownership
  if (app.user_id !== user.userId) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  const baseUrl = config.baseUrl;
  
  return c.json({
    id: app.id,
    name: app.name,
    slug: app.slug,
    html: app.html,
    css: app.css,
    js: app.js,
    url: `${baseUrl}/a/${app.slug}`,
    createdAt: app.created_at,
    updatedAt: app.updated_at,
  });
});

/**
 * PUT /api/apps/:id
 * Update an app
 */
apps.put('/:id', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const id = c.req.param('id');
  
  try {
    const body = await c.req.json();
    const { name, html, css, js } = body;
    
    const app = await updateApp(id, user.userId, { name, html, css, js });
    
    if (!app) {
      return c.json({ error: 'App not found or access denied' }, 404);
    }
    
    const baseUrl = config.baseUrl;
    
    return c.json({
      id: app.id,
      name: app.name,
      slug: app.slug,
      url: `${baseUrl}/a/${app.slug}`,
      updatedAt: app.updated_at,
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update app';
    return c.json({ error: message }, 400);
  }
});

/**
 * DELETE /api/apps/:id
 * Delete an app
 */
apps.delete('/:id', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const id = c.req.param('id');
  
  const deleted = await deleteApp(id, user.userId);
  
  if (!deleted) {
    return c.json({ error: 'App not found or access denied' }, 404);
  }
  
  return c.json({ deleted: true });
});

export { apps };
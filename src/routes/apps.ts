/**
 * App Management Routes for OnHyper.io
 * 
 * CRUD operations for user apps. Apps are published web applications
 * that can call external APIs through the proxy service.
 * 
 * ## Endpoints
 * 
 * ### GET /api/apps
 * List all apps for the authenticated user.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * {
 *   "apps": [
 *     {
 *       "id": "uuid",
 *       "name": "My App",
 *       "slug": "my-app-abc123",
 *       "createdAt": "2024-01-15T...",
 *       "updatedAt": "2024-01-15T..."
 *     }
 *   ],
 *   "count": 1
 * }
 * ```
 * 
 * ### POST /api/apps
 * Create a new app.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Request Body:**
 * ```json
 * {
 *   "name": "My App",
 *   "html": "<div>Hello World</div>",
 *   "css": ".container { color: blue; }",
 *   "js": "console.log('hi');"
 * }
 * ```
 * 
 * **Response (201):**
 * ```json
 * {
 *   "id": "uuid",
 *   "name": "My App",
 *   "slug": "my-app-abc123",
 *   "url": "https://onhyper.io/a/my-app-abc123",
 *   "createdAt": "2024-01-15T..."
 * }
 * ```
 * 
 * **Errors:**
 * - 400: Invalid input or name missing
 * - 401: Not authenticated
 * - 403: App limit reached for plan
 * 
 * ### GET /api/apps/:id
 * Get app details including full HTML/CSS/JS content.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * {
 *   "id": "uuid",
 *   "name": "My App",
 *   "slug": "my-app-abc123",
 *   "html": "<div>...</div>",
 *   "css": "...",
 *   "js": "...",
 *   "url": "https://onhyper.io/a/my-app-abc123",
 *   "createdAt": "...",
 *   "updatedAt": "..."
 * }
 * ```
 * 
 * **Errors:**
 * - 401: Not authenticated
 * - 403: Access denied (not owner)
 * - 404: App not found
 * 
 * ### PUT /api/apps/:id
 * Update an existing app.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Request Body:** (all fields optional)
 * ```json
 * { "name": "New Name", "html": "...", "css": "...", "js": "..." }
 * ```
 * 
 * **Response (200):**
 * ```json
 * { "id": "uuid", "name": "New Name", "slug": "...", "url": "...", "updatedAt": "..." }
 * ```
 * 
 * ### DELETE /api/apps/:id
 * Delete an app permanently.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Response (200):**
 * ```json
 * { "deleted": true }
 * ```
 * 
 * ### POST /api/apps/:id/publish
 * Publish an app with an optional custom subdomain.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Request Body:**
 * ```json
 * { "subdomain": "my-app" }
 * ```
 * 
 * The `subdomain` field is optional. If not provided, only the path-based URL is returned.
 * 
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "urls": {
 *     "path": "https://onhyper.io/a/my-app-abc123",
 *     "subdomain": "my-app.onhyper.io"
 *   }
 * }
 * ```
 * 
 * **Errors:**
 * - 400: Invalid subdomain format or validation failed
 * - 401: Not authenticated
 * - 403: Access denied (not owner)
 * - 404: App not found
 * - 409: Subdomain already claimed by another user
 * 
 * **Behavior:**
 * - If subdomain is available: claims it for the user
 * - If subdomain is owned by this user: reassigns to this app (allowed)
 * - If subdomain is owned by another user: error (409)
 * - Reserved subdomains (api, www, admin, etc.) cannot be claimed
 * 
 * ## Plan Limits
 * 
 * | Plan | Max Apps |
 * |------|----------|
 * | FREE | 3 |
 * | HOBBY | 10 |
 * | PRO | 50 |
 * | BUSINESS | Unlimited |
 * 
 * @module routes/apps
 */

import { Hono } from 'hono';
import { createApp, getAppById, listAppsByUser, updateApp, deleteApp, getAppCount, updateAppSubdomain } from '../lib/apps.js';
import { getAuthUser } from '../middleware/auth.js';
import { config } from '../config.js';
import {
  validateSubdomain,
  isReserved,
  isSubdomainAvailable,
  getSubdomainOwner,
  releaseSubdomain,
  claimSubdomain,
} from '../lib/subdomains.js';
import { getAppAnalytics, getUserAppsWithAnalytics } from '../lib/appAnalytics.js';
import { logAuditEvent } from '../lib/db.js';
import { isFeatureEnabled } from '../lib/features.js';

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
 * Generate a subdomain candidate from app name.
 * Similar to slug generation but for subdomains.
 * Returns null if the name can't produce a valid subdomain.
 */
function generateSubdomainFromName(name: string): string | null {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
  
  // Must be at least 3 characters
  if (slug.length < 3) {
    return null;
  }
  
  return slug;
}

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
      subdomain: app.subdomain,
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
    
    // Attempt to auto-claim a subdomain for the app
    let subdomainUrl: string | null = null;
    const subdomainCandidate = generateSubdomainFromName(name);
    
    if (subdomainCandidate) {
      // Check if subdomain is available (not reserved, not claimed)
      const reserved = isReserved(subdomainCandidate);
      const available = reserved ? false : await isSubdomainAvailable(subdomainCandidate);
      
      if (available) {
        // Attempt to claim the subdomain
        const claimResult = await claimSubdomain(user.userId, subdomainCandidate, app.id);
        
        if (claimResult.success) {
          // Update the app with the subdomain
          await updateAppSubdomain(app.id, user.userId, subdomainCandidate);
          subdomainUrl = `${subdomainCandidate}.onhyper.io`;
        }
      }
    }
    
    // Audit log
    const metadata = getRequestMetadata(c);
    logAuditEvent({
      userId: user.userId,
      action: 'app_create',
      resourceType: 'app',
      resourceId: app.id,
      details: { 
        app_name: app.name, 
        app_slug: app.slug,
        auto_subdomain: subdomainCandidate || null,
        subdomain_claimed: subdomainUrl !== null,
      },
      ...metadata,
    });
    
    const baseUrl = config.baseUrl;
    
    return c.json({
      id: app.id,
      name: app.name,
      slug: app.slug,
      url: `${baseUrl}/a/${app.slug}`,
      subdomain: subdomainUrl,
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
  
  // Build URLs - subdomain is primary if available
  const pathUrl = `${baseUrl}/a/${app.slug}`;
  const subdomainUrl = app.subdomain ? `${app.subdomain}.onhyper.io` : null;
  
  return c.json({
    id: app.id,
    name: app.name,
    slug: app.slug,
    subdomain: app.subdomain,
    html: app.html,
    css: app.css,
    js: app.js,
    url: subdomainUrl || pathUrl,
    urls: {
      path: pathUrl,
      subdomain: subdomainUrl,
      primary: subdomainUrl || pathUrl,
    },
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
    
    // Audit log
    const metadata = getRequestMetadata(c);
    logAuditEvent({
      userId: user.userId,
      action: 'app_update',
      resourceType: 'app',
      resourceId: app.id,
      details: { app_name: app.name, app_slug: app.slug },
      ...metadata,
    });
    
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
  
  // Audit log
  const metadata = getRequestMetadata(c);
  logAuditEvent({
    userId: user.userId,
    action: 'app_delete',
    resourceType: 'app',
    resourceId: id,
    details: { app_id: id },
    ...metadata,
  });
  
  return c.json({ deleted: true });
});

/**
 * Generate a random suffix for subdomain collision resolution
 */
function generateRandomSuffix(): string {
  return Math.random().toString(36).substring(2, 6); // 4 char random suffix
}

/**
 * Attempt to claim a subdomain with automatic fallback
 * Tries the preferred subdomain first, then with random suffixes
 */
async function claimSubdomainWithFallback(
  userId: string,
  appId: string,
  preferredSubdomain: string,
  maxAttempts: number = 3
): Promise<{ success: boolean; subdomain?: string; error?: string }> {
  let subdomain = preferredSubdomain;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Validate subdomain format
    const validation = validateSubdomain(subdomain);
    if (!validation.valid) {
      // If validation fails, try with a cleaner version
      if (attempt === 0) {
        const cleaned = generateSubdomainFromName(subdomain);
        subdomain = cleaned && cleaned.length >= 3 ? cleaned : `app-${generateRandomSuffix()}`;
        continue;
      }
      return { success: false, error: validation.error };
    }
    
    // Check if subdomain is reserved
    if (isReserved(subdomain)) {
      // Try with a suffix to avoid reserved names
      subdomain = `${preferredSubdomain}-${generateRandomSuffix()}`;
      continue;
    }
    
    // Check availability
    const available = await isSubdomainAvailable(subdomain);
    
    if (available) {
      // Try to claim it
      const claimResult = await claimSubdomainForApp(userId, subdomain, appId);
      if (claimResult.success) {
        return { success: true, subdomain };
      }
      // Race condition - someone else claimed it, try with suffix
    }
    
    // Try with a random suffix for next attempt
    subdomain = `${preferredSubdomain}-${generateRandomSuffix()}`;
  }
  
  return { success: false, error: 'Could not claim a subdomain after multiple attempts' };
}

/**
 * POST /api/apps/:id/publish
 * Publish an app with automatic subdomain assignment
 * 
 * New behavior (task-108):
 * - Automatically generates a subdomain from the app name
 * - Attempts to claim the subdomain, with fallbacks for collisions
 * - Falls back to path-based URL only if subdomain claim fails
 * 
 * Request Body (optional):
 * - subdomain: string - Override the auto-generated subdomain
 * 
 * Response:
 * - urls.path: string - Path-based URL (/a/slug)
 * - urls.subdomain: string | null - Subdomain URL if claimed successfully
 * - urls.primary: string - The preferred URL (subdomain if available, else path)
 */
apps.post('/:id/publish', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const appId = c.req.param('id');
  const app = getAppById(appId);
  
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }
  
  // Verify ownership
  if (app.user_id !== user.userId) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  try {
    const body = await c.req.json().catch(() => ({})) as { subdomain?: string };
    const { subdomain: requestedSubdomain } = body;
    
    // Generate preferred subdomain from app name (or use slug as fallback)
    const preferredSubdomain = requestedSubdomain || 
      generateSubdomainFromName(app.name) || 
      app.slug.replace(/-[a-z0-9]{8}$/, ''); // Remove UUID suffix from slug
    
    // Check if the app already has a subdomain assigned
    const currentSubdomain = app.subdomain;
    
    // If user explicitly requested a specific subdomain, validate and try to claim it
    if (requestedSubdomain) {
      const normalizedSubdomain = requestedSubdomain.toLowerCase();
      
      // Validate subdomain format
      const validation = validateSubdomain(normalizedSubdomain);
      if (!validation.valid) {
        return c.json({ 
          success: false, 
          error: validation.error 
        }, 400);
      }
      
      // Check if subdomain is reserved
      if (isReserved(normalizedSubdomain)) {
        return c.json({ 
          success: false, 
          error: 'This subdomain is reserved and cannot be claimed' 
        }, 400);
      }
      
      // Check feature flag for short subdomains (< 6 chars)
      if (normalizedSubdomain.length < 6) {
        const shortSubdomainFeature = await isFeatureEnabled('short_subdomains', user.userId, { subdomain: normalizedSubdomain });
        if (!shortSubdomainFeature.enabled) {
          return c.json({
            success: false,
            error: 'Short subdomains (fewer than 6 characters) require a BUSINESS plan',
            hint: `Subdomain "${normalizedSubdomain}" has ${normalizedSubdomain.length} characters. Upgrade to BUSINESS for short subdomains.`,
            subdomain_length: normalizedSubdomain.length,
          }, 403);
        }
      }
      
      // Check who owns this subdomain
      const subdomainOwner = await getSubdomainOwner(normalizedSubdomain);
      
      // Case 1: Subdomain already claimed by another user
      if (subdomainOwner && subdomainOwner !== user.userId) {
        return c.json({ 
          success: false, 
          error: 'This subdomain is already claimed by another user' 
        }, 409);
      }
      
      // Case 2: Subdomain already claimed by this user (reassignment)
      if (subdomainOwner === user.userId) {
        // Release the existing subdomain assignment
        await releaseSubdomain(user.userId, normalizedSubdomain);
      }
      
      // Claim the subdomain for this app
      const claimResult = await claimSubdomainForApp(user.userId, normalizedSubdomain, appId);
      
      if (!claimResult.success) {
        return c.json({ 
          success: false, 
          error: claimResult.error 
        }, 400);
      }
      
      // Update app's subdomain field
      await updateAppSubdomain(appId, user.userId, normalizedSubdomain);
      
      // Audit log
      const metadata = getRequestMetadata(c);
      logAuditEvent({
        userId: user.userId,
        action: 'app_publish',
        resourceType: 'app',
        resourceId: appId,
        details: { app_name: app.name, app_slug: app.slug, subdomain: normalizedSubdomain },
        ...metadata,
      });
      
      return c.json({
        success: true,
        urls: {
          path: `${config.baseUrl}/a/${app.slug}`,
          subdomain: `${normalizedSubdomain}.onhyper.io`,
          primary: `${normalizedSubdomain}.onhyper.io`,
        },
      });
    }
    
    // Auto-generate and claim subdomain
    // First, check if we should release any existing subdomain for this app
    if (currentSubdomain) {
      // App already has a subdomain, keep it unless user explicitly requests a change
      return c.json({
        success: true,
        urls: {
          path: `${config.baseUrl}/a/${app.slug}`,
          subdomain: `${currentSubdomain}.onhyper.io`,
          primary: `${currentSubdomain}.onhyper.io`,
        },
      });
    }
    
    // Check feature flag for subdomains (respect plan restrictions)
    const subdomainFeature = await isFeatureEnabled('subdomains', user.userId, { subdomain: preferredSubdomain });
    
    // Try to claim a subdomain with fallbacks
    const claimResult = await claimSubdomainWithFallback(user.userId, appId, preferredSubdomain);
    
    if (claimResult.success && claimResult.subdomain) {
      // Check short subdomain feature flag if needed
      if (claimResult.subdomain.length < 6) {
        const shortSubdomainFeature = await isFeatureEnabled('short_subdomains', user.userId, { subdomain: claimResult.subdomain });
        if (!shortSubdomainFeature.enabled) {
          // Try with a longer suffix
          const longerResult = await claimSubdomainWithFallback(
            user.userId, 
            appId, 
            `${preferredSubdomain}-app`,
            3
          );
          
          if (longerResult.success && longerResult.subdomain) {
            claimResult.subdomain = longerResult.subdomain;
          } else {
            // Fall back to path-based URL
            return c.json({
              success: true,
              urls: {
                path: `${config.baseUrl}/a/${app.slug}`,
                subdomain: null,
                primary: `${config.baseUrl}/a/${app.slug}`,
              },
              message: 'Could not claim a suitable subdomain. Using path-based URL.',
            });
          }
        }
      }
      
      // Update app's subdomain field
      await updateAppSubdomain(appId, user.userId, claimResult.subdomain);
      
      // Audit log
      const metadata = getRequestMetadata(c);
      logAuditEvent({
        userId: user.userId,
        action: 'app_publish',
        resourceType: 'app',
        resourceId: appId,
        details: { app_name: app.name, app_slug: app.slug, subdomain: claimResult.subdomain, auto_claimed: true },
        ...metadata,
      });
      
      return c.json({
        success: true,
        urls: {
          path: `${config.baseUrl}/a/${app.slug}`,
          subdomain: `${claimResult.subdomain}.onhyper.io`,
          primary: `${claimResult.subdomain}.onhyper.io`,
        },
        auto_claimed: true,
      });
    }
    
    // Fallback to path-based URL only
    return c.json({
      success: true,
      urls: {
        path: `${config.baseUrl}/a/${app.slug}`,
        subdomain: null,
        primary: `${config.baseUrl}/a/${app.slug}`,
      },
      message: 'Could not claim a subdomain. Using path-based URL.',
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish app';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/apps/:id/analytics
 * Get analytics for a specific app
 * 
 * Returns views, API calls, and usage stats for a user's app.
 * Only accessible by the app owner.
 */
apps.get('/:id/analytics', async (c) => {
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
  
  // Get days parameter (default 30)
  const days = parseInt(c.req.query('days') || '30', 10);
  const clampedDays = Math.min(Math.max(days, 1), 365); // Clamp 1-365 days
  
  const analytics = getAppAnalytics(id, clampedDays);
  
  return c.json({
    appId: analytics.appId,
    totalViews: analytics.totalViews,
    totalApiCalls: analytics.totalApiCalls,
    totalErrors: analytics.totalErrors,
    avgDuration: analytics.avgDuration,
    dailyStats: analytics.dailyStats,
    topEndpoints: analytics.topEndpoints,
  });
});

/**
 * GET /api/apps/analytics
 * Get analytics for all user's apps
 * 
 * Returns a summary for each app the user owns.
 */
apps.get('/analytics', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  // Get days parameter (default 30)
  const days = parseInt(c.req.query('days') || '30', 10);
  const clampedDays = Math.min(Math.max(days, 1), 365); // Clamp 1-365 days
  
  const apps = getUserAppsWithAnalytics(user.userId, clampedDays);
  
  return c.json({
    apps: apps.map(a => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      views: a.views,
      apiCalls: a.apiCalls,
      errors: a.errors,
      url: `${config.baseUrl}/a/${a.slug}`,
    })),
    days: clampedDays,
  });
});

/**
 * Helper function to claim a subdomain for a specific app
 * Uses the subdomain_reservations table
 */
async function claimSubdomainForApp(
  userId: string, 
  subdomain: string, 
  appId: string
): Promise<{ success: boolean; error?: string }> {
  const { getDatabase } = await import('../lib/db.js');
  const db = getDatabase();
  
  try {
    // Insert into subdomain_reservations with app_id
    db.prepare(`
      INSERT INTO subdomain_reservations (subdomain, owner_id, app_id)
      VALUES (?, ?, ?)
    `).run(subdomain.toLowerCase(), userId, appId);
    
    return { success: true };
  } catch (error) {
    // Handle UNIQUE constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'This subdomain was just claimed by another user' };
    }
    throw error;
  }
}

/**
 * POST /api/apps/:id/zip
 * Upload a ZIP file containing static site assets
 * 
 * Extracts and stores all files from the ZIP.
 * Supports: index.html, assets/, CSS, JS, images, fonts, etc.
 */
apps.post('/:id/zip', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const appId = c.req.param('id');
  const app = getAppById(appId);
  
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }
  
  // Verify ownership
  if (app.user_id !== user.userId) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  try {
    // Get the ZIP file from the request
    const contentType = c.req.header('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return c.json({ error: 'Content-Type must be multipart/form-data' }, 400);
    }
    
    const formData = await c.req.parseBody();
    const file = (formData as any).file as File | null;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate it's a ZIP file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return c.json({ error: 'File must be a .zip file' }, 400);
    }
    
    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Import unzipper dynamically
    const unzipper = await import('unzipper');
    const { AppFilesStore } = await import('../lib/lmdb.js');
    
    // Delete existing files first
    await AppFilesStore.deleteAll(appId);
    
    // Extract and store files
    const files: string[] = [];
    
    // Use adm-zip for ZIP extraction
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    
    // Find root folder (common prefix), but skip underscore-prefixed folders
    // (like _next, _vercel) as they are framework-specific and should be preserved
    let rootFolder: string | null = null;
    for (const entry of entries) {
      if (!entry.isDirectory && !entry.entryName.includes('__MACOSX') && !entry.entryName.startsWith('.')) {
        const parts = entry.entryName.split('/');
        // Only use as root if it doesn't start with underscore AND isn't a Next.js special folder
        if (parts.length > 1 && !rootFolder && !parts[0].startsWith('_') && parts[0] !== '404') {
          rootFolder = parts[0];
        }
      }
    }
    
    for (const entry of entries) {
      let filePath = entry.entryName;
      
      // Skip directories and hidden files only
      // Note: We keep underscore-prefixed folders (_next, _vercel) for Next.js
      if (entry.isDirectory || filePath.includes('__MACOSX') || filePath.startsWith('.')) {
        continue;
      }
      
      // Strip root folder if present
      if (rootFolder && filePath.startsWith(rootFolder + '/')) {
        filePath = filePath.slice(rootFolder.length + 1);
      }
      
      if (!filePath) continue;
      
      // Read file content
      const text = entry.getData().toString('utf-8');
      
      // Store in LMDB
      await AppFilesStore.save(appId, filePath, text);
      files.push(filePath);
    }
    
    // If index.html exists, use it as the main HTML
    const indexHtml = AppFilesStore.get(appId, 'index.html');
    if (indexHtml) {
      // Update the app's html field in SQLite
      const { updateApp } = await import('../lib/apps.js');
      await updateApp(appId, user.userId, { html: indexHtml });
      
      // Also save to AppContentStore in LMDB (used by render route)
      const { AppContentStore } = await import('../lib/lmdb.js');
      const existing = AppContentStore.get(appId);
      await AppContentStore.save(appId, {
        appId,
        html: indexHtml,
        css: existing?.css || '',
        js: existing?.js || '',
        updatedAt: new Date().toISOString()
      });
    }
    
    // Audit log
    const metadata = getRequestMetadata(c);
    logAuditEvent({
      userId: user.userId,
      action: 'app_zip_upload',
      resourceType: 'app',
      resourceId: appId,
      details: { files_count: files.length, file_names: files.slice(0, 10) },
      ...metadata,
    });
    
    return c.json({
      success: true,
      files_count: files.length,
      files: files.slice(0, 50), // Return first 50 files
    });
  } catch (error) {
    console.error('[ZIP upload] Error:', error);
    return c.json({ error: 'Failed to process ZIP file' }, 500);
  }
});

/**
 * GET /api/apps/:id/files
 * List all uploaded files for an app
 */
apps.get('/:id/files', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const appId = c.req.param('id');
  const app = getAppById(appId);
  
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }
  
  // Verify ownership
  if (app.user_id !== user.userId) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  const { AppFilesStore } = await import('../lib/lmdb.js');
  const files = AppFilesStore.list(appId);
  
  return c.json({ files });
});

/**
 * DELETE /api/apps/:id/files/:path
 * Delete a specific file
 */
apps.delete('/:id/files/*', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const appId = c.req.param('id');
  const filePath = c.req.param('*') || '';
  const app = getAppById(appId);
  
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }
  
  // Verify ownership
  if (app.user_id !== user.userId) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  const { AppFilesStore } = await import('../lib/lmdb.js');
  AppFilesStore.delete(appId, filePath);
  
  return c.json({ deleted: true, path: filePath });
});

export { apps };
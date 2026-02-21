/**
 * Clerk Proxy Routes for OnHyper.io
 * 
 * Securely proxies Clerk API requests with automatic secret injection.
 * This enables published apps to use Clerk for authentication without
 * exposing the Clerk secret key to the browser.
 * 
 * ## How It Works
 * 
 * 1. Client sends request to `/proxy/auth/clerk/*`
 * 2. Proxy identifies the app via `X-App-Slug` header
 * 3. Looks up the app owner's `CLERK_SECRET_KEY` secret
 * 4. Validates the app owns the secret (security boundary)
 * 5. Forwards request to Clerk API with the secret injected
 * 6. Returns response to client with CORS headers
 * 7. Logs the request for audit purposes
 * 
 * ## Endpoints
 * 
 * ### POST /proxy/auth/clerk/users
 * Create a new user in Clerk.
 * 
 * **Headers:**
 * - `X-App-Slug: my-app` - App identifier (required)
 * - `Content-Type: application/json`
 * 
 * **Request Body:** Clerk user creation payload
 * ```json
 * {
 *   "email_address": ["user@example.com"],
 *   "first_name": "John",
 *   "last_name": "Doe"
 * }
 * ```
 * 
 * **Response:** Clerk user object
 * 
 * ### GET /proxy/auth/clerk/users
 * List users from Clerk.
 * 
 * **Query Parameters:** Clerk list users params (limit, offset, etc.)
 * 
 * ### GET /proxy/auth/clerk/users/:id
 * Get a specific user by ID.
 * 
 * ### POST /proxy/auth/clerk/sessions
 * Create a new session for a user.
 * 
 * **Request Body:**
 * ```json
 * {
 *   "user_id": "user_abc123"
 * }
 * ```
 * 
 * ### POST /proxy/auth/clerk/clients/:client_id/verify
 * Verify a session token for a client.
 * 
 * **Request Body:**
 * ```json
 * {
 *   "token": "sess_token_here"
 * }
 * ```
 * 
 * ## Authentication
 * 
 * Requests must identify the app making the request:
 * - `X-App-Slug: my-app` - App's URL slug
 * - `X-App-ID: uuid` - App's internal ID
 * 
 * The app owner must have a `CLERK_SECRET_KEY` secret configured.
 * 
 * ## Security Model
 * 
 * - Apps can only use their owner's Clerk secret
 * - Each request is logged for audit purposes
 * - Rate limiting applies based on the app owner's plan
 * 
 * ## Example Usage
 * 
 * ```javascript
 * // Create a user in Clerk from a published app
 * const response = await fetch('/proxy/auth/clerk/users', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-App-Slug': 'my-app'
 *   },
 *   body: JSON.stringify({
 *     email_address: ['newuser@example.com'],
 *     first_name: 'Jane',
 *     last_name: 'Smith'
 *   })
 * });
 * 
 * const user = await response.json();
 * console.log('Created user:', user.id);
 * ```
 * 
 * @module routes/auth/clerk
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { config } from '../../config.js';
import { getSecretValue } from '../../lib/secrets.js';
import { getAppBySlug, getAppById } from '../../lib/apps.js';
import { recordUsage } from '../../lib/usage.js';
import { trackProxyRequest } from '../../lib/analytics.js';
import { trackAppApiCall } from '../../lib/appAnalytics.js';
import { logAuditEvent } from '../../lib/db.js';

const clerk = new Hono();

/**
 * Clerk API base URL
 * All Clerk API requests are proxied to this endpoint
 */
const CLERK_API_BASE = 'https://api.clerk.com/v1';

/**
 * Identify the app making the request
 * 
 * Supports two methods:
 * 1. X-App-Slug header (e.g., "my-cool-app")
 * 2. X-App-ID header (UUID)
 * 
 * @param c - Hono context
 * @returns App object if found, null otherwise
 */
async function identifyApp(c: any): Promise<{ appId: string; userId: string; appSlug: string } | null> {
  const appSlug = c.req.header('x-app-slug');
  const appId = c.req.header('x-app-id');
  
  // Method 1: App slug
  if (appSlug) {
    const app = getAppBySlug(appSlug);
    if (app) {
      return { appId: app.id, userId: app.user_id, appSlug: app.slug };
    }
  }
  
  // Method 2: App ID
  if (appId) {
    const app = getAppById(appId);
    if (app) {
      return { appId: app.id, userId: app.user_id, appSlug: app.slug };
    }
  }
  
  return null;
}

/**
 * Get the client's IP address from the request
 * Handles proxy headers (X-Forwarded-For, X-Real-IP)
 */
function getClientIp(c: any): string | undefined {
  // Check common proxy headers
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can be a comma-separated list, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = c.req.header('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback - Hono may have the IP in the runtime context
  return undefined;
}

/**
 * Log a Clerk proxy request for audit purposes
 * 
 * @param params - Audit log parameters
 */
function logClerkRequest(params: {
  appId: string;
  userId: string;
  action: string;
  endpoint: string;
  status: number;
  ip?: string;
  userAgent?: string;
}): void {
  logAuditEvent({
    userId: params.userId,
    action: params.action,
    resourceType: 'clerk_proxy',
    resourceId: params.appId,
    details: {
      endpoint: params.endpoint,
      status: params.status,
    },
    ipAddress: params.ip,
    userAgent: params.userAgent,
  });
}

/**
 * Build the Clerk API URL for a given path
 */
function buildClerkUrl(path: string, query?: Record<string, string>): string {
  const url = new URL(`${CLERK_API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

/**
 * Common handler for Clerk proxy requests
 * 
 * This handles:
 * - App identification
 * - Secret retrieval and validation
 * - Request forwarding
 * - Response handling (including streaming)
 * - Usage tracking
 * - Audit logging
 */
async function proxyClerkRequest(
  c: any,
  path: string,
  method: string,
  actionName: string
): Promise<Response> {
  const startTime = Date.now();
  const endpoint = `clerk:${path.split('?')[0]}`;
  
  // Identify the app making the request
  const app = await identifyApp(c);
  
  if (!app) {
    return c.json({
      error: 'Authentication required. Provide X-App-Slug or X-App-ID header.',
    }, 401);
  }
  
  // Get the Clerk secret key for this app owner
  const clerkSecretKey = getSecretValue(app.userId, 'CLERK_SECRET_KEY');
  
  if (!clerkSecretKey) {
    return c.json({
      error: 'CLERK_SECRET_KEY not configured. Add it in your OnHyper dashboard.',
      hint: 'Go to Settings > Secrets and add "CLERK_SECRET_KEY"',
    }, 401);
  }
  
  // Log the request attempt
  const clientIp = getClientIp(c);
  const userAgent = c.req.header('user-agent');
  
  try {
    // Build headers for Clerk API
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'OnHyper-Clerk-Proxy/1.0',
    };
    
    // Forward relevant headers (excluding auth)
    const forwardHeaders = ['accept', 'accept-language', 'clerk-api-version'];
    for (const header of forwardHeaders) {
      const value = c.req.header(header);
      if (value) {
        headers[header] = value;
      }
    }
    
    // Request uncompressed content
    headers['accept-encoding'] = 'identity';
    
    // Build target URL with query params
    const query = Object.fromEntries(c.req.query());
    const targetUrl = buildClerkUrl(path, query);
    
    // Get request body for non-GET requests
    let body: string | undefined;
    if (!['GET', 'HEAD', 'DELETE'].includes(method)) {
      const contentLength = c.req.header('content-length');
      if (contentLength && parseInt(contentLength) > config.proxy.maxRequestSize) {
        return c.json({ error: 'Request body too large' }, 413);
      }
      body = await c.req.text();
    }
    
    // Make the request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.proxy.timeoutMs);
    
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Check response size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > config.proxy.maxResponseSize) {
      return c.json({ error: 'Response too large' }, 502);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Handle SSE streaming responses (Clerk may stream for some endpoints)
    if (contentType.includes('text/event-stream')) {
      const duration = Date.now() - startTime;
      
      // Record usage and tracking
      recordUsage({
        appId: app.appId,
        endpoint,
        status: response.status,
        duration,
      });
      
      trackProxyRequest({
        userId: app.userId,
        appId: app.appId,
        endpoint,
        status: response.status,
        durationMs: duration,
        success: response.status >= 200 && response.status < 400,
      });
      
      trackAppApiCall(app.appId, { endpoint, status: response.status, duration });
      
      // Log audit event
      logClerkRequest({
        appId: app.appId,
        userId: app.userId,
        action: actionName,
        endpoint: path,
        status: response.status,
        ip: clientIp,
        userAgent,
      });
      
      // Stream the SSE response
      return streamSSE(c, async (stream) => {
        const reader = response.body?.getReader();
        if (!reader) return;
        
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await stream.write(decoder.decode(value));
          }
        } catch (error) {
          console.error('Clerk SSE stream error:', error);
        }
      });
    }
    
    // Non-streaming: read response body
    const responseText = await response.text();
    
    // Record usage
    const duration = Date.now() - startTime;
    recordUsage({
      appId: app.appId,
      endpoint,
      status: response.status,
      duration,
    });
    
    // Track proxy request
    trackProxyRequest({
      userId: app.userId,
      appId: app.appId,
      endpoint,
      status: response.status,
      durationMs: duration,
      success: response.status >= 200 && response.status < 400,
    });
    
    // Track per-app analytics
    trackAppApiCall(app.appId, { endpoint, status: response.status, duration });
    
    // Log audit event
    logClerkRequest({
      appId: app.appId,
      userId: app.userId,
      action: actionName,
      endpoint: path,
      status: response.status,
      ip: clientIp,
      userAgent,
    });
    
    // Build response headers
    const responseHeaders: Record<string, string> = {};
    const allowedResponseHeaders = [
      'content-type', 'content-encoding', 'cache-control',
      'etag', 'last-modified', 'x-request-id', 'x-clerk-request-id',
    ];
    
    for (const header of allowedResponseHeaders) {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders[header] = value;
      }
    }
    
    // Add CORS headers for browser requests
    responseHeaders['Access-Control-Allow-Origin'] = '*';
    responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type, X-App-Slug, X-App-ID, Clerk-API-Version';
    
    // Try to parse as JSON
    let responseBody: unknown = responseText;
    if (contentType.includes('application/json')) {
      try {
        responseBody = JSON.parse(responseText);
        return c.json(responseBody, response.status as any, responseHeaders);
      } catch {
        // Not valid JSON, return as text
      }
    }
    
    // Return as text
    return new Response(responseText, {
      status: response.status,
      headers: responseHeaders,
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record failed request
    recordUsage({
      appId: app.appId,
      endpoint,
      status: 0,
      duration,
    });
    
    // Track failed request
    trackProxyRequest({
      userId: app.userId,
      appId: app.appId,
      endpoint,
      status: 0,
      durationMs: duration,
      success: false,
    });
    
    trackAppApiCall(app.appId, { endpoint, status: 0, duration });
    
    // Log failed audit event
    logClerkRequest({
      appId: app.appId,
      userId: app.userId,
      action: `${actionName}_failed`,
      endpoint: path,
      status: 0,
      ip: clientIp,
      userAgent,
    });
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return c.json({ error: 'Request timed out' }, 504);
      }
      return c.json({ error: error.message }, 502);
    }
    
    return c.json({ error: 'Clerk proxy request failed' }, 502);
  }
}

// ============================================================================
// Clerk Users Endpoints
// ============================================================================

/**
 * POST /proxy/auth/clerk/users
 * Create a new user in Clerk
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Users#operation/createUser
 */
clerk.post('/users', async (c) => {
  return proxyClerkRequest(c, '/users', 'POST', 'clerk_user_create');
});

/**
 * GET /proxy/auth/clerk/users
 * List users from Clerk
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Users#operation/listUsers
 */
clerk.get('/users', async (c) => {
  return proxyClerkRequest(c, '/users', 'GET', 'clerk_user_list');
});

/**
 * GET /proxy/auth/clerk/users/:id
 * Get a specific user from Clerk
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Users#operation/getUser
 */
clerk.get('/users/:id', async (c) => {
  const userId = c.req.param('id');
  return proxyClerkRequest(c, `/users/${userId}`, 'GET', 'clerk_user_get');
});

/**
 * DELETE /proxy/auth/clerk/users/:id
 * Delete a user from Clerk
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Users#operation/deleteUser
 */
clerk.delete('/users/:id', async (c) => {
  const userId = c.req.param('id');
  return proxyClerkRequest(c, `/users/${userId}`, 'DELETE', 'clerk_user_delete');
});

/**
 * PATCH /proxy/auth/clerk/users/:id
 * Update a user in Clerk
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Users#operation/updateUser
 */
clerk.patch('/users/:id', async (c) => {
  const userId = c.req.param('id');
  return proxyClerkRequest(c, `/users/${userId}`, 'PATCH', 'clerk_user_update');
});

// ============================================================================
// Clerk Sessions Endpoints
// ============================================================================

/**
 * POST /proxy/auth/clerk/sessions
 * Create a new session for a user
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/createSession
 */
clerk.post('/sessions', async (c) => {
  return proxyClerkRequest(c, '/sessions', 'POST', 'clerk_session_create');
});

/**
 * GET /proxy/auth/clerk/sessions/:id
 * Get a session by ID
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/getSession
 */
clerk.get('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  return proxyClerkRequest(c, `/sessions/${sessionId}`, 'GET', 'clerk_session_get');
});

/**
 * DELETE /proxy/auth/clerk/sessions/:id
 * Revoke a session
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/deleteSession
 */
clerk.delete('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  return proxyClerkRequest(c, `/sessions/${sessionId}`, 'DELETE', 'clerk_session_revoke');
});

// ============================================================================
// Clerk Client Verification Endpoints
// ============================================================================

/**
 * POST /proxy/auth/clerk/clients/:client_id/verify
 * Verify a session token for a client
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Clients#operation/verifyClient
 */
clerk.post('/clients/:client_id/verify', async (c) => {
  const clientId = c.req.param('client_id');
  return proxyClerkRequest(c, `/clients/${clientId}/verify`, 'POST', 'clerk_client_verify');
});

/**
 * GET /proxy/auth/clerk/clients/:client_id
 * Get a client by ID
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Clients#operation/getClient
 */
clerk.get('/clients/:client_id', async (c) => {
  const clientId = c.req.param('client_id');
  return proxyClerkRequest(c, `/clients/${clientId}`, 'GET', 'clerk_client_get');
});

// ============================================================================
// Clerk Organization Endpoints (optional, commonly used)
// ============================================================================

/**
 * GET /proxy/auth/clerk/organizations
 * List organizations
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/listOrganizations
 */
clerk.get('/organizations', async (c) => {
  return proxyClerkRequest(c, '/organizations', 'GET', 'clerk_org_list');
});

/**
 * POST /proxy/auth/clerk/organizations
 * Create an organization
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/createOrganization
 */
clerk.post('/organizations', async (c) => {
  return proxyClerkRequest(c, '/organizations', 'POST', 'clerk_org_create');
});

/**
 * GET /proxy/auth/clerk/organizations/:id
 * Get an organization by ID
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/getOrganization
 */
clerk.get('/organizations/:id', async (c) => {
  const orgId = c.req.param('id');
  return proxyClerkRequest(c, `/organizations/${orgId}`, 'GET', 'clerk_org_get');
});

/**
 * DELETE /proxy/auth/clerk/organizations/:id
 * Delete an organization
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/deleteOrganization
 */
clerk.delete('/organizations/:id', async (c) => {
  const orgId = c.req.param('id');
  return proxyClerkRequest(c, `/organizations/${orgId}`, 'DELETE', 'clerk_org_delete');
});

/**
 * PATCH /proxy/auth/clerk/organizations/:id
 * Update an organization
 * 
 * @see https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/updateOrganization
 */
clerk.patch('/organizations/:id', async (c) => {
  const orgId = c.req.param('id');
  return proxyClerkRequest(c, `/organizations/${orgId}`, 'PATCH', 'clerk_org_update');
});

// ============================================================================
// CORS and Health Check Endpoints
// ============================================================================

/**
 * OPTIONS /proxy/auth/clerk/*
 * Handle CORS preflight requests for all Clerk endpoints
 */
clerk.options('/*', (c) => {
  return c.body(null, 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Slug, X-App-ID, Clerk-API-Version',
    'Access-Control-Max-Age': '86400',
  });
});

/**
 * GET /proxy/auth/clerk
 * Info endpoint - returns available Clerk proxy endpoints
 */
clerk.get('/', (c) => {
  return c.json({
    name: 'Clerk Proxy',
    description: 'Securely proxy Clerk API requests with automatic secret injection',
    baseEndpoint: '/proxy/auth/clerk',
    authentication: {
      headers: ['X-App-Slug', 'X-App-ID'],
      description: 'Identify your app to use the app owner\'s Clerk secret key',
    },
    endpoints: [
      {
        method: 'POST',
        path: '/users',
        description: 'Create a new user',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Users#operation/createUser',
      },
      {
        method: 'GET',
        path: '/users',
        description: 'List users',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Users#operation/listUsers',
      },
      {
        method: 'GET',
        path: '/users/:id',
        description: 'Get a user by ID',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Users#operation/getUser',
      },
      {
        method: 'PATCH',
        path: '/users/:id',
        description: 'Update a user',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Users#operation/updateUser',
      },
      {
        method: 'DELETE',
        path: '/users/:id',
        description: 'Delete a user',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Users#operation/deleteUser',
      },
      {
        method: 'POST',
        path: '/sessions',
        description: 'Create a session for a user',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/createSession',
      },
      {
        method: 'GET',
        path: '/sessions/:id',
        description: 'Get a session by ID',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/getSession',
      },
      {
        method: 'DELETE',
        path: '/sessions/:id',
        description: 'Revoke a session',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/deleteSession',
      },
      {
        method: 'POST',
        path: '/clients/:client_id/verify',
        description: 'Verify a session token',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Clients#operation/verifyClient',
      },
      {
        method: 'GET',
        path: '/clients/:client_id',
        description: 'Get a client by ID',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Clients#operation/getClient',
      },
      {
        method: 'GET',
        path: '/organizations',
        description: 'List organizations',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/listOrganizations',
      },
      {
        method: 'POST',
        path: '/organizations',
        description: 'Create an organization',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/createOrganization',
      },
      {
        method: 'GET',
        path: '/organizations/:id',
        description: 'Get an organization by ID',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/getOrganization',
      },
      {
        method: 'PATCH',
        path: '/organizations/:id',
        description: 'Update an organization',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/updateOrganization',
      },
      {
        method: 'DELETE',
        path: '/organizations/:id',
        description: 'Delete an organization',
        docs: 'https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/deleteOrganization',
      },
    ],
    requirements: {
      secret: {
        name: 'CLERK_SECRET_KEY',
        description: 'Add this secret in your OnHyper dashboard under Settings > Secrets',
      },
    },
  });
});

export { clerk };
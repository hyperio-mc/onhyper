/**
 * WorkOS Proxy Routes for OnHyper.io
 * 
 * Securely proxies requests to WorkOS API, injecting authentication from
 * user secrets. This allows published apps to use WorkOS without exposing
 * API keys to browsers.
 * 
 * ## How It Works
 * 
 * 1. Client sends request to `/proxy/auth/workos/*`
 * 2. Proxy identifies app via `X-App-Slug` header
 * 3. Looks up the app owner's `WORKOS_API_KEY` secret
 * 4. Forwards request to WorkOS API with the key
 * 5. Returns response to client with CORS headers
 * 
 * ## Endpoints
 * 
 * | Endpoint | Method | WorkOS API |
 * |----------|--------|-----------|
 * | `/proxy/auth/workos/users` | POST | Create user |
 * | `/proxy/auth/workos/users` | GET | List users |
 * | `/proxy/auth/workos/users/:id` | GET | Get user |
 * | `/proxy/auth/workos/sso/saml/auth` | POST | SAML auth flow |
 * | `/proxy/auth/workos/directorySync/sync` | POST | Directory sync |
 * | `/proxy/auth/workos/*` | ALL | Generic proxy |
 * 
 * ## Authentication
 * 
 * Requires `X-App-Slug` header to identify the app whose WorkOS key to use.
 * The app owner must have `WORKOS_API_KEY` configured in their secrets.
 * 
 * ## Request Flow
 * 
 * ```
 * Browser → /proxy/auth/workos/users
 *         → Identify app via X-App-Slug
 *         → Get app owner's WORKOS_API_KEY
 *         → Forward to https://api.workos.com/users
 *         → Return response to browser
 * ```
 * 
 * ## Example Usage
 * 
 * ```javascript
 * // Create a WorkOS user through the proxy
 * const response = await fetch('/proxy/auth/workos/users', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-App-Slug': 'my-app'
 *   },
 *   body: JSON.stringify({
 *     email: 'user@example.com',
 *     first_name: 'John',
 *     last_name: 'Doe'
 *   })
 * });
 * ```
 * 
 * ## Security
 * 
 * - App can only access its owner's WorkOS key
 * - All requests are logged for audit purposes
 * - Rate limits apply per the user's plan
 * 
 * @module routes/auth/workos
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { config } from '../../config.js';
import { getSecretValue } from '../../lib/secrets.js';
import { getAppBySlug, getAppById } from '../../lib/apps.js';
import { getApiKeyByKey, verifyToken, getUserApiKeyByUserId } from '../../lib/users.js';
import { getUserSettings } from '../../lib/db.js';
import { recordUsage } from '../../lib/usage.js';
import { trackProxyRequest } from '../../lib/analytics.js';
import { trackAppApiCall } from '../../lib/appAnalytics.js';

const workos = new Hono();

/**
 * WorkOS API base URL
 * All WorkOS API requests are sent here
 */
const WORKOS_API_BASE = 'https://api.workos.com';

/**
 * Identify the app making the request
 * 
 * Supports multiple authentication methods:
 * 1. X-App-Slug header - App slug (e.g., "my-app")
 * 2. X-App-ID header - App UUID
 * 
 * Returns the app owner's user ID and the app ID for tracking.
 * 
 * @param c - Hono context
 * @returns Identity object with userId and appId, or null if not authenticated
 */
async function identifyApp(c: any): Promise<{ userId: string; appId: string; appSlug: string } | null> {
  const appSlug = c.req.header('x-app-slug');
  const appId = c.req.header('x-app-id');
  
  // Method 1: App slug (for published apps)
  if (appSlug) {
    const app = getAppBySlug(appSlug);
    if (app) {
      return { userId: app.user_id, appId: app.id, appSlug: app.slug };
    }
  }
  
  // Method 2: App ID
  if (appId) {
    const app = getAppById(appId);
    if (app) {
      return { userId: app.user_id, appId: app.id, appSlug: app.slug };
    }
  }
  
  return null;
}

/**
 * Identify user from standard auth methods (JWT or API key)
 * Used as fallback if app-specific auth fails
 * 
 * @param c - Hono context
 * @returns User ID or null if not authenticated
 */
async function identifyUser(c: any): Promise<string | null> {
  const authHeader = c.req.header('authorization');
  const apiKeyHeader = c.req.header('x-api-key');
  
  // Method 1: JWT token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      return payload.userId;
    }
  }
  
  // Method 2: API key
  if (apiKeyHeader?.startsWith('oh_live_')) {
    const keyRecord = getApiKeyByKey(apiKeyHeader);
    if (keyRecord) {
      return keyRecord.user_id;
    }
  }
  
  return null;
}

/**
 * Get the WorkOS API key for a user
 * 
 * Retrieves the decrypted WORKOS_API_KEY secret for the given user.
 * Returns null if the user hasn't configured this secret.
 * 
 * @param userId - The user's ID
 * @returns The decrypted API key or null
 */
function getWorkOSApiKey(userId: string): string | null {
  return getSecretValue(userId, 'WORKOS_API_KEY');
}

/**
 * Log a WorkOS proxy request for audit purposes
 * 
 * @param identity - App identity making the request
 * @param method - HTTP method
 * @param path - Request path
 * @param status - Response status code
 * @param duration - Request duration in ms
 */
function logWorkOSRequest(
  identity: { userId: string; appId: string; appSlug: string },
  method: string,
  path: string,
  status: number,
  duration: number
): void {
  console.log(JSON.stringify({
    type: 'workos_proxy_request',
    timestamp: new Date().toISOString(),
    userId: identity.userId,
    appId: identity.appId,
    appSlug: identity.appSlug,
    method,
    path,
    status,
    durationMs: duration,
  }));
}

/**
 * Forward a request to WorkOS API
 * 
 * This is the core proxy function that:
 * 1. Builds the target URL
 * 2. Prepares headers with WorkOS auth
 * 3. Forwards the request
 * 4. Handles streaming responses
 * 5. Records usage and analytics
 * 
 * @param c - Hono context
 * @param apiKey - WorkOS API key to use
 * @param identity - App identity for tracking
 * @returns Response from WorkOS API
 */
async function forwardToWorkOS(
  c: any,
  apiKey: string,
  identity: { userId: string; appId: string; appSlug: string }
): Promise<Response> {
  const startTime = Date.now();
  
  // Build target URL - remove the /proxy/auth/workos prefix
  const path = c.req.path.replace('/proxy/auth/workos', '');
  const queryString = c.req.query() ? '?' + new URLSearchParams(c.req.query()) : '';
  const targetUrl = `${WORKOS_API_BASE}${path}${queryString}`;
  
  // Prepare headers
  // WorkOS uses Bearer token authentication
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': 'OnHyper-WorkOS-Proxy/1.0',
  };
  
  // Forward relevant headers
  const forwardHeaders = ['accept', 'accept-language', 'workos-client-id'];
  for (const header of forwardHeaders) {
    const value = c.req.header(header);
    if (value) {
      headers[header] = value;
    }
  }
  
  // Explicitly request uncompressed content
  headers['accept-encoding'] = 'identity';
  
  try {
    // Get request body for non-GET requests
    let body: string | undefined;
    if (!['GET', 'HEAD'].includes(c.req.method)) {
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
      method: c.req.method,
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
    
    // Handle SSE streaming responses
    if (contentType.includes('text/event-stream')) {
      const duration = Date.now() - startTime;
      
      // Record usage
      recordUsage({
        appId: identity.appId,
        endpoint: 'workos',
        status: response.status,
        duration,
      });
      
      // Track in analytics
      trackProxyRequest({
        userId: identity.userId,
        appId: identity.appId,
        endpoint: 'workos',
        status: response.status,
        durationMs: duration,
        success: response.status >= 200 && response.status < 400,
      });
      
      // Track per-app analytics
      setImmediate(() => {
        try {
          trackAppApiCall(identity.appId, { endpoint: 'workos', status: response.status, duration });
          logWorkOSRequest(identity, c.req.method, path, response.status, duration);
        } catch (e) {
          console.error('[WorkOS] Failed to track SSE call:', e);
        }
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
          console.error('[WorkOS] SSE stream error:', error);
        }
      });
    }
    
    // Non-streaming: read response body
    const responseText = await response.text();
    
    // Record usage
    const duration = Date.now() - startTime;
    recordUsage({
      appId: identity.appId,
      endpoint: 'workos',
      status: response.status,
      duration,
    });
    
    // Track in analytics
    trackProxyRequest({
      userId: identity.userId,
      appId: identity.appId,
      endpoint: 'workos',
      status: response.status,
      durationMs: duration,
      success: response.status >= 200 && response.status < 400,
    });
    
    // Track per-app analytics
    setImmediate(() => {
      try {
        trackAppApiCall(identity.appId, { endpoint: 'workos', status: response.status, duration });
        logWorkOSRequest(identity, c.req.method, path, response.status, duration);
      } catch (e) {
        console.error('[WorkOS] Failed to track API call:', e);
      }
    });
    
    // Build response headers
    const responseHeaders: Record<string, string> = {};
    const allowedResponseHeaders = [
      'content-type', 'content-encoding', 'cache-control',
      'etag', 'last-modified', 'x-request-id', 'x-workos-request-id',
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
    responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key, X-App-Slug, X-App-ID, WorkOS-Client-ID';
    
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
    
    // Return as text with appropriate content type
    return new Response(responseText, {
      status: response.status,
      headers: responseHeaders,
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record failed request
    recordUsage({
      appId: identity.appId,
      endpoint: 'workos',
      status: 0,
      duration,
    });
    
    // Track failed request
    trackProxyRequest({
      userId: identity.userId,
      appId: identity.appId,
      endpoint: 'workos',
      status: 0,
      durationMs: duration,
      success: false,
    });
    
    // Track per-app analytics
    setImmediate(() => {
      try {
        trackAppApiCall(identity.appId, { endpoint: 'workos', status: 0, duration });
        logWorkOSRequest(identity, c.req.method, path, 0, duration);
      } catch (e) {
        console.error('[WorkOS] Failed to track failed API call:', e);
      }
    });
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return c.json({ error: 'Request timed out' }, 504);
      }
      return c.json({ error: error.message }, 502);
    }
    
    return c.json({ error: 'WorkOS proxy request failed' }, 502);
  }
}

// ============================================================================
// WorkOS API Endpoints
// ============================================================================

/**
 * OPTIONS /proxy/auth/workos/*
 * Handle CORS preflight requests for all WorkOS endpoints
 */
workos.options('/*', (c) => {
  return c.body(null, 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-App-Slug, X-App-ID, WorkOS-Client-ID',
  });
});

/**
 * GET /proxy/auth/workos
 * List available WorkOS proxy endpoints and status
 */
workos.get('/', async (c) => {
  // Try to identify the caller to provide personalized info
  const identity = await identifyApp(c);
  const userId = identity?.userId || await identifyUser(c);
  
  let hasWorkOSKey = false;
  if (userId) {
    hasWorkOSKey = !!getWorkOSApiKey(userId);
  }
  
  return c.json({
    service: 'WorkOS Proxy',
    description: 'Securely proxy requests to WorkOS API with your WORKOS_API_KEY',
    baseUrl: WORKOS_API_BASE,
    authenticated: !!identity || !!userId,
    hasWorkOSKey,
    endpoints: [
      {
        method: 'GET',
        path: '/proxy/auth/workos/users',
        description: 'List users',
        workosDocs: 'https://workos.com/docs/reference/user-management/user/list',
      },
      {
        method: 'POST',
        path: '/proxy/auth/workos/users',
        description: 'Create a user',
        workosDocs: 'https://workos.com/docs/reference/user-management/user/create',
      },
      {
        method: 'GET',
        path: '/proxy/auth/workos/users/:id',
        description: 'Get a user by ID',
        workosDocs: 'https://workos.com/docs/reference/user-management/user/get',
      },
      {
        method: 'POST',
        path: '/proxy/auth/workos/sso/saml/auth',
        description: 'Initiate SAML SSO authentication',
        workosDocs: 'https://workos.com/docs/reference/sso/saml/auth',
      },
      {
        method: 'POST',
        path: '/proxy/auth/workos/directorySync/sync',
        description: 'Trigger directory sync',
        workosDocs: 'https://workos.com/docs/reference/directory-sync/sync',
      },
      {
        method: 'ALL',
        path: '/proxy/auth/workos/*',
        description: 'Generic proxy - forwards to any WorkOS API endpoint',
      },
    ],
    authentication: {
      header: 'X-App-Slug',
      description: 'Provide your app slug to use the app owner\'s WORKOS_API_KEY',
    },
    setup: {
      step1: 'Add WORKOS_API_KEY to your secrets in the OnHyper dashboard',
      step2: 'Include X-App-Slug header in your requests',
      step3: 'All requests will be authenticated with your key',
    },
  });
});

/**
 * ALL /proxy/auth/workos/*
 * Generic proxy handler for all WorkOS API requests
 * 
 * This catches all routes and forwards them to WorkOS API.
 * Includes specific handling for the documented endpoints.
 */
workos.all('/*', async (c) => {
  // Step 1: Identify the app making the request
  const identity = await identifyApp(c);
  
  if (!identity) {
    // Try fallback to user auth
    const userId = await identifyUser(c);
    if (!userId) {
      return c.json({
        error: 'Authentication required',
        message: 'Provide X-App-Slug or X-App-ID header to identify your app, or use Bearer token / X-API-Key.',
      }, 401);
    }
    
    // Get the user's WorkOS key
    const apiKey = getWorkOSApiKey(userId);
    if (!apiKey) {
      return c.json({
        error: 'WorkOS API key not configured',
        message: 'Add WORKOS_API_KEY to your secrets in the OnHyper dashboard.',
        step: 'Go to Settings > Secrets and add "WORKOS_API_KEY"',
      }, 401);
    }
    
    // Create a synthetic identity for tracking
    return forwardToWorkOS(c, apiKey, {
      userId,
      appId: 'direct-user',
      appSlug: 'direct-user',
    });
  }
  
  // Step 2: Get the app owner's WorkOS API key
  const apiKey = getWorkOSApiKey(identity.userId);
  
  if (!apiKey) {
    return c.json({
      error: 'WorkOS API key not configured',
      message: `App "${identity.appSlug}" owner has not configured WORKOS_API_KEY.`,
      step: 'The app owner needs to add WORKOS_API_KEY in their OnHyper dashboard under Settings > Secrets',
    }, 401);
  }
  
  // Step 3: Forward the request to WorkOS
  return forwardToWorkOS(c, apiKey, identity);
});

export { workos };
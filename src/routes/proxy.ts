/**
 * Proxy Routes for OnHyper.io
 * 
 * The core proxy service that securely injects user secrets into API requests.
 * This enables published apps to call external APIs without exposing keys to browsers.
 * 
 * ## How It Works
 * 
 * 1. Client sends request to `/proxy/{endpoint}/{path}`
 * 2. Proxy identifies user via JWT, API key, or app ownership
 * 3. Looks up user's secret for that endpoint
 * 4. Decrypts secret and injects into Authorization header
 * 5. Forwards request to target API
 * 6. Returns response to client with CORS headers
 * 
 * ## Endpoints
 * 
 * ### GET /proxy
 * List all available proxy endpoints.
 * 
 * **Response (200):**
 * ```json
 * {
 *   "endpoints": [
 *     {
 *       "name": "scout-atoms",
 *       "target": "https://api.scoutos.com",
 *       "secretKey": "SCOUT_API_KEY",
 *       "description": "Scout OS Agents API",
 *       "usage": "POST /proxy/scout-atoms/..."
 *     }
 *   ]
 * }
 * ```
 * 
 * ### ALL /proxy/:endpoint/*
 * Forward requests to the target API.
 * 
 * **Authentication (one of):**
 * - `Authorization: Bearer <jwt>` - JWT from login
 * - `X-API-Key: oh_live_xxx` - API key from dashboard
 * - `X-App-Slug: my-app` - App slug (uses app owner's secrets)
 * - `X-App-ID: uuid` - App ID (uses app owner's secrets)
 * 
 * **Response:**
 * - Success: Returns the API response with CORS headers
 * - Error: Returns error JSON with details
 * 
 * **Error Codes:**
 * - 401: Authentication required / No secret configured for endpoint
 * - 404: Unknown proxy endpoint
 * - 413: Request body too large (>5MB)
 * - 502: Proxy request failed / API error
 * - 504: Request timed out (30s)
 * 
 * ## Available Endpoints
 * 
 * | Endpoint | Target | Auth Format |
 * |----------|--------|-------------|
 * | `scoutos` | api.scoutos.com | `Bearer` |
 * | `scout-atoms` | api.scoutos.com | `Bearer` (deprecated) |
 * | `ollama` | ollama.com/v1 | `Bearer` |
 * | `openrouter` | openrouter.ai/api/v1 | `Bearer` |
 * | `anthropic` | api.anthropic.com/v1 | `x-api-key` |
 * | `openai` | api.openai.com/v1 | `Bearer` |
 * 
 * ## Example Usage
 * 
 * ```javascript
 * // In a published app - ScoutOS Agent chat
 * const response = await fetch('/proxy/scoutos/world/agent123/_interact', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-App-Slug': 'my-app'
 *   },
 *   body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] })
 * });
 * 
 * // ScoutOS Tables
 * const rows = await fetch('/proxy/scoutos/v2/collections/col_xxx/rows', {
 *   headers: { 'X-App-Slug': 'my-app' }
 * });
 * ```
 * 
 * ## Streaming Support
 * 
 * Server-Sent Events (SSE) responses are streamed directly to the client:
 * ```javascript
 * const response = await fetch('/proxy/scout-atoms/world/agent/_interact', {
 *   method: 'POST',
 *   headers: { 'Accept': 'text/event-stream' },
 *   body: JSON.stringify({ messages: [...], stream: true })
 * });
 * 
 * const reader = response.body.getReader();
 * // Handle SSE stream...
 * ```
 * 
 * ## Rate Limits
 * 
 * Rate limiting is applied per user based on their plan:
 * - FREE: 100 requests/day
 * - HOBBY: 1,000 requests/day
 * - PRO: 10,000 requests/day
 * - BUSINESS: Unlimited
 * 
 * @module routes/proxy
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { PROXY_ENDPOINTS, config } from '../config.js';
import { getSecretValue } from '../lib/secrets.js';
import { getAppBySlug, getAppById } from '../lib/apps.js';
import { getApiKeyByKey, verifyToken, getUserApiKeyByUserId } from '../lib/users.js';
import { getUserSettings } from '../lib/db.js';
import { recordUsage } from '../lib/usage.js';
import { trackProxyRequest } from '../lib/analytics.js';

const proxy = new Hono();

/**
 * Build authorization header for a specific endpoint
 */
function buildAuthHeader(endpoint: keyof typeof PROXY_ENDPOINTS, apiKey: string): string {
  switch (endpoint) {
    case 'anthropic':
      return `x-api-key ${apiKey}`;
    case 'scout-atoms':
    case 'ollama':
    case 'openrouter':
    case 'openai':
    default:
      return `Bearer ${apiKey}`;
  }
}

/**
 * Identify the user making the request
 * Supports three methods:
 * 1. Bearer token (JWT)
 * 2. X-API-Key header
 * 3. X-App-Slug header (looks up app owner)
 */
async function identifyUser(c: any): Promise<{ userId: string; appId?: string } | null> {
  const authHeader = c.req.header('authorization');
  const apiKeyHeader = c.req.header('x-api-key');
  const appSlug = c.req.header('x-app-slug');
  const appId = c.req.header('x-app-id');
  
  // Method 1: JWT token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      return { userId: payload.userId };
    }
  }
  
  // Method 2: API key
  if (apiKeyHeader?.startsWith('oh_live_')) {
    const keyRecord = getApiKeyByKey(apiKeyHeader);
    if (keyRecord) {
      return { userId: keyRecord.user_id };
    }
  }
  
  // Method 3: App slug (for published apps)
  if (appSlug) {
    const app = getAppBySlug(appSlug);
    if (app) {
      return { userId: app.user_id, appId: app.id };
    }
  }
  
  // Method 4: App ID
  if (appId) {
    const app = getAppById(appId);
    if (app) {
      return { userId: app.user_id, appId: app.id };
    }
  }
  
  return null;
}

/**
 * ALL /proxy/:endpoint/*
 * Forward requests to the target API with injected authentication
 */
proxy.all('/:endpoint/*', async (c) => {
  const startTime = Date.now();
  const endpoint = c.req.param('endpoint') as keyof typeof PROXY_ENDPOINTS;
  
  // Validate endpoint
  if (!endpoint || !PROXY_ENDPOINTS[endpoint]) {
    return c.json({
      error: 'Unknown proxy endpoint',
      available: Object.keys(PROXY_ENDPOINTS),
    }, 404);
  }
  
  const endpointConfig = PROXY_ENDPOINTS[endpoint];
  
  // Identify user/app
  const identity = await identifyUser(c);
  
  if (!identity) {
    return c.json({
      error: 'Authentication required. Provide Bearer token, X-API-Key, or X-App-Slug header.',
    }, 401);
  }
  
  // Get the secret value for this endpoint
  let secretValue: string | null;
  
  // Handle self-endpoints (like 'onhyper') differently
  if ((endpointConfig as any).self) {
    // Check if user has enabled this feature
    const userSettings = getUserSettings(identity.userId);
    if (!userSettings || userSettings.onhyper_api_enabled !== 1) {
      return c.json({
        error: 'OnHyper API access not enabled. Enable it in Settings.',
      }, 403);
    }
    
    // Get user's own API key
    const userApiKey = getUserApiKeyByUserId(identity.userId);
    if (!userApiKey) {
      return c.json({
        error: 'No API key found. Generate one in Dashboard.',
      }, 401);
    }
    
    // Use user's own API key as the secret value
    secretValue = userApiKey;
  } else {
    // Normal flow: get secret from storage
    secretValue = getSecretValue(identity.userId, endpointConfig.secretKey);
  }
  
  if (!secretValue) {
    return c.json({
      error: `No ${endpointConfig.secretKey} configured. Add it in your OnHyper dashboard.`,
      hint: `Go to Settings > Secrets and add "${endpointConfig.secretKey}"`,
    }, 401);
  }
  
  // Build target URL
  const path = c.req.path.replace(`/proxy/${endpoint}`, '');
  const targetUrl = endpointConfig.target + path + (c.req.query() ? '?' + new URLSearchParams(c.req.query()) : '');
  
  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': buildAuthHeader(endpoint, secretValue),
      'User-Agent': 'OnHyper-Proxy/1.0',
    };
    
    // Forward relevant headers (excluding authentication)
    // Note: We intentionally do NOT forward 'accept-encoding' because:
    // 1. Browsers can't set this header (forbidden header)
    // 2. We need raw responses to return properly to clients
    // 3. ScoutOS Drive returns gzipped content that causes issues
    const forwardHeaders = ['content-type', 'accept', 'accept-language'];
    for (const header of forwardHeaders) {
      const value = c.req.header(header);
      if (value) {
        headers[header] = value;
      }
    }
    
    // Explicitly request uncompressed content from target API
    // This ensures we can properly return the response to all clients
    headers['accept-encoding'] = 'identity';
    
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
      // Record usage for streaming (duration is just connection setup time)
      const duration = Date.now() - startTime;
      recordUsage({
        appId: identity.appId,
        endpoint,
        status: response.status,
        duration,
      });
      
      // Track proxy request in PostHog
      trackProxyRequest({
        userId: identity.userId,
        appId: identity.appId,
        endpoint,
        status: response.status,
        durationMs: duration,
        success: response.status >= 200 && response.status < 400,
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
          // Client disconnected or stream error - this is normal for SSE
          console.error('SSE stream error:', error);
        }
      });
    }
    
    // Non-streaming: read response body
    const responseText = await response.text();
    
    // Record usage
    const duration = Date.now() - startTime;
    recordUsage({
      appId: identity.appId,
      endpoint,
      status: response.status,
      duration,
    });
    
    // Track proxy request in PostHog
    trackProxyRequest({
      userId: identity.userId,
      appId: identity.appId,
      endpoint,
      status: response.status,
      durationMs: duration,
      success: response.status >= 200 && response.status < 400,
    });
    
    // Build response headers (filter sensitive ones)
    const responseHeaders: Record<string, string> = {};
    const allowedResponseHeaders = [
      'content-type', 'content-encoding', 'cache-control',
      'etag', 'last-modified', 'x-request-id',
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
    responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key, X-App-Slug, X-App-ID';
    
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
      endpoint,
      status: 0,
      duration,
    });
    
    // Track failed proxy request
    trackProxyRequest({
      userId: identity.userId,
      appId: identity.appId,
      endpoint,
      status: 0,
      durationMs: duration,
      success: false,
    });
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return c.json({ error: 'Request timed out' }, 504);
      }
      return c.json({ error: error.message }, 502);
    }
    
    return c.json({ error: 'Proxy request failed' }, 502);
  }
});

/**
 * OPTIONS /proxy/:endpoint/*
 * Handle CORS preflight requests
 */
proxy.options('/:endpoint/*', (c) => {
  return c.body(null, 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-App-Slug, X-App-ID',
  });
});

/**
 * GET /proxy
 * List available proxy endpoints
 */
proxy.get('/', (c) => {
  return c.json({
    endpoints: Object.entries(PROXY_ENDPOINTS).map(([name, config]) => ({
      name,
      target: config.target,
      secretKey: config.secretKey,
      description: config.description,
      usage: `POST /proxy/${name}/...`,
    })),
  });
});

export { proxy };
/**
 * Proxy routes for OnHyper.io
 * 
 * The core proxy service that injects user secrets into API requests.
 * Allows published apps to call external APIs securely without exposing keys.
 */

import { Hono } from 'hono';
import { PROXY_ENDPOINTS, config } from '../config.js';
import { getSecretValue } from '../lib/secrets.js';
import { getAppBySlug, getAppById } from '../lib/apps.js';
import { getApiKeyByKey, getUserById, verifyToken } from '../lib/users.js';
import { recordUsage } from '../lib/usage.js';

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
  
  // Get the user's secret for this endpoint
  const secretValue = getSecretValue(identity.userId, endpointConfig.secretKey);
  
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
    const forwardHeaders = ['content-type', 'accept', 'accept-encoding', 'accept-language'];
    for (const header of forwardHeaders) {
      const value = c.req.header(header);
      if (value) {
        headers[header] = value;
      }
    }
    
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
    
    // Read response body
    const responseText = await response.text();
    
    // Record usage
    const duration = Date.now() - startTime;
    recordUsage({
      appId: identity.appId,
      endpoint,
      status: response.status,
      duration,
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
    const contentType = response.headers.get('content-type') || '';
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
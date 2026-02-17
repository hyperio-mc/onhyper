/**
 * Subdomain Router Middleware for OnHyper.io
 * 
 * Routes subdomain requests to the correct published app.
 * App subdomains: `{subdomain}.onhyper.io`
 * 
 * ## Routing Logic
 * 
 * 1. Extract subdomain from Host header
 * 2. Skip for main domain (onhyper.io, www.onhyper.io)
 * 3. Check if reserved → redirect to main domain
 * 4. Look up app by subdomain (WHERE subdomain = ?)
 * 5. If found → render the app
 * 6. If not found → render 404 page
 * 
 * ## Reserved Subdomains
 * 
 * These subdomains are reserved for OnHyper internal use and will
 * redirect to the main domain:
 * 
 * - www, api, docs, blog, app, dashboard, support, mail, smtp, imap, pop
 * - admin, status, billing, pricing, legal, privacy, terms, help, cdn
 * - dev, staging, test, beta, alpha, localhost, staging-api
 * 
 * ## Integration
 * 
 * This middleware should be added early in the Hono chain,
 * before the static file server but after logger/cors:
 * 
 * ```typescript
 * app.use('*', logger());
 * app.use('*', cors());
 * app.use('*', subdomainRouter);  // <-- Here
 * app.use('*', rateLimit);
 * ```
 * 
 * @module middleware/subdomain
 */

import { Context, Next } from 'hono';
import { getDatabase, App } from '../lib/db.js';
import { AppContentStore } from '../lib/lmdb.js';

/**
 * Reserved subdomains that cannot be claimed by users
 * These redirect to the main domain
 */
const RESERVED_SUBDOMAINS = new Set([
  // Core service
  'www',
  'api',
  'app',
  'dashboard',
  'admin',
  'cdn',
  
  // Documentation & support
  'docs',
  'help',
  'support',
  'status',
  
  // Marketing
  'blog',
  'pricing',
  'legal',
  'privacy',
  'terms',
  
  // Email
  'mail',
  'smtp',
  'imap',
  'pop',
  
  // Development
  'dev',
  'staging',
  'test',
  'beta',
  'alpha',
  'localhost',
  'staging-api',
  'billing',
]);

/**
 * Main domain hostnames that should not be processed as subdomains
 */
const MAIN_DOMAINS = new Set([
  'onhyper.io',
  'www.onhyper.io',
  'localhost:3000',
  'www.localhost:3000',
  '127.0.0.1:3000',
]);

/**
 * Extract subdomain from Host header
 * Returns null if no subdomain or it's a main domain
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0].toLowerCase();
  
  // Check if it's a main domain
  if (MAIN_DOMAINS.has(hostWithoutPort) || MAIN_DOMAINS.has(host)) {
    return null;
  }
  
  // Match subdomain pattern: {subdomain}.onhyper.io or {subdomain}.localhost
  const match = hostWithoutPort.match(/^([a-z0-9][a-z0-9-]{0,62})\.(onhyper\.io|localhost)$/i);
  
  if (!match) {
    return null;
  }
  
  const subdomain = match[1].toLowerCase();
  
  // Validate subdomain format
  // Must start with letter or number, can't end with hyphen
  if (subdomain.endsWith('-') || !/^[a-z0-9]/.test(subdomain)) {
    return null;
  }
  
  return subdomain;
}

/**
 * Get app by subdomain
 */
function getAppBySubdomain(subdomain: string): App | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM apps WHERE subdomain = ?')
    .get(subdomain) as App | undefined || null;
}

/**
 * Render 404 page for unknown subdomain
 */
function render404(subdomain: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>App Not Found | OnHyper.io</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          text-align: center; 
          padding: 50px 20px;
          margin: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #f8fafc;
        }
        h1 { 
          color: #6366f1; 
          font-size: 24px;
          margin-bottom: 16px;
        }
        p { 
          color: #94a3b8; 
          font-size: 16px;
          margin-bottom: 24px;
        }
        a { 
          color: #6366f1; 
          text-decoration: none;
          font-weight: 500;
          padding: 10px 20px;
          border: 1px solid #6366f1;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        a:hover {
          background: #6366f1;
          color: white;
        }
        .subdomain {
          font-family: monospace;
          background: rgba(99, 102, 241, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          color: #6366f1;
        }
      </style>
    </head>
    <body>
      <h1>App Not Found</h1>
      <p>The app <span class="subdomain">${subdomain}</span> doesn't exist or hasn't been published yet.</p>
      <p><a href="https://onhyper.io">Return to OnHyper.io</a></p>
    </body>
    </html>
  `;
}

/**
 * Render app HTML with injected configuration
 */
function renderAppHtml(app: App): string {
  // Get content from LMDB for fast access
  const content = AppContentStore.get(app.id);
  
  const html = content?.html || app.html || '';
  const css = content?.css || app.css || '';
  const js = content?.js || app.js || '';
  
  // Render the app with injected styles and scripts
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${app.name} | OnHyper.io</title>
      <style>
        /* Base reset */
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        
        /* User CSS */
        ${css}
      </style>
    </head>
    <body>
      ${html}
      
      <!-- Proxy base URL for API calls -->
      <script>
        // Configure proxy base
        window.ONHYPER = {
          proxyBase: '/proxy',
          appSlug: '${app.slug}',
          appId: '${app.id}',
          subdomain: '${app.subdomain}'
        };
      </script>
      
      <!-- User JS -->
      <script>${js}</script>
    </body>
    </html>
  `;
}

/**
 * Subdomain router middleware
 * 
 * Routes subdomain requests to the correct app.
 * If subdomain is reserved or not found, handles appropriately.
 */
export async function subdomainRouter(c: Context, next: Next) {
  const host = c.req.header('host') || '';
  const subdomain = extractSubdomain(host);
  
  // No subdomain or main domain - continue to next handler
  if (!subdomain) {
    return next();
  }
  
  // Check if reserved - redirect to main domain
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    // Keep the path but redirect to main domain
    const path = c.req.path;
    const redirectUrl = path === '/' 
      ? 'https://onhyper.io' 
      : `https://onhyper.io${path}`;
    return c.redirect(redirectUrl, 302);
  }
  
  // Look up app by subdomain
  const app = getAppBySubdomain(subdomain);
  
  // App not found - show 404
  if (!app) {
    return c.html(render404(subdomain), 404);
  }
  
  // Render the app
  const html = renderAppHtml(app);
  return c.html(html);
}

export { RESERVED_SUBDOMAINS, extractSubdomain };
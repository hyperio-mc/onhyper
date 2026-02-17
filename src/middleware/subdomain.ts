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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDatabase, App } from '../lib/db.js';
import { AppContentStore } from '../lib/lmdb.js';

// Get current directory for resolving template path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Cache for the 404 template
 */
let cached404Template: string | null = null;

/**
 * Load the 404 template from disk (synchronous, cached)
 */
function load404Template(): string {
  if (cached404Template) {
    return cached404Template;
  }
  
  try {
    // Resolve path relative to this module
    const templatePath = join(__dirname, '../../public/subdomain-404.html');
    cached404Template = readFileSync(templatePath, 'utf-8');
    return cached404Template;
  } catch (error) {
    console.warn('[subdomain] Could not load 404 template, using fallback:', error);
    // Fallback to minimal template if file not found
    return getFallback404Template();
  }
}

/**
 * Fallback 404 template if file can't be loaded
 */
function getFallback404Template(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subdomain Available | OnHyper.io</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f1f5f9;padding:2rem}
    .container{text-align:center;max-width:480px}
    .logo{font-size:2rem;font-weight:700;margin-bottom:2rem}
    .logo span{background:linear-gradient(135deg,#2563eb 0%,#6366f1 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .subdomain{font-family:monospace;background:rgba(99,102,241,0.2);padding:0.5rem 1rem;border-radius:999px;color:#6366f1;display:inline-block;margin:1rem 0}
    h1{font-size:1.5rem;margin-bottom:0.75rem}
    p{color:#94a3b8;margin-bottom:1.5rem}
    .btn{display:inline-block;padding:0.875rem 1.5rem;border-radius:8px;font-weight:500;text-decoration:none;margin:0.5rem;background:linear-gradient(135deg,#2563eb 0%,#6366f1 100%);color:white}
    .btn:hover{transform:translateY(-2px)}
    .btn-secondary{background:transparent;border:1px solid #334155;color:#f1f5f9}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>OnHyper</span></div>
    <h1>Subdomain Available</h1>
    <div class="subdomain" id="subdomain-name">SUBDOMAIN_PLACEHOLDER</div>
    <p>This subdomain is available. Create your app and claim it!</p>
    <a href="https://onhyper.io#/login" class="btn">Login to Claim</a>
    <a href="https://onhyper.io" class="btn btn-secondary">Back to OnHyper.io</a>
  </div>
</body>
</html>`;
}

/**
 * Render 404 page for unknown subdomain
 * Uses the static HTML template with subdomain injected
 */
function render404(subdomain: string): string {
  const template = load404Template();
  
  // Escape subdomain for safe HTML/JS insertion
  const escapedSubdomain = subdomain
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, "\\'");
  
  // Replace the placeholder subdomain in the template
  return template
    .replace(
      'id="subdomain-name">subdomain.onhyper.io',
      `id="subdomain-name">${escapedSubdomain}.onhyper.io`
    )
    .replace(
      '</body>',
      `<script>
        // Inject subdomain from server
        if (window.setSubdomainName) {
          window.setSubdomainName('${escapedSubdomain}');
        }
      </script></body>`
    );
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
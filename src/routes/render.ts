/**
 * App Rendering Routes for OnHyper.io
 * 
 * Serves published web applications with injected configuration.
 * Each app gets a unique URL: `https://onhyper.io/a/{slug}`
 * 
 * ## URL Structure
 * 
 * - `/a/:slug` - Render full HTML page with app
 * - `/a/:slug/raw` - Get raw HTML content
 * - `/a/:slug/css` - Get CSS stylesheet
 * - `/a/:slug/js` - Get JavaScript code
 * 
 * ## Rendering Flow
 * 
 * ```
 * Request: GET /a/my-app-abc123
 *      │
 *      ▼
 * Lookup app by slug in SQLite
 *      │
 *      ▼
 * Get cached content from LMDB (fast!)
 *      │
 *      ▼
 * Build HTML with:
 *   - Base styles (CSS reset)
 *   - User's CSS
 *   - User's HTML
 *   - Injected window.ONHYPER config
 *   - User's JavaScript
 *      │
 *      ▼
 * Return complete HTML page
 * ```
 * 
 * ## Injected Configuration
 * 
 * Every rendered app receives:
 * 
 * ```javascript
 * window.ONHYPER = {
 *   proxyBase: '/proxy',        // Base URL for proxy requests
 *   appSlug: 'my-app-abc123',   // App's unique slug
 *   appId: 'uuid'               // App's database ID
 * };
 * ```
 * 
 * This enables apps to make proxy requests:
 * 
 * ```javascript
 * const response = await fetch(`${ONHYPER.proxyBase}/scoutos/...`, {
 *   method: 'POST',
 *   headers: { 'X-App-Slug': ONHYPER.appSlug },
 *   body: JSON.stringify({ ... })
 * });
 * ```
 * 
 * ## Endpoints
 * 
 * ### GET /a/:slug
 * Render a published app as a full HTML page.
 * 
 * **Response (200):** Full HTML page with styles and scripts
 * 
 * **Response (404):** Not found page with link back to home
 * 
 * ### GET /a/:slug/raw
 * Get raw HTML content.
 * 
 * **Response (200):** Plain text HTML
 * 
 * ### GET /a/:slug/css
 * Get CSS stylesheet.
 * 
 * **Response (200):** CSS with `text/css` content type
 * 
 * ### GET /a/:slug/js
 * Get JavaScript code.
 * 
 * **Response (200):** JavaScript with `application/javascript` content type
 * 
 * ## Security
 * 
 * - Apps are public (no authentication to view)
 * - Proxy calls require auth (see proxy.ts)
 * - Content-Security-Policy headers restrict script execution to inline scripts
 * - User-controlled values are escaped when interpolated into templates
 * 
 * @module routes/render
 */

import { Hono } from 'hono';
import { getAppBySlug } from '../lib/apps.js';
import { AppContentStore } from '../lib/lmdb.js';
import { trackAppView } from '../lib/appAnalytics.js';

const render = new Hono();

/**
 * Escape HTML special characters to prevent XSS
 * Use this for any user-controlled data interpolated into HTML templates
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape JavaScript string literals to prevent injection
 * Use this when interpolating values into <script> blocks
 */
function escapeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Content-Security-Policy header for sandboxed app rendering
 * Allows inline scripts and styles but restricts external resources
 */
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // Required for user scripts
  "style-src 'self' 'unsafe-inline'",   // Required for user styles
  "img-src 'self' data: https:",        // Allow images from self, data URIs, and HTTPS
  "font-src 'self' data:",              // Allow fonts from self and data URIs
  "connect-src 'self' https:",          // Allow API calls to self and HTTPS
  "frame-ancestors 'none'",             // Prevent embedding in iframes
  "base-uri 'self'",                    // Restrict <base> tag
  "form-action 'self'",                 // Restrict form submissions
].join('; ');

/**
 * Set security headers on response
 */
function setSecurityHeaders(c: any): void {
  c.header('Content-Security-Policy', CSP_HEADER);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
}

/**
 * GET /a/:slug
 * Render a published app
 */
render.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  const app = getAppBySlug(slug);
  
  if (!app) {
    // Escape the slug to prevent XSS in error message
    const escapedSlug = escapeHtml(slug);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>App Not Found | OnHyper.io</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #333; }
          p { color: #666; }
          a { color: #0066cc; }
        </style>
      </head>
      <body>
        <h1>App Not Found</h1>
        <p>The app "${escapedSlug}" doesn't exist or has been removed.</p>
        <p><a href="https://onhyper.io">Return to OnHyper.io</a></p>
      </body>
      </html>
    `, 404);
  }
  
  // Check for ZIP upload first - serve index.html if exists
  const { AppFilesStore } = await import('../lib/lmdb.js');
  const zipIndexHtml = AppFilesStore.get(app.id, 'index.html');
  
  if (!zipIndexHtml) {
    console.log('[RENDER] WARNING: No ZIP content, falling back to app.html');
    console.log('[RENDER] app.id from DB:', app.id);
  }
  
  if (zipIndexHtml) {
    // Inject ONHYPER config into the ZIP's index.html
    const onhyperConfig = `
      <script>
        window.ONHYPER = {
          proxyBase: '/proxy',
          appSlug: '${escapeJs(app.slug)}',
          appId: '${escapeJs(app.id)}'
        };
      </script>
    `;
    
    // Rewrite absolute paths to relative paths for sub-path deployment
    // Vite apps use /assets/... which need to become ./assets/...
    // Next.js uses /_next/... which needs to become ./_next/... 
    // (so browser resolves to /a/slug/_next/... correctly)
    // 
    // But DON'T rewrite framework paths that need to stay absolute:
    // - /a/... (our app paths)
    // - /api/... (API routes)
    let modifiedHtml = zipIndexHtml
      .replace(/href="\/a\//g, 'href="/a/')
      .replace(/src="\/a\//g, 'src="/a/')
      .replace(/href="\/api\//g, 'href="/api/')
      .replace(/src="\/api\//g, 'src="/api/')
      .replace(/href="\/_next\//g, 'href="./_next/')  // Next.js: /_next/ -> ./_next/
      .replace(/src="\/_next\//g, 'src="./_next/')
      .replace(/href="\/_vercel\//g, 'href="./_vercel/')
      .replace(/src="\/_vercel\//g, 'src="./_vercel/')
      .replace(/href="\//g, 'href="./')  // Other /assets/ -> ./assets/
      .replace(/src="\//g, 'src="./');
    
    console.log('[RENDER] EARLY PATH - using zipIndexHtml');
    
    if (zipIndexHtml.includes('</body>')) {
      modifiedHtml = modifiedHtml.replace('</body>', `${onhyperConfig}</body>`);
    } else {
      modifiedHtml = modifiedHtml + onhyperConfig;
    }
    
    setSecurityHeaders(c);
    return c.html(modifiedHtml, 200);
  }
  
  // Get content from LMDB
  const content = AppContentStore.get(app.id);
  
  // Track page view (async, non-blocking)
  const referrer = c.req.header('referer') || undefined;
  const userAgent = c.req.header('user-agent') || undefined;
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 
             c.req.header('x-real-ip') || 
             (c.env as any)?.ip ||
             'unknown';
  
  // Use setImmediate for non-blocking tracking
  setImmediate(() => {
    try {
      trackAppView(app.id, { referrer, userAgent, ipAddress: ip });
    } catch (e) {
      console.error('[Analytics] Failed to track view:', e);
    }
  });
  
  const html = content?.html || app.html || '';
  const css = content?.css || app.css || '';
  const js = content?.js || app.js || '';
  
  // Check if HTML is a full document (has DOCTYPE or html tag)
  // If so, serve it directly without wrapping (for ZIP uploads)
  const isFullDocument = html.trim().toLowerCase().startsWith('<!doctype') || 
                         html.trim().toLowerCase().startsWith('<html');
  
  if (isFullDocument) {
    console.log('[RENDER] Serving full document, html length:', html.length);
    console.log('[RENDER] HTML starts:', html.trim().substring(0, 30));
    
    // Inject ONHYPER config into the full document
    // Add test marker
    let htmlWithMarker = html.replace(/<html/, '<html<!--FULL_DOCUMENT_PATH-->');
    
    const onhyperConfig = `
      <script>
        window.ONHYPER = {
          proxyBase: '/proxy',
          appSlug: '${escapeJs(app.slug)}',
          appId: '${escapeJs(app.id)}'
        };
      </script>
    `;
    
    // Transform absolute paths to relative for sub-path deployment
    let transformedHtml = html
      .replace(/<html/, '<html<!--TRANSFORMED-->')
      .replace(/href="\/a\//g, 'href="/a/')
      .replace(/src="\/a\//g, 'src="/a/')
      .replace(/href="\/api\//g, 'href="/api/')
      .replace(/src="\/api\//g, 'src="/api/')
      .replace(/href="\/_next\//g, 'href="./_next/')
      .replace(/src="\/_next\//g, 'src="./_next/')
      .replace(/href="\/_vercel\//g, 'href="./_vercel/')
      .replace(/src="\/_vercel\//g, 'src="./_vercel/')
      .replace(/href="\//g, 'href="./')
      .replace(/src="\//g, 'src="./');
    
    // Inject before </body> or at end of document
    let modifiedHtml = transformedHtml;
    if (transformedHtml.includes('</body>')) {
      modifiedHtml = transformedHtml.replace('</body>', `${onhyperConfig}</body>`);
    } else {
      modifiedHtml = transformedHtml + onhyperConfig;
    }
    
    // Set security headers
    setSecurityHeaders(c);
    console.log('[RENDER] FALLBACK PATH - full document path');
    return c.html(modifiedHtml, 200);
  }
  
  // Escape user-controlled values for safe interpolation
  const escapedAppName = escapeHtml(app.name);
  const escapedAppSlug = escapeJs(app.slug);
  const escapedAppId = escapeJs(app.id);
  
  // Render the app with injected styles and scripts
  const renderedHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapedAppName} | OnHyper.io</title>
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
          appSlug: '${escapedAppSlug}',
          appId: '${escapedAppId}'
        };
      </script>
      
      <!-- User JS -->
      <script>${js}</script>
    </body>
    </html>
  `;
  
  // Set security headers
  setSecurityHeaders(c);
  
  return c.html(renderedHtml);
});

/**
 * GET /a/:slug/raw
 * Get raw HTML of an app
 */
render.get('/:slug/raw', async (c) => {
  const slug = c.req.param('slug');
  
  const app = getAppBySlug(slug);
  
  if (!app) {
    return c.text('App not found', 404);
  }
  
  const content = AppContentStore.get(app.id);
  
  // Set security headers for raw content
  setSecurityHeaders(c);
  
  return c.text(content?.html || app.html || '');
});

/**
 * GET /a/:slug/css
 * Get CSS of an app
 */
render.get('/:slug/css', async (c) => {
  const slug = c.req.param('slug');
  
  const app = getAppBySlug(slug);
  
  if (!app) {
    return c.text('App not found', 404);
  }
  
  const content = AppContentStore.get(app.id);
  
  // Set security headers
  c.header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  c.header('X-Content-Type-Options', 'nosniff');
  
  return c.text(content?.css || app.css || '', 200, {
    'Content-Type': 'text/css',
  });
});

/**
 * GET /a/:slug/js
 * Get JS of an app
 */
render.get('/:slug/js', async (c) => {
  const slug = c.req.param('slug');
  
  const app = getAppBySlug(slug);
  
  if (!app) {
    return c.text('App not found', 404);
  }
  
  const content = AppContentStore.get(app.id);
  
  // Set security headers
  c.header('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'");
  c.header('X-Content-Type-Options', 'nosniff');
  
  return c.text(content?.js || app.js || '', 200, {
    'Content-Type': 'application/javascript',
  });
});

/**
 * Catch-all route for static files from ZIP uploads
 * Serves files at /a/:slug/* for apps with ZIP uploads
 */
render.get('/:slug/*', async (c) => {
  const slug = c.req.param('slug');
  const basePath = `/a/${slug}/`;
  let filePath = c.req.path.slice(basePath.length);
  
  const app = getAppBySlug(slug);
  
  if (!app) {
    return c.text('Not Found', 404);
  }
  
  // If filePath is empty, serve index.html (root of app)
  if (!filePath) {
    filePath = 'index.html';
  }
  
  // Try to serve static file from ZIP upload
  const { AppFilesStore } = await import('../lib/lmdb.js');
  const fileMatch = filePath.match(/\.([^/]+)$/);
  const isUnderscorePath = filePath.startsWith('_');
  
  // Try exact path first
  let file = AppFilesStore.get(app.id, filePath);
  
  // If not found and has no extension, try adding .html
  if (!file && !fileMatch && !isUnderscorePath) {
    file = AppFilesStore.get(app.id, filePath + '.html');
  }
  
  // If still not found, try /index.html (nested routes)
  if (!file && !fileMatch && !isUnderscorePath && !filePath.endsWith('/index.html')) {
    file = AppFilesStore.get(app.id, filePath + '/index.html');
  }
  
  // If still not found and has path components, try just the filename
  // (handles case where ZIP strips root folder like assets/index.js -> index.js)
  if (!file && filePath.includes('/')) {
    const filename = filePath.split('/').pop();
    if (filename) {
      file = AppFilesStore.get(app.id, filename);
    }
  }
  
  if (file) {
    const ext = fileMatch ? fileMatch[1].toLowerCase() : filePath.split('.').pop() || '';
    const contentTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'mjs': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'ico': 'image/x-icon',
      'webp': 'image/webp',
      'avif': 'image/avif',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Handle SVG specially
    if ((ext === 'svg') && (file.startsWith('<?xml') || file.includes('<svg'))) {
      return c.text(file, 200, { 'Content-Type': 'image/svg+xml' });
    }
    
    return c.text(file, 200, { 'Content-Type': contentType });
  }
  
  return c.text('Not Found', 404);
});

export { render };
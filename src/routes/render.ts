/**
 * App Rendering Routes for OnHyper.io
 * 
 * Serves published web applications with injected configuration.
 * 
 * ## URL Structure (Path-Based)
 * 
 * Apps are primarily accessed via subdomain URLs (handled at the routing layer):
 *   `https://my-app.onhyper.io/` → App served by Host header matching
 * 
 * This module handles path-based URLs as a fallback:
 *   `https://onhyper.io/a/{slug}` → Alternative access for apps
 * 
 * Route structure:
 * - `/a/:slug` - Render full HTML page with app
 * - `/a/:slug/raw` - Get raw HTML content
 * - `/a/:slug/css` - Get CSS stylesheet
 * - `/a/:slug/js` - Get JavaScript code
 * - `/a/:slug/*` - Static files from ZIP uploads (catch-all)
 * 
 * ## Subdomain Resolution
 * 
 * Subdomain routing is handled at the request level (see src/index.ts):
 * 1. Extract subdomain from Host header (e.g., "my-app.onhyper.io")
 * 2. Look up app by subdomain in apps table
 * 3. Route to renderer with app context
 * 
 * This file handles the path-based fallback for:
 * - Apps without subdomains (free tier)
 * - Direct access by slug
 * - Static file serving for ZIP uploads
 * 
 * ## ZIP Upload Handling
 * 
 * Apps deployed from ZIP files get their contents stored in LMDB (AppFilesStore):
 * - ZIP is extracted, stripping common root folder
 * - Files stored with relative paths: index.html, assets/main.js, etc.
 * - _next/ and _vercel/ folders preserved for framework compatibility
 * - index.html becomes app's main entry point
 * 
 * Static file serving:
 * - `/a/:slug/_next/*` - Next.js static assets
 * - `/a/:slug/_vercel/*` - Vercel static assets  
 * - `/a/:slug/:file` - Root-level assets (favicon, etc.)
 * - `/a/:slug/*` - Catch-all for nested paths
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
 * 
 * Security model:
 * - Apps run in isolated iframes (frame-ancestors 'none')
 * - Inline scripts allowed (required for user code)
 * - External connections allowed via HTTPS (for API calls)
 * - Images allowed from data: URIs and HTTPS sources
 * 
 * This allows published HYPR apps to make API calls while
 * preventing clickjacking and other embedding attacks.
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
 * GET /a/:slug/_next/* - Serve Next.js static assets
 * 
 * Next.js apps exported with `output: 'export'` place build artifacts
 * in _next/ directory. This route serves those files directly from
 * the ZIP upload stored in AppFilesStore.
 * 
 * Examples:
 * - /a/my-app/_next/static/abc123/_buildManifest.js
 * - /a/my-app/_next/static/chunks/main.js
 * 
 * Files are cached with max-age=31536000 (1 year) since they include
 * content hashes in filenames for cache busting.
 */
render.get('/:slug/_next/:path*', async (c) => {
  const slug = c.req.param('slug');
  const assetPath = c.req.param('path') || '';
  
  const app = getAppBySlug(slug);
  if (!app) {
    return c.text('Not found', 404);
  }
  
  // Try to get from AppFilesStore
  const { AppFilesStore } = await import('../lib/lmdb.js');
  const content = AppFilesStore.get(app.id, `_next/${assetPath}`);
  
  if (content) {
    // Determine content type
    let contentType = 'application/octet-stream';
    if (assetPath.endsWith('.js')) contentType = 'application/javascript';
    else if (assetPath.endsWith('.css')) contentType = 'text/css';
    else if (assetPath.endsWith('.woff2')) contentType = 'font/woff2';
    else if (assetPath.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (assetPath.endsWith('.png')) contentType = 'image/png';
    else if (assetPath.endsWith('.ico')) contentType = 'image/x-icon';
    
    return c.body(content, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000'
    });
  }
  
  return c.text('Asset not found', 404);
});

/**
 * GET /a/:slug/:file - Serve root-level static assets
 * 
 * Handles single files at the root level of a ZIP upload:
 * - favicon.ico, logo.svg, robots.txt, etc.
 * 
 * Security: Path traversal prevented by checking for '..' and '/'
 */
render.get('/:slug/:file', async (c) => {
  const slug = c.req.param('slug');
  const file = c.req.param('file');
  if (!file || file.includes('..') || file.includes('/')) {
    return c.text('Invalid path', 400);
  }
  
  const app = getAppBySlug(slug);
  if (!app) return c.text('Not found', 404);
  
  const { AppFilesStore } = await import('../lib/lmdb.js');
  const content = AppFilesStore.get(app.id, file);
  
  if (content) {
    let contentType = 'application/octet-stream';
    if (file.endsWith('.js')) contentType = 'application/javascript';
    else if (file.endsWith('.css')) contentType = 'text/css';
    else if (file.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (file.endsWith('.png')) contentType = 'image/png';
    else if (file.endsWith('.ico')) contentType = 'image/x-icon';
    
    return c.body(content, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000'
    });
  }
  
  return c.text('Asset not found', 404);
});

/**
 * GET /a/:slug/_vercel/* - Serve Vercel-build static assets
 * 
 * Vercel builds place certain assets in _vercel/ directory.
 * Served same as _next/ with aggressive caching.
 */
render.get('/:slug/_vercel/:path*', async (c) => {
  const slug = c.req.param('slug');
  const assetPath = c.req.param('path') || '';
  
  const app = getAppBySlug(slug);
  if (!app) {
    return c.text('Not found', 404);
  }
  
  const { AppFilesStore } = await import('../lib/lmdb.js');
  const content = AppFilesStore.get(app.id, `_vercel/${assetPath}`);
  
  if (content) {
    let contentType = 'application/octet-stream';
    if (assetPath.endsWith('.js')) contentType = 'application/javascript';
    else if (assetPath.endsWith('.css')) contentType = 'text/css';
    
    return c.body(content, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000'
    });
  }
  
  return c.text('Asset not found', 404);
});

/**
 * GET /a/:slug
 * Render a published app
 * 
 * ## Render Flow
 * 
 * 1. Look up app by slug in SQLite database
 * 2. Check for ZIP upload (index.html in AppFilesStore)
 *    - If ZIP: Transform paths to relative, inject ONHYPER config
 *    - If no ZIP: Render inline HTML/CSS/JS from database
 * 3. Set security headers (CSP, X-Frame-Options, etc.)
 * 4. Track page view analytics
 * 
 * ## Path Transformation (for ZIP uploads)
 * 
 * ZIP uploads may have absolute paths that need to be made relative
 * when deployed at /a/{slug}/:
 * 
 * - `/assets/main.js` → `./assets/main.js`
 * - Keeps /a/, /api/, /proxy/ paths absolute (OnHyper system routes)
 * - Keeps //protocol URLs absolute (CDN links, etc.)
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
    
    // Transform absolute paths to relative for sub-path deployment
    // Uses lookbehind to find / right after href=" or src="
    // Negative lookahead ensures we don't match:
    //   - // (protocol-relative URLs like //cdn.example.com)
    //   - /. (paths like /./ or /../ which are already relative-ish)
    //   - /a/ /api/ /proxy/ (OnHyper system routes that must stay absolute)
    // Note: We DO transform /_next/ and /_vercel/ paths because they need
    // to be relative when the app is deployed at /a/{slug}/
    function toRelative(html: string): string {
      return html
        .replace(/(?<=href=")\/(?!\/|\.|a\/|api\/|proxy\/)/g, './')
        .replace(/(?<=src=")\/(?!\/|\.|a\/|api\/|proxy\/)/g, './');
    }
    
    let modifiedHtml = toRelative(zipIndexHtml);
    
    // Add debug marker to verify transformation happened
    modifiedHtml = modifiedHtml.replace('<head>', '<head><!--TRANSFORMED-->');
    
    if (modifiedHtml.includes('</body>')) {
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
  
  // Check if HTML is a full document (has DOCTYPE, html tag, or body tags)
  // More lenient detection to avoid wrapping complete documents
  const normalizedHtml = html.trim().toLowerCase();
  const isFullDocument = 
    normalizedHtml.startsWith('<!doctype') ||
    normalizedHtml.startsWith('<html') ||
    normalizedHtml.includes('<html ') ||
    normalizedHtml.includes('</html>') ||
    normalizedHtml.includes('</body>');
  
  // ONHYPER config to inject
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
  function toRelative(html: string): string {
    return html
      .replace(/(?<=href=")\/(?!\/|\.|a\/|api\/|proxy\/)/g, './')
      .replace(/(?<=src=")\/(?!\/|\.|a\/|api\/|proxy\/)/g, './');
  }
  
  if (isFullDocument) {
    // Full HTML document - inject ONHYPER config and serve as-is
    let transformedHtml = toRelative(html);
    
    // Inject before </body> or at end
    if (transformedHtml.includes('</body>')) {
      transformedHtml = transformedHtml.replace('</body>', `${onhyperConfig}</body>`);
    } else if (transformedHtml.includes('</html>')) {
      transformedHtml = transformedHtml.replace('</html>', `${onhyperConfig}</html>`);
    } else {
      transformedHtml = transformedHtml + onhyperConfig;
    }
    
    setSecurityHeaders(c);
    return c.html(transformedHtml, 200);
  }
  
  // For fragments, serve HTML directly without wrapper template
  // This allows agents to publish HTML/JS/CSS that works as-is
  // CSS and JS can be referenced via /a/:slug/css and /a/:slug/js endpoints
  let fragmentHtml = toRelative(html);
  
  // Just append ONHYPER config to the fragment
  fragmentHtml = fragmentHtml + onhyperConfig;
  
  // Set security headers
  setSecurityHeaders(c);
  
  return c.html(fragmentHtml);
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
 * 
 * ## File Resolution Strategy
 * 
 * This catch-all handles requests for any file within a ZIP upload:
 * 
 * 1. Exact match: /a/my-app/images/logo.png → images/logo.png
 * 2. HTML fallback: /a/my-app/about → about.html (if no extension)
 * 3. Index fallback: /a/my-app/about → about/index.html
 * 4. Filename fallback: /a/my-app/assets/logo.png → logo.png (strips path)
 * 
 * This supports various export patterns from different frameworks:
 * - Next.js: _next/static/..., pages as .html files
 * - Vite: assets/index.js, assets/index.css
 * - Plain HTML: Direct file references
 * 
 * Content types auto-detected from file extension.
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
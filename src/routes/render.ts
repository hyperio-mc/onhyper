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
 * const response = await fetch(`${ONHYPER.proxyBase}/scout-atoms/...`, {
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
 * - Content is not sanitized (user responsibility)
 * 
 * @module routes/render
 */

import { Hono } from 'hono';
import { getAppBySlug } from '../lib/apps.js';
import { AppContentStore } from '../lib/lmdb.js';

const render = new Hono();

/**
 * GET /a/:slug
 * Render a published app
 */
render.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  const app = getAppBySlug(slug);
  
  if (!app) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
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
        <p>The app "${slug}" doesn't exist or has been removed.</p>
        <p><a href="https://onhyper.io">Return to OnHyper.io</a></p>
      </body>
      </html>
    `, 404);
  }
  
  // Get content from LMDB
  const content = AppContentStore.get(app.id);
  
  const html = content?.html || app.html || '';
  const css = content?.css || app.css || '';
  const js = content?.js || app.js || '';
  
  // Render the app with injected styles and scripts
  const renderedHtml = `
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
          appId: '${app.id}'
        };
      </script>
      
      <!-- User JS -->
      <script>${js}</script>
    </body>
    </html>
  `;
  
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
  return c.text(content?.js || app.js || '', 200, {
    'Content-Type': 'application/javascript',
  });
});

export { render };
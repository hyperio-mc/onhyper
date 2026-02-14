/**
 * App rendering routes for OnHyper.io
 * 
 * Serves published apps at /a/:slug
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
/**
 * OnHyper.io - Secure Proxy Service for API-Backed Web Apps
 * 
 * Single server deployment - serves static frontend + API routes
 */

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config.js';
import { initDatabase, closeDatabase } from './lib/db.js';
import { initLMDB, closeLMDB } from './lib/lmdb.js';
import { shutdownAnalytics } from './lib/analytics.js';
import { auth } from './routes/auth.js';
import { secrets } from './routes/secrets.js';
import { apps } from './routes/apps.js';
import { dashboard } from './routes/dashboard.js';
import { proxy } from './routes/proxy.js';
import { render } from './routes/render.js';
import { waitlist } from './routes/waitlist.js';
import { unsubscribe } from './routes/unsubscribe.js';
import { requireAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', rateLimit);

// Serve static files from frontend dist
// In production, these files are built from the Vite frontend
const DIST_PATH = config.staticPath || './dist';

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Debug endpoint to check static files
app.get('/debug/static', async (c) => {
  const fs = await import('fs/promises');
  const path = await import('path');
  try {
    const staticPath = DIST_PATH;
    const entries = await fs.readdir(staticPath);
    const indexExists = await fs.access(path.join(staticPath, 'index.html')).then(() => true).catch(() => false);
    return c.json({
      staticPath,
      exists: true,
      files: entries.slice(0, 20),
      indexHtmlExists: indexExists,
      cwd: process.cwd(),
      env: {
        STATIC_PATH: process.env.STATIC_PATH,
        PORT: process.env.PORT
      }
    });
  } catch (err: any) {
    return c.json({
      staticPath: DIST_PATH,
      exists: false,
      error: err.message,
      cwd: process.cwd(),
      env: {
        STATIC_PATH: process.env.STATIC_PATH,
        PORT: process.env.PORT
      }
    });
  }
});

// API info
app.get('/api', (c) => {
  return c.json({
    name: 'OnHyper.io API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/signup': 'Create a new account',
        'POST /api/auth/login': 'Authenticate and get JWT',
        'POST /api/auth/token': 'Validate JWT and return user info',
        'GET /api/auth/me': 'Get current user info (requires auth)',
      },
      secrets: {
        'GET /api/secrets': 'List user secrets (masked)',
        'POST /api/secrets': 'Add a new secret',
        'DELETE /api/secrets/:name': 'Delete a secret',
        'GET /api/secrets/check/:name': 'Check if secret exists',
      },
      apps: {
        'GET /api/apps': 'List user apps',
        'POST /api/apps': 'Create a new app',
        'GET /api/apps/:id': 'Get app details',
        'PUT /api/apps/:id': 'Update an app',
        'DELETE /api/apps/:id': 'Delete an app',
      },
      dashboard: {
        'GET /api/dashboard/stats': 'Get dashboard statistics (requires auth)',
      },
      proxy: {
        'GET /proxy': 'List available proxy endpoints',
        'ALL /proxy/:endpoint/*': 'Proxy requests to external API',
      },
      render: {
        'GET /a/:slug': 'Render a published app',
        'GET /a/:slug/raw': 'Get raw HTML',
        'GET /a/:slug/css': 'Get CSS',
        'GET /a/:slug/js': 'Get JS',
      },
      waitlist: {
        'POST /api/waitlist': 'Submit waitlist application',
        'GET /api/waitlist/position': 'Get position in queue',
        'POST /api/waitlist/referral': 'Process referral',
        'GET /api/waitlist/invite/:code': 'Validate invite code',
        'GET /api/waitlist/stats': 'Get global waitlist stats',
      },
    },
  });
});

// Auth routes (public)
app.route('/api/auth', auth);

// Waitlist routes (public) - MUST be before protected /api routes
app.route('/api/waitlist', waitlist);

// Protected API routes
const protectedApi = new Hono();
protectedApi.use('*', requireAuth);
protectedApi.route('/secrets', secrets);
protectedApi.route('/apps', apps);
protectedApi.route('/dashboard', dashboard);
app.route('/api', protectedApi);

// Proxy routes (uses own auth mechanism)
app.route('/proxy', proxy);

// Render routes (public)
app.route('/a', render);

// Unsubscribe routes (public)
app.route('/unsubscribe', unsubscribe);

// Serve static frontend files
// This must come AFTER all API routes
// Add no-cache headers to bust Railway edge caching
app.use('/*', async (c, next) => {
  await next();
  // Add no-cache headers to all responses
  if (c.res.headers.get('content-type')?.includes('text/html')) {
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    c.res.headers.set('Pragma', 'no-cache');
  }
});
app.use('/*', serveStatic({ root: DIST_PATH }));

// SPA fallback - serve index.html for unmatched routes (excluding API and proxy routes)
app.get('*', async (c) => {
  const path = c.req.path;
  
  // Don't fallback for API/proxy/render routes (they should have been handled above)
  if (path.startsWith('/api') || path.startsWith('/proxy') || path.startsWith('/a')) {
    return c.json({ error: 'Not found' }, 404);
  }
  
  // For SPA routes, serve index.html
  try {
    const fs = await import('fs/promises');
    const indexHtml = await fs.readFile(`${DIST_PATH}/index.html`, 'utf-8');
    return c.html(indexHtml, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    });
  } catch (err) {
    console.error('Failed to serve index.html:', err);
    // If no index.html, return a simple message (dev mode or build missing)
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>OnHyper</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:system-ui;">
          <div style="text-align:center">
            <h1 style="color:#6366f1;font-size:48px;margin-bottom:16px">H</h1>
            <p style="color:#64748b">Frontend not built. Run <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">npm run build</code> in frontend/</p>
            <p style="color:#94a3b8;font-size:14px;margin-top:8px">Path: ${DIST_PATH}</p>
          </div>
        </body>
      </html>
    `, 500);
  }
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Initialize and start server
async function main() {
  try {
    console.log('Initializing databases...');
    initDatabase();
    initLMDB();
    console.log(`SQLite database: ${config.sqlitePath}`);
    console.log(`LMDB database: ${config.lmdbPath}`);

    const port = config.port;
    const host = config.host;

    const server = serve({
      fetch: app.fetch,
      port: port,
      hostname: host,
    }, (info) => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗ ██╗███╗   ██╗██████╗  █████╗                       ║
║   ██╔══██╗██║████╗  ██║██╔══██╗██╔══██╗                      ║
║   ██║  ██║██║██╔██╗ ██║██║  ██║███████║                      ║
║   ██║  ██║██║██║╚██╗██║██║  ██║██╔══██║                      ║
║   ██████╔╝██║██║ ╚████║██████╔╝██║  ██║                      ║
║   ╚═════╝ ╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝                      ║
║                                                               ║
║   Secure Proxy Service for API-Backed Web Apps               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Single-server deployment running at http://${info.address}:${port}

Frontend: Served from ${DIST_PATH}
API: /api/*
Proxy: /proxy/*
Render: /a/*

Configuration:
  Database: ${config.sqlitePath}
  LMDB: ${config.lmdbPath}
  JWT Secret: ${process.env.ONHYPER_JWT_SECRET ? 'configured' : 'NOT SET (using default)'}
`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      closeDatabase();
      await closeLMDB();
      await shutdownAnalytics();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
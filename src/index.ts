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
import { config, validateProductionSecrets } from './config.js';
import { initDatabase, closeDatabase } from './lib/db.js';
import { initLMDB, closeLMDB } from './lib/lmdb.js';
import { shutdownAnalytics } from './lib/analytics.js';
import { seedDefaultFeatureFlags } from './lib/features.js';
import { auth } from './routes/auth.js';
import { secrets } from './routes/secrets.js';
import { apps } from './routes/apps.js';
import { dashboard } from './routes/dashboard.js';
import { proxy } from './routes/proxy.js';
import { render } from './routes/render.js';
import { waitlist } from './routes/waitlist.js';
import { unsubscribe } from './routes/unsubscribe.js';
import { blog } from './routes/blog.js';
import { chat } from './routes/chat.js';
import { subdomains } from './routes/subdomains.js';
import { settings } from './routes/settings.js';
import { audit } from './routes/audit.js';
import { featuresRouter, adminFeaturesRouter } from './routes/features.js';
import { requireAuth, requireAdminAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { subdomainRouter } from './middleware/subdomain.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', subdomainRouter);
app.use('*', rateLimit);

// Serve static files from public/ folder
const PUBLIC_PATH = config.staticPath || './public';

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
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
      chat: {
        'POST /api/chat/message': 'Send a message to support agent',
        'POST /api/chat/lead': 'Capture lead from chat',
        'GET /api/chat/status': 'Check chat service status',
      },
      subdomains: {
        'GET /api/subdomains/check?name=X': 'Check if subdomain is available',
        'POST /api/subdomains/claim': 'Claim a subdomain (requires auth)',
        'GET /api/subdomains/mine': 'List owned subdomains (requires auth)',
        'DELETE /api/subdomains/:name': 'Release a subdomain (requires auth)',
      },
    },
  });
});

// API status check (public)
app.get('/api/status', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'operational',
      chat: process.env.SCOUTOS_API_KEY ? 'operational' : 'not_configured',
      email: process.env.RESEND_API_KEY ? 'operational' : 'not_configured',
      analytics: process.env.POSTHOG_API_KEY ? 'operational' : 'not_configured',
    },
  });
});

// Auth routes (public)
app.route('/api/auth', auth);

// Blog routes (public)
app.route('/api/blog', blog);

// Chat routes (public - anonymous support chat)
app.route('/api/chat', chat);

// Waitlist routes (public) - MUST be before protected /api routes
app.route('/api/waitlist', waitlist);

// Subdomain routes (mixed public/protected - handled in-module)
app.route('/api/subdomains', subdomains);

// Feature flag routes (public, requires auth)
app.route('/api/features', featuresRouter);

// Settings routes (uses own auth - supports JWT and API key)
app.route('/api/settings', settings);

// Protected API routes
const protectedApi = new Hono();
protectedApi.use('*', requireAuth);
protectedApi.route('/secrets', secrets);
protectedApi.route('/apps', apps);
protectedApi.route('/dashboard', dashboard);
protectedApi.route('/audit-logs', audit);
app.route('/api', protectedApi);

// Admin API routes (require admin key - uses requireAdminAuth in routes)

// Admin API routes (require admin key - uses requireAdminAuth in routes)
app.route('/api/admin/features', adminFeaturesRouter);

// Proxy routes (uses own auth mechanism)
app.route('/proxy', proxy);

// Render routes (public)
app.route('/a', render);

// Unsubscribe routes (public)
app.route('/unsubscribe', unsubscribe);

// Serve static frontend files from public/
// This must come AFTER all API routes
app.use('/*', async (c, next) => {
  await next();
  const contentType = c.res.headers.get('content-type') || '';
  // Add no-cache headers for all text-based files
  if (contentType.includes('text/') || contentType.includes('application/javascript')) {
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    c.res.headers.set('Pragma', 'no-cache');
  }
});
app.use('/*', serveStatic({ root: PUBLIC_PATH }));

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
    const indexHtml = await fs.readFile(`${PUBLIC_PATH}/index.html`, 'utf-8');
    return c.html(indexHtml, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    });
  } catch (err) {
    console.error('Failed to serve index.html:', err);
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>OnHyper</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:system-ui;background:#0f172a;color:#f8fafc;">
          <div style="text-align:center">
            <h1 style="color:#6366f1;font-size:48px;margin-bottom:16px">H</h1>
            <p style="color:#94a3b8">Frontend files not found at ${PUBLIC_PATH}</p>
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
    // SECURITY: Validate critical secrets before anything else
    // This will throw and exit if production secrets are missing
    validateProductionSecrets();

    console.log('Initializing databases...');
    console.log(`Data directory: ${config.dataDir}`);
    console.log(`Volume mount: ${process.env.RAILWAY_VOLUME_MOUNT_PATH || 'not mounted (using local path)'}`);
    initDatabase();
    initLMDB();
    console.log(`SQLite database: ${config.sqlitePath}`);
    console.log(`LMDB database: ${config.lmdbPath}`);
    
    // Seed default feature flags
    seedDefaultFeatureFlags();

    const port = config.port;
    const host = config.host;

    serve({
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

Frontend: Served from ${PUBLIC_PATH}
API: /api/*
Proxy: /proxy/*
Render: /a/*

Configuration:
  Database: ${config.sqlitePath}
  LMDB: ${config.lmdbPath}
  JWT Secret: ${process.env.ONHYPER_JWT_SECRET ? '✓ configured' : '⚠ using dev default (NOT SAFE FOR PRODUCTION)'}
  Master Key: ${process.env.ONHYPER_MASTER_KEY ? '✓ configured' : '⚠ using dev default (NOT SAFE FOR PRODUCTION)'}
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
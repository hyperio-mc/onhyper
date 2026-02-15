/**
 * OnHyper.io - Secure Proxy Service for API-Backed Web Apps
 * 
 * Backend API server - runs on port 3001
 * Frontend (SvelteKit) runs on port 3000 and proxies API calls here
 */

import { serve } from '@hono/node-server';
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

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
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

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
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

    // Use port 3001 for backend (frontend on 3000 proxies here)
    const backendPort = 3001;
    const host = config.host;

    const server = serve({
      fetch: app.fetch,
      port: backendPort,
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

Backend API running at http://${info.address}:${backendPort}
(Frontend on port 3000 proxies here)

Endpoints:
  GET  /health          - Health check
  GET  /api             - API documentation
  POST /api/auth/signup - Create account
  POST /api/auth/login  - Get JWT token
  POST /api/secrets     - Add API key (auth required)
  GET  /proxy           - List proxy endpoints
  ALL  /proxy/:ep/*     - Proxy to external API
  GET  /a/:slug         - Render published app

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
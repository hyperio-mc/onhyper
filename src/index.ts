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
import { workos } from './routes/auth/workos.js';
import { clerk } from './routes/auth/clerk.js';
import { render } from './routes/render.js';
import { waitlist } from './routes/waitlist.js';
import { unsubscribe } from './routes/unsubscribe.js';
import { blog } from './routes/blog.js';
import { chat } from './routes/chat.js';
import { subdomains } from './routes/subdomains.js';
import { settings } from './routes/settings.js';
import { audit } from './routes/audit.js';
import { featuresRouter, adminFeaturesRouter, appFeaturesRouter } from './routes/features.js';
import { analytics } from './routes/analytics.js';
import { stats } from './routes/stats.js';
import { requireAuth, requireAdminAuth } from './middleware/auth.js';
import { updateUserPlan } from './lib/users.js';
import { getDatabase } from './lib/db.js';
import { rateLimit } from './middleware/rateLimit.js';
import { subdomainRouter } from './middleware/subdomain.js';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

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

// Well-known endpoint - serve OnHyper SKILL.md for agent discoverability
app.get('/.well-known/skill.md', (c) => {
  // Try to read from skill file location
  const skillPath = join(homedir(), '.agents', 'skills', 'onhyper', 'SKILL.md');
  
  try {
    if (existsSync(skillPath)) {
      const content = readFileSync(skillPath, 'utf-8');
      return c.text(content, 200, {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      });
    }
  } catch (err) {
    console.error('Failed to read skill file:', err);
  }
  
  // Fallback: embedded skill content (for production environments)
  const embeddedSkill = `---
name: onhyper
description: Build and deploy web apps with secure API proxying on OnHyper.io. Use when the user wants to (1) create web apps with AI features without exposing API keys, (2) securely proxy requests to OpenAI/Anthropic/OpenRouter/ScoutOS/Ollama, (3) host static HTML/CSS/JS apps, (4) store API secrets server-side with encryption, or (5) build AI-powered tools that need server-side key management. Triggers: "build an app", "secure API proxy", "hide API keys", "OnHyper", "host my app", "create a web app with AI".
---

# OnHyper

OnHyper is a platform for building and deploying web apps with **secure API key management**. API keys are encrypted with AES-256-GCM and never exposed to browsers—apps call APIs through OnHyper's proxy endpoints.

## Key Features

- **Secure secret storage** - API keys encrypted server-side, never in client code
- **Proxy endpoints** - Pre-configured for OpenAI, Anthropic, OpenRouter, ScoutOS, Ollama, HyperMicro
- **Subdomain URLs (default)** - Apps get \`yourapp.onhyper.io\` automatically
- **ZIP file publishing** - Upload a ZIP with \`index.html\` to deploy
- **Analytics** - PostHog analytics via \`/api/analytics/capture\`
- **Free tier** - 100 requests/day, 3 apps

## Quick Start

1. Create account at https://onhyper.io
2. Store API keys in Dashboard > Secrets
3. Build your app (HTML/CSS/JS or Next.js static export)
4. Upload ZIP file with index.html at root
5. App is live at https://yourapp.onhyper.io!

## Proxy Endpoints

| Endpoint | Routes To |
|----------|-----------|
| \`/proxy/openai/*\` | OpenAI API |
| \`/proxy/anthropic/*\` | Anthropic API |
| \`/proxy/openrouter/*\` | OpenRouter API |
| \`/proxy/scoutos/*\` | ScoutOS API |
| \`/proxy/ollama/*\` | Ollama API |
| \`/proxy/hypermicro/*\` | HyperMicro API |

Always include \`X-App-Slug\` header in proxy requests.

## API

- \`POST /api/auth/signup\` - Create account
- \`POST /api/auth/login\` - Login
- \`GET /api/apps\` - List your apps
- \`POST /api/apps\` - Create app
- \`POST /api/apps/:id/zip\` - Upload ZIP
- \`POST /api/apps/:id/publish\` - Publish live
- \`GET /api/secrets\` - List your secrets
- \`POST /api/secrets\` - Store a secret

Full documentation: https://github.com/hyperio-software/onhyper
`;
  
  return c.text(embeddedSkill, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
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
      workos: {
        'GET /proxy/auth/workos': 'WorkOS proxy info and available endpoints',
        'GET /proxy/auth/workos/users': 'List WorkOS users',
        'POST /proxy/auth/workos/users': 'Create a WorkOS user',
        'GET /proxy/auth/workos/users/:id': 'Get a WorkOS user by ID',
        'POST /proxy/auth/workos/sso/saml/auth': 'Initiate SAML SSO',
        'POST /proxy/auth/workos/directorySync/sync': 'Trigger directory sync',
        'ALL /proxy/auth/workos/*': 'Generic WorkOS API proxy',
      },
      clerk: {
        'GET /proxy/auth/clerk': 'Clerk proxy info and available endpoints',
        'POST /proxy/auth/clerk/users': 'Create a Clerk user',
        'GET /proxy/auth/clerk/users': 'List Clerk users',
        'GET /proxy/auth/clerk/users/:id': 'Get a Clerk user by ID',
        'PATCH /proxy/auth/clerk/users/:id': 'Update a Clerk user',
        'DELETE /proxy/auth/clerk/users/:id': 'Delete a Clerk user',
        'POST /proxy/auth/clerk/sessions': 'Create a Clerk session',
        'GET /proxy/auth/clerk/sessions/:id': 'Get a Clerk session by ID',
        'DELETE /proxy/auth/clerk/sessions/:id': 'Revoke a Clerk session',
        'POST /proxy/auth/clerk/clients/:client_id/verify': 'Verify a session token',
        'GET /proxy/auth/clerk/clients/:client_id': 'Get a Clerk client by ID',
        'GET /proxy/auth/clerk/organizations': 'List Clerk organizations',
        'POST /proxy/auth/clerk/organizations': 'Create a Clerk organization',
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

// Stats route (public)
app.route('/api/stats', stats);

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
protectedApi.route('/analytics', analytics);

// App feature flags (nested under /api/apps/:appId/features)
protectedApi.route('/apps/:appId/features', appFeaturesRouter);

app.route('/api', protectedApi);

// Admin API routes (require admin key - uses requireAdminAuth in routes)

// Admin API routes (require admin key - uses requireAdminAuth in routes)
app.route('/api/admin/features', adminFeaturesRouter);

// Admin routes (users, migration, status)

// Admin endpoint to upgrade user plan (requires master key)
app.patch('/api/admin/users/:userId/plan', requireAdminAuth, async (c) => {
  const userId = c.req.param('userId');
  const { plan } = await c.req.json();
  
  if (!plan || !['FREE', 'HOBBY', 'PRO', 'BUSINESS'].includes(plan)) {
    return c.json({ error: 'Invalid plan' }, 400);
  }
  
  updateUserPlan(userId, plan);
  return c.json({ success: true, userId, plan });
});

// Simple endpoint to upgrade creator@hyper.io (no auth for now)
app.post('/api/debug/upgrade-creator-v2', async (c) => {
  const { plan } = await c.req.json();
  
  if (!plan || !['FREE', 'HOBBY', 'PRO', 'BUSINESS'].includes(plan)) {
    return c.json({ error: 'Invalid plan' }, 400);
  }
  
  const db = getDatabase();
  const result = db.prepare('UPDATE users SET plan = ?, updated_at = ? WHERE email = ?')
    .run(plan, new Date().toISOString(), 'creator@hyper.io');
  
  return c.json({ success: true, updated: result.changes });
});

// Proxy routes (uses own auth mechanism)
app.route('/proxy', proxy);

// WorkOS proxy routes (app-scoped WorkOS API proxy)
app.route('/proxy/auth/workos', workos);

// Clerk proxy routes (app-scoped Clerk API proxy)
app.route('/proxy/auth/clerk', clerk);

// Render routes (public)
app.route('/a', render);

// Unsubscribe routes (public)
app.route('/unsubscribe', unsubscribe);

// Serve static frontend files from public/
// This must come AFTER all API routes
const matchesRoutePrefix = (path: string, prefix: string): boolean => {
  return path === prefix || path.startsWith(`${prefix}/`);
};

const shouldBypassStatic = (path: string): boolean => {
  return matchesRoutePrefix(path, '/api') || matchesRoutePrefix(path, '/proxy') || matchesRoutePrefix(path, '/a') || matchesRoutePrefix(path, '/unsubscribe') || matchesRoutePrefix(path, '/.well-known');
};

app.use('/*', async (c, next) => {
  if (shouldBypassStatic(c.req.path)) {
    return next();
  }

  await next();
  const contentType = c.res.headers.get('content-type') || '';
  // Add no-cache headers for all text-based files
  if (contentType.includes('text/') || contentType.includes('application/javascript')) {
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    c.res.headers.set('Pragma', 'no-cache');
  }
});

const staticFileHandler = serveStatic({ root: PUBLIC_PATH });
app.use('/*', async (c, next) => {
  if (shouldBypassStatic(c.req.path)) {
    return next();
  }

  return staticFileHandler(c, next);
});

// SPA fallback - serve index.html for unmatched routes (excluding API and proxy routes)
app.get('*', async (c) => {
  const path = c.req.path;
  
  // Don't fallback for API/proxy/render/well-known routes (they should have been handled above)
  if (matchesRoutePrefix(path, '/api') || matchesRoutePrefix(path, '/proxy') || matchesRoutePrefix(path, '/a') || matchesRoutePrefix(path, '/.well-known')) {
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

main();// deployment trigger Sat Feb 21 21:45:17 EST 2026

/**
 * OnHyper.io - Secure Proxy Service for API-Backed Web Apps
 * 
 * Main entry point for the server.
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
    },
  });
});

// Auth routes (public)
app.route('/api/auth', auth);

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

// Landing page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OnHyper.io - Publish Secure API-Backed Apps</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: #0066cc; }
        h2 { font-size: 1.5rem; margin: 2rem 0 1rem; }
        p { margin-bottom: 1rem; }
        code {
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.9em;
        }
        pre {
          background: #f4f4f4;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1rem 0;
        }
        pre code { background: none; padding: 0; }
        .endpoint {
          display: inline-block;
          background: #e8f4ff;
          color: #0066cc;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }
        ul { padding-left: 1.5rem; margin-bottom: 1rem; }
        li { margin-bottom: 0.5rem; }
      </style>
    </head>
    <body>
      <h1>OnHyper.io</h1>
      <p><strong>Publish apps that call APIs securely.</strong></p>
      
      <p>OnHyper.io is a platform for publishing full-stack applications that require secure backend functionality. It enables developers to publish web apps that can safely call external APIs without exposing secrets to the browser.</p>
      
      <h2>How It Works</h2>
      <ol>
        <li>Add your API keys securely in the dashboard</li>
        <li>Create an app with HTML, CSS, and JS</li>
        <li>Call <code>/proxy/:endpoint</code> from your app</li>
        <li>We inject your API keys server-side</li>
      </ol>
      
      <h2>Available Proxy Endpoints</h2>
      <ul>
        <li><code>/proxy/scout-atoms</code> - Scout OS Atoms API</li>
        <li><code>/proxy/ollama</code> - Ollama API</li>
        <li><code>/proxy/openrouter</code> - OpenRouter API</li>
        <li><code>/proxy/anthropic</code> - Anthropic API</li>
        <li><code>/proxy/openai</code> - OpenAI API</li>
      </ul>
      
      <h2>Quick Start</h2>
      <pre><code># Create an account
curl -X POST https://onhyper.io/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your-password"}'

# Add an API key
curl -X POST https://onhyper.io/api/secrets \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"OPENAI_API_KEY","value":"sk-..."}'

# Create an app
curl -X POST https://onhyper.io/api/apps \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My App","html":"<h1>Hello!</h1>"}'</code></pre>
      
      <h2>API Reference</h2>
      <p>See <a href="/api">/api</a> for full API documentation.</p>
    </body>
    </html>
  `);
});

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

    const server = serve({
      fetch: app.fetch,
      port: config.port,
      hostname: config.host,
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

Server running at http://${info.address}:${info.port}

Endpoints:
  GET  /                - Landing page
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
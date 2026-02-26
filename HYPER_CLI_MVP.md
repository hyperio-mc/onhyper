# Hyper CLI MVP - Local Development Tool

**MVP Planning Document**  
**Date: 2026-02-24**  
**Status: Ready for Implementation**

---

## Executive Summary

This is a **simplified MVP** that strips down the CLI to its essence: serve static files + forward proxy requests to OnHyper with authentication. No local secrets, no device auth flow, no new server endpoints.

**Core Insight:** The CLI is just a thin authenticated reverse proxy. OnHyper already does all the hard work (secret management, API forwarding, rate limiting). The CLI just needs to:

1. Serve static files locally
2. Forward `/proxy/*` requests to OnHyper with the user's API key + app slug

---

## Architecture

### System Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                            DEVELOPER MACHINE                               │
│                                                                            │
│   ┌────────────────────┐                                                  │
│   │   Browser          │                                                  │
│   │   localhost:3000   │                                                  │
│   └─────────┬──────────┘                                                  │
│             │                                                              │
│             │ GET /index.html                                              │
│             │ GET /proxy/scoutos/...                                       │
│             ▼                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      HYPER CLI (MVP)                                │  │
│   │                                                                     │  │
│   │   ┌─────────────────┐    ┌──────────────────────────────────────┐  │  │
│   │   │  Static Server  │    │         Reverse Proxy                 │  │  │
│   │   │  (Hono/Bun)     │    │  /proxy/* → onhyper.io/proxy/*       │  │  │
│   │   │                 │    │  + X-API-Key: oh_live_xxx            │  │  │
│   │   │  Serves ./dist  │    │  + X-App-Slug: my-app (optional)     │  │  │
│   │   │  or ./public    │    │                                       │  │  │
│   │   └────────┬────────┘    └──────────────────┬───────────────────┘  │  │
│   │            │                                │                       │  │
│   │            │                                │                       │  │
│   │   ┌────────▼────────┐                       │                       │  │
│   │   │  hyper.json      │                       │                       │  │
│   │   │  - apiKey        │                       │                       │  │
│   │   │  - appSlug       │                       │                       │  │
│   │   │  - staticDir     │                       │                       │  │
│   │   └──────────────────┘                       │                       │  │
│   └─────────────────────────────────────────────┼───────────────────────┘  │
│                                                 │                          │
└─────────────────────────────────────────────────┼──────────────────────────┘
                                                  │
                                                  │ HTTPS
                                                  │ (with auth headers)
                                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              OnHyper.io                                    │
│                                                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     /proxy/:endpoint/*                              │  │
│   │                                                                     │  │
│   │   1. Identify user (X-API-Key or X-App-Slug)                        │  │
│   │   2. Look up user's secret for endpoint                             │  │
│   │   3. Decrypt secret, inject auth header                             │  │
│   │   4. Forward to target API                                          │  │
│   │   5. Return response                                                 │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│   ┌──────────────┐    ┌──────────────┐    ┌─────────────────────────────┐ │
│   │ User Secrets │    │ User Apps    │    │ Proxy Endpoints             │ │
│   │ (encrypted)  │    │ & API Keys   │    │ scoutos, openai, etc.       │ │
│   └──────────────┘    └──────────────┘    └─────────────────────────────┘ │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

### Why This Is Simple

1. **No local secrets** - All secrets remain on OnHyper server, encrypted at rest
2. **No device auth** - Uses existing API key authentication (same as production)
3. **No new endpoints** - OnHyper already has `/proxy/*` that accepts `X-API-Key`
4. **No session management** - Config file stores API key + app slug

---

## Request Flow

### Static File Request

```
Browser                    Hyper CLI
   │                           │
   │ GET /index.html           │
   │──────────────────────────▶│
   │                           │
   │         index.html        │ (read from ./dist or ./public)
   │◀──────────────────────────│
   │                           │
```

### Proxy Request (The Key Innovation)

```
Browser                    Hyper CLI                     OnHyper.io
   │                           │                              │
   │ POST /proxy/scoutos/      │                              │
   │     world/agent/_interact │                              │
   │──────────────────────────▶│                              │
   │                           │                              │
   │   (body: messages, etc)   │                              │
   │                           │                              │
   │                           │  POST /proxy/scoutos/        │
   │                           │       world/agent/_interact  │
   │                           │  ─────────────────────────────▶
   │                           │                               │
   │                           │  Headers:                     │
   │                           │    X-API-Key: oh_live_xxx    │
   │                           │    X-App-Slug: my-app         │
   │                           │    Content-Type: application/json
   │                           │                               │
   │                           │                               │
   │                           │                (OnHyper looks up user's
   │                           │                 SCOUT_API_KEY, decrypts,
   │                           │                 forwards to api.scoutos.com)
   │                           │                               │
   │                           │          Response (JSON or SSE)│
   │                           │◀────────────────────────────────
   │                           │                               │
   │      Response             │                               │
   │◀──────────────────────────│                               │
   │                           │                               │
```

### Same as Production!

The beauty: **local request flow is identical to production**. Your app doesn't need to change:

```javascript
// Works locally AND in production:
const response = await fetch('/proxy/scoutos/world/agent123/_interact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ messages: [...] })
});
```

When running locally, CLI adds auth headers. When deployed, OnHyper receives headers directly.

---

## CLI Commands

### Minimal MVP Commands

```bash
# Initialize project (creates hyper.json)
hyper init [--slug my-app]

# Start local development server
hyper dev [--port 3000] [--dir ./dist]

# (optional) Link existing project to OnHyper app
hyper link my-app-slug
```

### `hyper init`

Creates `hyper.json` in the current directory:

```json
{
  "name": "my-app",
  "slug": "my-app-slug",
  "apiKey": "oh_live_xxx (from clipboard or prompt)",
  "staticDir": "./dist",
  "port": 3000
}
```

**Flow:**
1. Prompt for OnHyper API key (or read from `HYPER_API_KEY` env var)
2. Optional: prompt for app slug
3. Write `hyper.json`
4. Add `.hyper/` to `.gitignore`

### `hyper dev`

**The core command.** Starts local server with proxy support.

```
$ hyper dev

✓ Hyper CLI v1.0.0
✓ Config loaded from hyper.json
✓ API key validated
✓ App linked: my-app-slug
✓ Static files: ./dist
✓ Proxy active: /proxy/* → onhyper.io/proxy/*

→ http://localhost:3000

Watching ./dist for changes...
```

### `hyper link` (Optional)

Associates local project with a published app (for app-scoped secrets):

```bash
$ hyper link my-app-slug
✓ Linked to app: my-app-slug
✓ Updated hyper.json
```

---

## Config File

### `hyper.json`

```json
{
  "name": "my-hyper-app",
  "slug": "my-app-abc123",
  "apiKey": "oh_live_xxx",
  "staticDir": "./dist",
  "port": 3000,
  "baseUrl": "https://onhyper.io"
}
```

### Environment Variable Override

```bash
# Skip storing API key in file
HYPER_API_KEY=oh_live_xxx hyper dev

# Or set in .env (gitignored)
HYPER_API_KEY=oh_live_xxx
```

---

## OnHyper Changes Required

### NONE (for MVP)

The existing proxy.ts already supports:

✅ `X-API-Key` header authentication  
✅ `X-App-Slug` header for app context  
✅ `/proxy/:endpoint/*` routing  
✅ SSE streaming support  
✅ Rate limiting  
✅ Usage tracking  

**The server side is already complete.** The CLI just needs to forward requests with the right auth headers.

---

## Implementation Estimate

| Phase | Description | Effort |
|-------|-------------|--------|
| **Phase 1** | CLI scaffold (Bun + TypeScript + Hono) | 2 hours |
| **Phase 2** | `hyper init` command | 1 hour |
| **Phase 3** | Static file server | 2 hours |
| **Phase 4** | Reverse proxy with auth headers | 3 hours |
| **Phase 5** | Hot reload/watcher | 2 hours |
| **Phase 6** | Polish (errors, help, DX) | 3 hours |
| **Phase 7** | Package & publish (`bun install -g hyper-cli`) | 1 hour |
| **Total** | | **~14 hours (2 days)** |

---

## Code Sketch

### Project Structure

```
hyper-cli/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/
│   │   ├── init.ts        # hyper init
│   │   └── dev.ts         # hyper dev
│   ├── lib/
│   │   ├── config.ts      # Load hyper.json
│   │   ├── server.ts      # Static + proxy server
│   │   └── validate.ts    # API key validation
│   └── types/
│       └── index.ts       # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

### `src/lib/config.ts`

```typescript
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface HyperConfig {
  name: string;
  slug?: string;
  apiKey: string;
  staticDir: string;
  port: number;
  baseUrl: string;
}

export async function loadConfig(dir: string = process.cwd()): Promise<HyperConfig | null> {
  const configPath = join(dir, 'hyper.json');
  
  if (!existsSync(configPath)) {
    return null;
  }
  
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  
  // Allow env var override
  if (process.env.HYPER_API_KEY) {
    config.apiKey = process.env.HYPER_API_KEY;
  }
  
  return {
    name: config.name || 'my-app',
    slug: config.slug,
    apiKey: config.apiKey,
    staticDir: config.staticDir || './dist',
    port: config.port || 3000,
    baseUrl: config.baseUrl || 'https://onhyper.io',
  };
}
```

### `src/lib/server.ts`

```typescript
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
import type { HyperConfig } from './config';

export function createServer(config: HyperConfig) {
  const app = new Hono();
  
  // -------------------------------------------------------------------------
  // Reverse Proxy for /proxy/*
  // -------------------------------------------------------------------------
  app.all('/proxy/*', async (c) => {
    const proxyPath = c.req.path.replace('/proxy', '/proxy');
    const targetUrl = `${config.baseUrl}${proxyPath}${c.req.url.includes('?') ? '?' + c.req.url.split('?')[1] : ''}`;
    
    // Build headers with auth
    const headers: Record<string, string> = {
      'Content-Type': c.req.header('content-type') || 'application/json',
      'X-API-Key': config.apiKey,
    };
    
    // Add app slug if configured (for app-scoped secrets)
    if (config.slug) {
      headers['X-App-Slug'] = config.slug;
    }
    
    // Forward select headers from original request
    const forwardHeaders = ['accept', 'accept-language'];
    for (const h of forwardHeaders) {
      const val = c.req.header(h);
      if (val) headers[h] = val;
    }
    
    // Get body for non-GET requests
    let body: string | undefined;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      body = await c.req.text();
    }
    
    try {
      const response = await fetch(targetUrl, {
        method: c.req.method,
        headers,
        body,
      });
      
      // Handle SSE streaming
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        return new Response(response.body, {
          status: response.status,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      // Regular response
      const responseText = await response.text();
      
      return new Response(responseText, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      });
      
    } catch (error) {
      return c.json({
        error: 'Proxy request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 502);
    }
  });
  
  // -------------------------------------------------------------------------
  // CORS preflight for proxy
  // -------------------------------------------------------------------------
  app.options('/proxy/*', (c) => {
    return c.body(null, 204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-App-Slug',
    });
  });
  
  // -------------------------------------------------------------------------
  // Static File Server
  // -------------------------------------------------------------------------
  app.use('/*', serveStatic({ root: config.staticDir }));
  
  // SPA fallback - serve index.html for non-API routes
  app.get('*', async (c) => {
    const path = c.req.path;
    // Don't fallback for API/proxy routes
    if (path.startsWith('/proxy/') || path.startsWith('/api/')) {
      return c.notFound();
    }
    
    // Try to serve index.html for SPA routing
    try {
      return await c.env.INDEX_HANDLER?.(c) || serveStatic({ path: 'index.html', root: config.staticDir })(c);
    } catch {
      return c.notFound();
    }
  });
  
  return app;
}
```

### `src/commands/dev.ts`

```typescript
import { existsSync } from 'fs';
import { loadConfig } from '../lib/config';
import { createServer } from '../lib/server';

export async function devCommand(options: {
  port?: number;
  dir?: string;
}) {
  const config = await loadConfig(options.dir);
  
  if (!config) {
    console.error('❌ No hyper.json found. Run `hyper init` first.');
    process.exit(1);
  }
  
  if (!config.apiKey) {
    console.error('❌ No API key configured. Set HYPER_API_KEY or add apiKey to hyper.json.');
    process.exit(1);
  }
  
  const port = options.port || config.port;
  const app = createServer(config);
  
  // Validate static dir exists
  if (!existsSync(config.staticDir)) {
    console.error(`❌ Static directory not found: ${config.staticDir}`);
    process.exit(1);
  }
  
  console.log('');
  console.log('✓ Hyper CLI v1.0.0');
  console.log('✓ Config loaded from hyper.json');
  console.log(`✓ API key: ${config.apiKey.slice(0, 12)}...`);
  if (config.slug) {
    console.log(`✓ App linked: ${config.slug}`);
  }
  console.log(`✓ Static files: ${config.staticDir}`);
  console.log(`✓ Proxy active: /proxy/* → ${config.baseUrl}/proxy/*`);
  console.log('');
  console.log(`→ http://localhost:${port}`);
  console.log('');
  console.log(`Watching ${config.staticDir} for changes...`);
  console.log('');
  
  // Start server with Bun
  Bun.serve({
    port,
    fetch: app.fetch,
    development: true,
  });
}
```

### `src/commands/init.ts`

```typescript
import { existsSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import input from '@inquirer/input';
import confirm from '@inquirer/confirm';

interface InitOptions {
  slug?: string;
  apiKey?: string;
  dir?: string;
}

export async function initCommand(options: InitOptions) {
  const dir = options.dir || process.cwd();
  const configPath = join(dir, 'hyper.json');
  
  // Check for existing config
  if (existsSync(configPath)) {
    const overwrite = await confirm({
      message: 'hyper.json already exists. Overwrite?',
      default: false,
    });
    if (!overwrite) {
      console.log('Cancelled.');
      return;
    }
  }
  
  // Get API key
  let apiKey = options.apiKey || process.env.HYPER_API_KEY;
  if (!apiKey) {
    apiKey = await input({
      message: 'Enter your OnHyper API key (oh_live_xxx):',
      validate: (value) => {
        if (!value.startsWith('oh_live_')) {
          return 'API key must start with oh_live_';
        }
        return true;
      },
    });
  }
  
  // Get app slug (optional)
  const slug = options.slug || await input({
    message: 'App slug (optional, for app-scoped secrets):',
    default: '',
  });
  
  // Detect static directory
  const staticDirs = ['dist', 'public', 'build', 'out'];
  let staticDir = './dist';
  for (const d of staticDirs) {
    if (existsSync(join(dir, d))) {
      staticDir = `./${d}`;
      break;
    }
  }
  
  // Create config
  const config = {
    name: require('path').basename(dir),
    slug: slug || undefined,
    apiKey,
    staticDir,
    port: 3000,
    baseUrl: 'https://onhyper.io',
  };
  
  // Remove undefined values
  Object.keys(config).forEach(key => {
    if (config[key as keyof typeof config] === undefined) {
      delete config[key as keyof typeof config];
    }
  });
  
  // Write config
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✓ Created ${configPath}`);
  
  // Add to .gitignore
  const gitignorePath = join(dir, '.gitignore');
  const hyperIgnore = '\n# Hyper CLI\nhyper.json\n';
  
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, hyperIgnore);
    console.log('✓ Created .gitignore (added hyper.json)');
  } else {
    const gitignore = require('fs').readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('hyper.json')) {
      appendFileSync(gitignorePath, hyperIgnore);
      console.log('✓ Updated .gitignore (added hyper.json)');
    }
  }
  
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run `hyper dev` to start the local server');
  console.log('  2. Open http://localhost:3000 in your browser');
  console.log('  3. Your app can now call /proxy/* endpoints locally!');
}

// Alternative: Non-interactive version for scripting
export async function initNonInteractive(options: InitOptions) {
  const dir = options.dir || process.cwd();
  const configPath = join(dir, 'hyper.json');
  
  if (!options.apiKey && !process.env.HYPER_API_KEY) {
    throw new Error('API key required. Set HYPER_API_KEY or pass --api-key.');
  }
  
  const config = {
    name: require('path').basename(dir),
    slug: options.slug,
    apiKey: options.apiKey || process.env.HYPER_API_KEY,
    staticDir: './dist',
    port: 3000,
    baseUrl: 'https://onhyper.io',
  };
  
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✓ Created ${configPath}`);
}
```

### `src/index.ts`

```typescript
#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from './commands/init';
import { devCommand } from './commands/dev';

program
  .name('hyper')
  .description('Hyper CLI - Local development for OnHyper apps')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new hyper project')
  .option('--slug <slug>', 'App slug (optional)')
  .option('--api-key <key>', 'API key (or use HYPER_API_KEY)')
  .option('--dir <dir>', 'Project directory', '.')
  .action(initCommand);

program
  .command('dev')
  .description('Start local development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action(devCommand);

program.parse();
```

### `package.json`

```json
{
  "name": "hyper-cli",
  "version": "1.0.0",
  "description": "Hyper CLI - Local development for OnHyper apps",
  "type": "module",
  "bin": {
    "hyper": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --compile --outfile hyper"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "hono": "^4.0.0",
    "@inquirer/input": "^3.0.0",
    "@inquirer/confirm": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Security Considerations

### What We DON'T Store Locally

❌ Decrypted secrets  
❌ User tokens  
❌ Browser session data  

### What We Store

✅ API key in `hyper.json` (user's responsibility to gitignore)  
✅ Optional app slug  

### Security Model

The CLI's security model mirrors production:

1. **API key is the authentication credential** - same as calling OnHyper directly
2. **Secrets never leave OnHyper** - proxy runs server-side
3. **HTTPS everywhere** - all traffic to OnHyper is encrypted
4. **Rate limiting applies** - same limits as production (per API key)

### User Responsibility

- Add `hyper.json` to `.gitignore` (CLI does this automatically on `init`)
- Use `HYPER_API_KEY` env var for CI/CD (never commit to repo)
- Rotate API key if compromised (same as production)

---

## Future Enhancements (NOT for MVP)

These are explicitly **out of scope** for MVP:

| Feature | Why Not MVP |
|---------|--------------|
| Device auth flow | Adds complexity, API key is simpler |
| Secret fetching | Unnecessary, proxy works server-side |
| `hyper deploy` | Requires bundling, separate concern |
| `hyper secrets *` | Complex, requires new API endpoints |
| Hot reload | Nice-to-have, adds file watching complexity |
| SSE/WebSocket tunneling | Already works via proxy pass-through |

---

## Testing Checklist

### Manual Tests

```bash
# 1. Initialize project
cd my-hyper-app
hyper init --api-key oh_live_xxx --slug my-app

# 2. Start dev server
hyper dev

# 3. Test static files
curl http://localhost:3000/
curl http://localhost:3000/index.html

# 4. Test proxy (should use app's secrets on OnHyper)
curl -X POST http://localhost:3000/proxy/scoutos/world/agent/_interact \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# 5. Test SSE streaming
curl -N http://localhost:3000/proxy/scoutos/world/agent/_interact \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"stream":true}'

# 6. Test without app slug (should use user's default secrets)
# (remove slug from hyper.json)
hyper dev
```

---

## Summary

### What This MVP Is

- **Static file server** - serves `./dist` or `./public` locally
- **Authenticated reverse proxy** - forwards `/proxy/*` to OnHyper with auth headers
- **Minimal config** - just API key + optional app slug
- **Zero server changes** - OnHyper already supports everything needed

### What This MVP Is NOT

- Not a secret manager
- Not a full deployment pipeline
- Not a local API emulator
- Not a Vercel/Netlify clone

### Why This Works

The insight is that **OnHyper's proxy already does the hard work**. The CLI just needs to:

1. Authenticate requests (via `X-API-Key`)
2. Identify the app context (via `X-App-Slug`)
3. Forward everything else

This is a ~200-300 line implementation that provides real value to developers.

---

*Document created: 2026-02-24*  
*Status: Ready for implementation*
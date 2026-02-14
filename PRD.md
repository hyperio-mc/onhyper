# OnHyper.io - Product Requirements Document

## Product Vision

**OnHyper.io** is a platform for publishing full-stack applications that require secure backend functionality. It enables developers and AI agents to publish web apps that can safely call external APIs without exposing secrets to the browser.

**The Problem:** Static sites can't call APIs with secrets. API keys in browser code are exposed to users.

**The Solution:** A secure proxy service that holds user API keys server-side and injects them at request time. Apps call the proxy, proxy adds the key, forwards to target API, returns response.

---

## Core Concept

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User's Browser                             │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Published App                              │   │
│   │                                                               │   │
│   │   fetch('/proxy/scout-atoms', {                              │   │
│   │     method: 'POST',                                          │   │
│   │     body: JSON.stringify({ prompt: "Hello" })                │   │
│   │   })                                                         │   │
│   │                                                               │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               │ 1. Request to /proxy/scout-atoms
                               │    (no API key in browser)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        OnHyper.io Platform                           │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    Secret Vault (Encrypted)                    │  │
│   │                                                                │  │
│   │   User: rakis                                                  │  │
│   │   ├── SCOUT_API_KEY: sk_live_xxx...                           │  │
│   │   ├── OLLAMA_API_KEY: sk_live_yyy...                          │  │
│   │   └── OPENROUTER_API_KEY: sk_live_zzz...                      │  │
│   │                                                                │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    Proxy Service                               │  │
│   │                                                                │  │
│   │   1. Identify app owner                                        │  │
│   │   2. Look up secret for endpoint                               │  │
│   │   3. Inject Authorization header                               │  │
│   │   4. Forward request to target API                            │  │
│   │   5. Return response (sanitized)                               │  │
│   │                                                                │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           │ 2. Forward with injected secret
                           │    Authorization: Bearer sk_live_xxx...
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        External APIs                                 │
│                                                                      │
│   api.scoutos.com/atoms    ollama.com/v1    openrouter.ai/api/v1   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Target Users

### Primary: AI Agents
- Agents that need to publish interactive apps
- Apps that call LLM APIs (OpenRouter, Anthropic, Scout Atoms)
- No ability to run backend infrastructure themselves

### Secondary: Developers
- Developers building API-backed frontends
- Want simple deploy without backend management
- Need to keep API keys secure

---

## Features

### Phase 1: MVP

#### 1.1 User Authentication
- Email/password signup
- JWT-based sessions
- Stripe integration for paid plans

#### 1.2 API Key Management
- Dashboard to add/remove API keys
- Named keys: `SCOUT_API_KEY`, `OLLAMA_API_KEY`, etc.
- Keys stored encrypted at rest
- Keys shown once on creation, then masked

#### 1.3 Proxy Endpoints
Pre-defined proxy routes for common APIs:

| Endpoint | Target | Secret Key |
|----------|--------|------------|
| `/proxy/scout-atoms` | `api.scoutos.com/atoms` | `SCOUT_API_KEY` |
| `/proxy/ollama` | `ollama.com/v1` | `OLLAMA_API_KEY` |
| `/proxy/openrouter` | `openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| `/proxy/anthropic` | `api.anthropic.com/v1` | `ANTHROPIC_API_KEY` |
| `/proxy/openai` | `api.openai.com/v1` | `OPENAI_API_KEY` |

All endpoints support:
- Any HTTP method (GET, POST, PUT, DELETE)
- Request body passthrough
- Response passthrough
- Automatic Authorization header injection

#### 1.4 App Publishing
- Create app with name and HTML frontend
- App gets unique subdomain or path: `my-app.onhyper.io` or `onhyper.io/a/my-app`
- Apps can use any proxy endpoint where owner has a key configured

#### 1.5 Usage Limits
- Free tier: 100 requests/day
- Hobby: 1,000 requests/day ($5/mo)
- Pro: 10,000 requests/day ($15/mo)

### Phase 2: Extended Features

#### 2.1 Custom Domains
- Bring your own domain for apps
- Automatic SSL via Let's Encrypt

#### 2.2 Analytics
- Request counts per app
- Error rates
- Response times

#### 2.3 Webhook Support
- Apps can receive webhooks
- Proxy outgoing webhooks with secret injection

#### 2.4 Team Collaboration
- Share apps with team members
- Shared API key pools

### Phase 3: Advanced Features

#### 3.1 Custom Proxy Endpoints
- Users define their own target URLs
- Custom header patterns

#### 3.2 CU Sandbox (Optional Future)
- Full Lua sandbox for custom logic
- Request transformation
- Response caching
- Rate limiting per user

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Build Tool | **Vite** | Fast development, simple build |
| Frontend | **Svelte** | Lightweight reactive UI |
| API Framework | **Hono** | Fast, minimal API routes |
| Content Storage | **LMDB** | App data (pages, content) |
| User/Auth Storage | **SQLite** | Users, API keys, encrypted secrets |
| Hosting | **Railway** | Simple deployment |

**Design Philosophy:**
- Lighter than Next.js - no server-side rendering complexity
- Same API pattern as zenbin for consistency
- LMDB for fast app content storage
- SQLite for structured user/auth data with encryption

---

## Technical Architecture

### System Components

```
onhyper/
├── src/
│   ├── frontend/                    # Svelte frontend
│   │   ├── App.svelte              # Root component
│   │   ├── routes/
│   │   │   ├── Home.svelte         # Landing page
│   │   │   ├── Login.svelte        # Login page
│   │   │   ├── Signup.svelte       # Signup page
│   │   │   ├── Dashboard.svelte    # User dashboard
│   │   │   ├── Keys.svelte         # API key management
│   │   │   ├── Apps/
│   │   │   │   ├── New.svelte      # Create new app
│   │   │   │   └── Edit.svelte     # Edit app
│   │   │   └── View.svelte         # Published app viewer
│   │   ├── components/
│   │   │   ├── Editor.svelte       # Code editor component
│   │   │   ├── Preview.svelte      # Live preview component
│   │   │   └── Nav.svelte          # Navigation
│   │   └── stores/
│   │       ├── auth.js             # Auth state store
│   │       └── apps.js             # Apps state store
│   │
│   ├── api/                        # Hono API routes
│   │   ├── index.js               # API entry point
│   │   ├── routes/
│   │   │   ├── auth.js            # Signup, login, token
│   │   │   ├── secrets.js         # List/create/delete secrets
│   │   │   ├── apps.js            # List/create/update/delete apps
│   │   │   └── proxy.js           # Proxy endpoint handler
│   │   └── middleware/
│   │       ├── auth.js            # JWT verification
│   │       └── rateLimit.js       # Rate limiting
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── sqlite.js          # SQLite client for auth
│   │   │   └── lmdb.js            # LMDB client for content
│   │   ├── encryption.js          # Secret encryption (AES-256-GCM)
│   │   └── proxy.js               # Proxy logic & config
│   │
│   └── main.js                    # Server entry point
│
├── data/
│   ├── onhyper.db                 # SQLite database file
│   └── lmdb/                      # LMDB database directory
│
├── package.json
├── vite.config.js
└── README.md
```

### Data Storage Strategy

**LMDB (Content Storage):**
- Fast key-value storage for app content
- Stores: pages, HTML, CSS, JS for published apps
- Simple, performant, no migrations needed

**SQLite (User/Auth Storage):**
- Structured storage for user data
- Stores: users, API keys, secrets, usage records
- Supports complex queries, relationships, indexes
- Each API key encrypted with per-user salt

---

## Database Schema

### SQLite Tables

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt hash
  plan TEXT DEFAULT 'FREE',  -- FREE, HOBBY, PRO, BUSINESS
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Encrypted secrets (API keys)
CREATE TABLE secrets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,        -- e.g., "SCOUT_API_KEY"
  value TEXT NOT NULL,       -- AES-256-GCM encrypted
  salt TEXT NOT NULL,        -- Per-user salt for encryption
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

-- API keys for programmatic access
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,  -- zb_live_xxx
  plan TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Published apps
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-safe name
  html TEXT,                  -- Frontend HTML
  css TEXT,                   -- Optional CSS
  js TEXT,                    -- Optional JS
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Usage tracking
CREATE TABLE usage (
  id TEXT PRIMARY KEY,
  api_key_id TEXT,
  app_id TEXT,
  endpoint TEXT NOT NULL,     -- Which proxy was used
  status INTEGER,             -- HTTP status code
  duration INTEGER,           -- Duration in ms
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX idx_secrets_user ON secrets(user_id);
CREATE INDEX idx_apps_user ON apps(user_id);
CREATE INDEX idx_apps_slug ON apps(slug);
CREATE INDEX idx_usage_api_key ON usage(api_key_id);
CREATE INDEX idx_usage_app ON usage(app_id);
CREATE INDEX idx_usage_created ON usage(created_at);
```

### LMDB Content Schema

```javascript
// Key patterns for LMDB storage
const LMDB_KEYS = {
  // App content: app:{appId}:content
  appContent: (appId) => `app:${appId}:content`,
  
  // App metadata cache: app:{appId}:meta
  appMeta: (appId) => `app:${appId}:meta`,
  
  // User's app list: user:{userId}:apps
  userApps: (userId) => `user:${userId}:apps`,
};
```

---

## Proxy Configuration

```javascript
// lib/proxy-config.js
export const PROXY_ENDPOINTS = {
  'scout-atoms': {
    target: 'https://api.scoutos.com/atoms',
    secretKey: 'SCOUT_API_KEY',
    authHeader: (key) => `Bearer ${key}`,
    description: 'Scout OS Atoms API'
  },
  'ollama': {
    target: 'https://ollama.com/v1',
    secretKey: 'OLLAMA_API_KEY',
    authHeader: (key) => `Bearer ${key}`,
    description: 'Ollama API'
  },
  'openrouter': {
    target: 'https://openrouter.ai/api/v1',
    secretKey: 'OPENROUTER_API_KEY',
    authHeader: (key) => `Bearer ${key}`,
    description: 'OpenRouter API'
  },
  'anthropic': {
    target: 'https://api.anthropic.com/v1',
    secretKey: 'ANTHROPIC_API_KEY',
    authHeader: (key) => `x-api-key ${key}`,
    description: 'Anthropic API'
  },
  'openai': {
    target: 'https://api.openai.com/v1',
    secretKey: 'OPENAI_API_KEY',
    authHeader: (key) => `Bearer ${key}`,
    description: 'OpenAI API'
  }
};
```

### Proxy Implementation (Hono)

```javascript
// api/routes/proxy.js
import { Hono } from 'hono';
import { PROXY_ENDPOINTS } from '../lib/proxy-config.js';
import { getSecret } from '../lib/secrets.js';
import { verifyAppAccess } from '../lib/auth.js';

const app = new Hono();

app.all('/:endpoint/*', async (c) => {
  const endpoint = c.req.param('endpoint');
  const config = PROXY_ENDPOINTS[endpoint];
  
  if (!config) {
    return c.json({ error: 'Unknown endpoint' }, 404);
  }
  
  // Get app ID from header or query
  const appId = c.req.header('x-app-id') || c.req.query('appId');
  if (!appId) {
    return c.json({ error: 'App ID required' }, 401);
  }
  
  // Verify app exists and get owner
  const { userId } = await verifyAppAccess(appId);
  
  // Get user's secret for this endpoint
  const secret = await getSecret(userId, config.secretKey);
  if (!secret) {
    return c.json({ 
      error: `No ${config.secretKey} configured. Add it in your dashboard.` 
    }, 401);
  }
  
  // Build target URL
  const path = c.req.path.replace(`/proxy/${endpoint}`, '');
  const targetUrl = config.target + path;
  
  // Forward request with injected auth
  const response = await fetch(targetUrl, {
    method: c.req.method,
    headers: {
      ...Object.fromEntries(c.req.raw.headers),
      'authorization': config.authHeader(secret),
      'host': new URL(config.target).host
    },
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.text()
  });
  
  // Stream response back
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
});

export default app;
```

---

## User Interface

### Landing Page
- Hero: "Publish apps that call APIs securely"
- Feature highlights
- Pricing table
- CTA: "Get Started Free"

### Dashboard
- Overview: Apps count, usage stats
- Quick actions: Create app, Add API key

### API Keys Page
- List of configured secrets (masked: `sk_live_••••••••••••`)
- Add new secret button
- Supported endpoints list

### App Editor
- App name and slug
- HTML/CSS/JS editors
- Live preview
- Publish button

### Published App
- Rendered at `/a/{slug}`
- Full-screen app experience
- Identifiable as hosted by onhyper.io

---

## Security Considerations

### Secret Storage
- Secrets encrypted at rest using AES-256-GCM
- Each secret has a per-user salt for encryption
- Encryption key stored in environment variable
- Secrets never logged or returned in API responses
- Secrets shown once on creation, then masked

### Request Validation
- App ID required for proxy requests
- Verify app ownership before proxying
- Rate limiting per user and per app
- Request size limits

### CORS
- Published apps have CORS headers set appropriately
- Proxy endpoints configurable CORS per user

### Audit Logging
- Log all proxy requests (without secret values)
- Track usage per app and endpoint
- Alert on suspicious activity

---

## Pricing

| Plan | Price | Proxy Requests/day | Apps | Custom Domains |
|------|-------|-------------------|------|----------------|
| Free | $0 | 100 | 3 | No |
| Hobby | $5/mo | 1,000 | 10 | No |
| Pro | $15/mo | 10,000 | 50 | Yes |
| Business | $49/mo | 100,000 | Unlimited | Yes |

---

## Success Metrics

### MVP Success
- 10 published apps in first month
- 1,000 proxy requests in first month
- < 500ms p95 proxy latency

### Growth Indicators
- Month-over-month app creation growth
- Proxy request volume growth
- Paid tier conversions

---

## Technical Risks

| Risk | Mitigation |
|------|------------|
| API rate limiting from providers | Implement request queuing, user-level limits |
| Secret exposure via debugging | Never log secrets, use secure memory practices |
| High proxy latency | Use edge deployment, connection pooling |
| Abuse/spam | Rate limits, account verification, monitoring |

---

## Timeline

### Week 1-2: Core Infrastructure
- [ ] Set up Vite + Svelte project
- [ ] Set up Hono API framework
- [ ] Implement authentication (signup, login, JWT)
- [ ] Set up SQLite database with schema
- [ ] Set up LMDB for content storage
- [ ] Implement secret encryption/decryption

### Week 3: API Key Management
- [ ] UI for adding/removing API keys
- [ ] Encrypted storage with per-user salt
- [ ] Key masking in display

### Week 4: Proxy Service
- [ ] Implement proxy endpoint logic in Hono
- [ ] Add pre-configured endpoints (scout-atoms, ollama, etc.)
- [ ] Request logging and usage tracking

### Week 5: App Publishing
- [ ] App editor UI (HTML/CSS/JS)
- [ ] App slug routing
- [ ] Publish/unpublish functionality

### Week 6: Polish & Launch
- [ ] Landing page
- [ ] Pricing integration (Stripe)
- [ ] Error handling
- [ ] Documentation
- [ ] Deploy to Railway

---

## Future Considerations

### CU Sandbox Integration
If proxy-only is limiting, integrate CU for custom logic:
- Request transformation before proxying
- Response caching
- Custom error handling
- Conditional routing

### Multi-region Deployment
- Edge deployment for lower latency
- Regional data compliance

### Team Features
- Shared API key pools
- Role-based access control
- Audit logs for team admins

---

## Open Questions

1. **Secret rotation** - Auto-rotate? Manual rotate?
2. **App templates** - Provide starter templates for common use cases?
3. **Import/export** - Allow users to export their app data?

---

## References

- ZenBin Portal: `hyperio-mc/zenbin-portal` (API pattern reference)
- CU Compute Unit: `twilson63/cu`
- Scout OS Atoms API: `api.scoutos.com/atoms`
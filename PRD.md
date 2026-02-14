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

## Technical Architecture

### System Components

```
onhyper/
├── apps/                      # Next.js frontend + API routes
│   ├── pages/
│   │   ├── index.jsx         # Landing page
│   │   ├── signup.jsx        # Signup page
│   │   ├── login.jsx         # Login page
│   │   ├── dashboard.jsx     # User dashboard
│   │   ├── keys.jsx          # API key management
│   │   ├── apps/
│   │   │   ├── new.jsx       # Create new app
│   │   │   └── [id]/
│   │   │       ├── edit.jsx  # Edit app
│   │   │       └── view.jsx  # View app
│   │   └── a/
│   │       └── [slug].jsx    # Published app viewer
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup.js     # Create account
│   │   │   ├── login.js      # Login
│   │   │   └── token.js      # JWT auth
│   │   ├── secrets/
│   │   │   ├── index.js      # List/create secrets
│   │   │   └── [name].js     # Delete secret
│   │   ├── apps/
│   │   │   ├── index.js      # List/create apps
│   │   │   └── [id].js       # Get/update/delete app
│   │   └── proxy/
│   │       └── [endpoint].js # Proxy endpoint
│   └── lib/
│       ├── auth.js           # Auth utilities
│       ├── db.js             # Database client
│       ├── encryption.js     # Secret encryption
│       └── proxy.js          # Proxy logic
├── prisma/
│   └── schema.prisma         # Database schema
└── package.json
```

### Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hash
  plan      Plan     @default(FREE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  secrets   Secret[]
  apps      App[]
  apiKeys   ApiKey[]
}

model Secret {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String   // e.g., "SCOUT_API_KEY"
  value     String   // Encrypted
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, name])
}

model ApiKey {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  key       String   @unique // zb_live_xxx
  plan      Plan
  createdAt DateTime @default(now())
  
  usages    Usage[]
}

model App {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String
  slug      String   @unique // URL-safe name
  html      String   // Frontend HTML
  css       String?  // Optional CSS
  js        String?  // Optional JS
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  usages    Usage[]
}

model Usage {
  id        String   @id @default(cuid())
  apiKeyId  String
  apiKey    ApiKey   @relation(fields: [apiKeyId], references: [id])
  appId     String?
  app       App?     @relation(fields: [appId], references: [id])
  endpoint  String   // Which proxy was used
  status    Int      // HTTP status code
  duration  Int      // Duration in ms
  createdAt DateTime @default(now())
}

enum Plan {
  FREE
  HOBBY
  PRO
  BUSINESS
}
```

### Proxy Configuration

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

### Proxy Implementation

```javascript
// api/proxy/[endpoint].js
import { PROXY_ENDPOINTS } from '@/lib/proxy-config';
import { getSecret } from '@/lib/secrets';
import { verifyAppAccess } from '@/lib/auth';

export default async function handler(req, res) {
  const { endpoint } = req.query;
  const config = PROXY_ENDPOINTS[endpoint];
  
  if (!config) {
    return res.status(404).json({ error: 'Unknown endpoint' });
  }
  
  // Get app ID from header or query
  const appId = req.headers['x-app-id'] || req.query.appId;
  if (!appId) {
    return res.status(401).json({ error: 'App ID required' });
  }
  
  // Verify app exists and get owner
  const { userId } = await verifyAppAccess(appId);
  
  // Get user's secret for this endpoint
  const secret = await getSecret(userId, config.secretKey);
  if (!secret) {
    return res.status(401).json({ 
      error: `No ${config.secretKey} configured. Add it in your dashboard.` 
    });
  }
  
  // Build target URL
  const targetUrl = config.target + req.url.replace(`/api/proxy/${endpoint}`, '');
  
  // Forward request with injected auth
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      ...req.headers,
      'authorization': config.authHeader(secret),
      'host': new URL(config.target).host
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body
  });
  
  // Stream response back
  const data = await response.text();
  res.status(response.status).send(data);
}
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
- [ ] Set up Next.js project with TypeScript
- [ ] Implement authentication (signup, login, JWT)
- [ ] Database setup with Prisma
- [ ] Secret encryption/decryption

### Week 3: API Key Management
- [ ] UI for adding/removing API keys
- [ ] Encrypted storage
- [ ] Key masking in display

### Week 4: Proxy Service
- [ ] Implement proxy endpoint logic
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
- [ ] Deploy to production

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

1. **Database choice** - Prisma with SQLite for MVP, Postgres for scale?
2. **Hosting** - Railway (current), Vercel, or other?
3. **Secret rotation** - Auto-rotate? Manual rotate?
4. **App templates** - Provide starter templates for common use cases?

---

## References

- ZenBin Portal (previous iteration): `hyperio-mc/zenbin-portal`
- CU Compute Unit: `twilson63/cu`
- Scout OS Atoms API: `api.scoutos.com/atoms`
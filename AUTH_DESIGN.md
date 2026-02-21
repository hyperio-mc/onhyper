# HYPR Auth Design: Proxy-Based Authentication

## Overview

HYPR takes a **proxy-based approach** to authentication, similar to how we proxy API requests to OpenAI, ScoutOS, etc. Instead of building auth UI components, HYPR:

1. **Provides proxy tunnels** for auth provider requests
2. **Securely stores** user auth provider credentials as secrets
3. **Lets users build their own auth UI** using their chosen provider's SDK

This design keeps HYPR simple while giving users full control over their authentication experience.

---

## Why Proxy-Based Auth?

### Problems with Building Auth UI

- **Maintenance burden**: Auth providers update SDKs, UI patterns change
- **Limited flexibility**: One UI doesn't fit all use cases
- **Provider lock-in**: Hard to switch providers later
- **Compliance complexity**: Different regions have different auth requirements

### Benefits of Proxy Approach

- **Simplicity**: HYPR doesn't manage auth flows, sessions, or UI
- **Flexibility**: Users choose Clerk, WorkOS, Auth0, or any provider
- **Security**: Secrets stored encrypted, only exposed server-side
- **Portability**: Users can switch providers without HYPR changes
- **Familiar pattern**: Same model as our existing API proxy

---

## Auth Provider Options

### Clerk (Recommended for Consumer Apps)

**Best for:** B2C apps, quick time-to-market, great UX

| Feature | Details |
|---------|---------|
| Pricing | Free: 10,000 MAU; Pro: $25/mo + overages |
| Auth Methods | Email/password, OAuth (50+), passkeys, magic links, MFA |
| UI Components | Pre-built sign-in, sign-up, user profile widgets |
| Session Management | Built-in JWT handling, session refresh |
| Organizations | Yes (MAO - Monthly Active Organizations pricing) |
| B2B/SSO | SAML support (Pro + Auth add-on: $100/mo) |
| Admin Portal | No embedded admin portal |
| SDK Quality | Excellent TypeScript, React, Next.js support |

**Pricing Model:**
- Free: 10,000 MAU, 100 MAO
- Pro: $25/mo base + $0.02/MAU + $1/MAO
- Add-ons: Authentication ($100/mo), Administration ($100/mo), B2B SaaS ($100/mo)

### WorkOS (Recommended for B2B/Enterprise)

**Best for:** B2B SaaS, enterprise features, SSO-heavy apps

| Feature | Details |
|---------|---------|
| Pricing | Free: 1M MAU; $2,500 per additional 1M MAU |
| Auth Methods | Email/password, OAuth, magic auth, passkeys, MFA |
| UI Components | AuthKit (customizable sign-in widgets) |
| Session Management | Built-in with session tokens |
| Organizations | Unlimited organizations and members |
| B2B/SSO | **Best-in-class**: SAML, OIDC, 50+ IdPs supported |
| Admin Portal | Self-serve SSO/SCIM setup portal |
| Directory Sync | SCIM provisioning (included) |
| Audit Logs | Built-in SIEM integration ($125/mo streaming) |

**Pricing Model:**
- User Management: Free up to 1M MAU
- SSO Connections: $125/mo per connection
- Directory Sync: $4/user/mo (1,000 free)
- No MAO counting, no seat limits

### Comparison Matrix

| Feature | Clerk | WorkOS |
|---------|-------|--------|
| Free Tier MAU | 10,000 | 1,000,000 |
| MAO Limit | 100 | Unlimited |
| Pre-built UI | ✅ Excellent | ✅ Good (AuthKit) |
| Self-serve Admin Portal | ❌ | ✅ |
| SSO Providers | SAML only | SAML + OIDC + 50+ |
| Directory Sync (SCIM) | ❌ | ✅ |
| Enterprise Audit Logs | Add-on | Built-in |
| Best For | B2C, speed | B2B, enterprise |

**Recommendation:**
- **Choose Clerk** if building B2C apps, want fastest time-to-market, or need beautiful pre-built components
- **Choose WorkOS** if building B2B SaaS, need enterprise SSO/SCIM, or want predictable pricing at scale

---

## Technical Design

### Secret Storage

Users store their auth provider credentials as HYPR secrets:

```
CLERK_SECRET_KEY=sk_test_xxx        # Clerk backend API key
CLERK_PUBLISHABLE_KEY=pk_test_xxx   # Clerk frontend publishable key
WORKOS_API_KEY=sk_test_xxx          # WorkOS API key  
WORKOS_CLIENT_ID=client_xxx         # WorkOS client ID
WORKOS_COOKIE_SECRET=xxx            # Optional: for session encryption
```

Users can add these via:
1. Dashboard UI (Settings > Secrets)
2. API: `POST /api/secrets` or `POST /api/secrets/custom`

### Proxy Endpoints

#### Clerk Proxy Endpoints

```
POST /proxy/auth/clerk/users                 → https://api.clerk.com/v1/users
POST /proxy/auth/clerk/sessions              → https://api.clerk.com/v1/sessions
GET  /proxy/auth/clerk/sessions/:id/verify   → https://api.clerk.com/v1/sessions/:id/verify
POST /proxy/auth/clerk/sessions/:id/tokens   → https://api.clerk.com/v1/sessions/:id/tokens
DELETE /proxy/auth/clerk/sessions/:id        → https://api.clerk.com/v1/sessions/:id
GET  /proxy/auth/clerk/me                    → https://api.clerk.com/v1/me
```

#### WorkOS Proxy Endpoints

```
POST /proxy/auth/workos/users                        → https://api.workos.com/users
GET  /proxy/auth/workos/users/:id                    → https://api.workos.com/users/:id
POST /proxy/auth/workos/sessions                     → https://api.workos.com/sessions
GET  /proxy/auth/workos/sessions/:id                 → https://api.workos.com/sessions/:id
DELETE /proxy/auth/workos/sessions/:id               → https://api.workos.com/sessions/:id
POST /proxy/auth/workos/passwordless/session         → https://api.workos.com/passwordless/session
GET  /proxy/auth/workos/oauth/authorize              → Redirect to WorkOS OAuth
GET  /proxy/auth/workos/oauth/callback               → Handle OAuth callback
```

### Configuration Schema

Add to `src/config.ts`:

```typescript
export const AUTH_PROXY_ENDPOINTS = {
  clerk: {
    target: 'https://api.clerk.com/v1',
    secretKey: 'CLERK_SECRET_KEY',
    authHeader: 'Authorization',
    authFormat: 'Bearer',
    description: 'Clerk Authentication API',
    paths: {
      users: { method: 'all', path: '/users' },
      sessions: { method: 'all', path: '/sessions' },
      me: { method: 'get', path: '/me' },
    },
  },
  workos: {
    target: 'https://api.workos.com',
    secretKey: 'WORKOS_API_KEY',
    authHeader: 'Authorization',
    authFormat: 'Bearer',
    clientIdKey: 'WORKOS_CLIENT_ID',  // Some endpoints need client ID
    description: 'WorkOS Authentication API',
    paths: {
      users: { method: 'all', path: '/users' },
      sessions: { method: 'all', path: '/sessions' },
      passwordless: { method: 'all', path: '/passwordless' },
      oauth: { method: 'all', path: '/oauth' },
    },
  },
} as const;
```

### Request Flow

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  HYPR Proxy     │────▶│  HYPR Server │────▶│   Clerk /   │
│  (User App) │     │  /proxy/auth/*  │     │  Secret Store│     │   WorkOS    │
└─────────────┘     └─────────────────┘     └──────────────┘     └─────────────┘
       │                    │                      │                     │
       │  1. Request with   │                      │                     │
       │     X-App-Slug     │                      │                     │
       │                    │                      │                     │
       │                    │  2. Look up app      │                     │
       │                    │     owner's secrets  │                     │
       │                    │                      │                     │
       │                    │  3. Decrypt secret   │                     │
       │                    │     and inject auth  │                     │
       │                    │                      │                     │
       │                    │  4. Forward to ─────────────────────────▶  │
       │                    │     auth provider    │                     │
       │                    │                      │                     │
       │  5. Response ◀─────────────────────────────────────────────────│
       │     (no secrets exposed)                  │                     │
       ▼                    ▼                      ▼                     ▼
```

### Implementation Pattern

Following the existing proxy pattern in `src/routes/proxy.ts`:

```typescript
// src/routes/authProxy.ts

import { Hono } from 'hono';
import { AUTH_PROXY_ENDPOINTS } from '../config.js';
import { getSecretValue } from '../lib/secrets.js';
import { identifyUser } from './proxy.js'; // Reuse existing auth logic

const authProxy = new Hono();

// Handler for auth provider requests
authProxy.all('/:provider/*', async (c) => {
  const provider = c.req.param('provider');
  const config = AUTH_PROXY_ENDPOINTS[provider];
  
  if (!config) {
    return c.json({ error: 'Unknown auth provider', available: Object.keys(AUTH_PROXY_ENDPOINTS) }, 404);
  }
  
  // Identify user (supports JWT, API key, X-App-Slug)
  const identity = await identifyUser(c);
  if (!identity) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  // Get secret
  const secretKey = getSecretValue(identity.userId, config.secretKey);
  if (!secretKey) {
    return c.json({ 
      error: `No ${config.secretKey} configured`,
      hint: `Add ${config.secretKey} in Settings > Secrets`
    }, 401);
  }
  
  // Build target URL
  const path = c.req.path.replace(`/proxy/auth/${provider}`, '');
  const targetUrl = config.target + path;
  
  // Build headers
  const headers = {
    [config.authHeader]: config.authFormat === 'Bearer' 
      ? `Bearer ${secretKey}` 
      : secretKey,
    'Content-Type': 'application/json',
  };
  
  // Forward request
  const response = await fetch(targetUrl, {
    method: c.req.method,
    headers,
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.text(),
  });
  
  // Return response with CORS
  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': response.headers.get('content-type') || 'application/json',
  };
  
  return new Response(await response.text(), {
    status: response.status,
    headers: responseHeaders,
  });
});

export { authProxy };
```

---

## User Experience

### Step 1: Choose Auth Provider

User creates an account with Clerk or WorkOS and gets their API keys.

**Clerk Setup:**
1. Create account at clerk.com
2. Create new application
3. Copy `Secret Key` and `Publishable Key`

**WorkOS Setup:**
1. Create account at workos.com
2. Create new application
3. Copy `API Key` and `Client ID`

### Step 2: Add Secrets to HYPR

Via Dashboard (Settings > Secrets):
```
CLERK_SECRET_KEY = sk_test_xxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY = pk_test_xxxxxxxxxxxx
```

Or via API:
```bash
curl -X POST https://onhyper.io/api/secrets \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "CLERK_SECRET_KEY", "value": "sk_test_xxx"}'
```

### Step 3: Build Auth UI

Users build their own auth UI using their provider's SDK:

**Clerk Example (React):**
```jsx
// User's app - they control the UI
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react';

const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <SignIn routing="path" path="/sign-in" />
      <SignUp routing="path" path="/sign-up" />
    </ClerkProvider>
  );
}
```

**WorkOS Example (React):**
```jsx
// User's app - they control the UI
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react';

function App() {
  return (
    <AuthKitProvider clientId={process.env.VITE_WORKOS_CLIENT_ID}>
      <AuthRoutes />
    </AuthKitProvider>
  );
}
```

### Step 4: Use HYPR Proxy for Backend Calls

For server-side operations (user management, session validation):

```javascript
// Server-side in user's app
// Verify session via HYPR proxy
const session = await fetch('https://onhyper.io/proxy/auth/clerk/sessions/verify', {
  method: 'POST',
  headers: {
    'X-App-Slug': 'my-app',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ token }),
});

// Create user via WorkOS
const user = await fetch('https://onhyper.io/proxy/auth/workos/users', {
  method: 'POST',
  headers: {
    'X-App-Slug': 'my-app',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    email: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe',
  }),
});
```

---

## Authentication Patterns

### Pattern 1: Frontend-Only (Clerk/WorkOS SDK)

**Best for:** Consumer apps, simple auth flows

```javascript
// Frontend: Use provider SDK directly
// The SDK handles everything client-side
<ClerkProvider publishableKey="pk_test_xxx">
  <App />
</ClerkProvider>

// No HYPR proxy needed for basic auth
// HYPR proxy only used for admin operations
```

### Pattern 2: Hybrid (SDK + Proxy)

**Best for:** Apps needing server-side user management

```javascript
// Frontend: Use provider SDK for UI
<ClerkProvider publishableKey="pk_test_xxx">
  <App />
</ClerkProvider>

// Backend: Use HYPR proxy for admin operations
const user = await fetch('/proxy/auth/clerk/users', {
  method: 'POST',
  headers: { 'X-App-Slug': 'my-app' },
  body: JSON.stringify({ email_address: ['user@example.com'] }),
});
```

### Pattern 3: Full Proxy (Custom Auth UI)

**Best for:** Complete control over auth experience

```javascript
// User builds custom UI
// All auth calls go through HYPR proxy
const handleLogin = async (email, password) => {
  const response = await fetch('/proxy/auth/workos/sessions', {
    method: 'POST',
    headers: { 'X-App-Slug': 'my-app' },
    body: JSON.stringify({ email, password }),
  });
  // Handle response
};
```

---

## Security Considerations

### What HYPR Stores

| Secret | Purpose | Encrypted |
|--------|---------|-----------|
| `CLERK_SECRET_KEY` | Backend API operations | ✅ AES-256-GCM |
| `CLERK_PUBLISHABLE_KEY` | Frontend SDK (safe to expose) | ❌ (public) |
| `WORKOS_API_KEY` | Backend API operations | ✅ AES-256-GCM |
| `WORKOS_CLIENT_ID` | Frontend SDK (safe to expose) | ❌ (public) |
| `WORKOS_COOKIE_SECRET` | Session encryption | ✅ AES-256-GCM |

### Security Model

1. **Secrets never sent to frontend** - Only decrypt server-side
2. **Proxy validates auth** - X-App-Slug, JWT, or API key required
3. **Rate limiting** - Apply existing proxy rate limits
4. **Audit logging** - Log all auth proxy requests
5. **CORS headers** - Restricted to app domains (future: configurable)

### Recommendations for Users

1. **Use read-only keys when possible** - Some providers offer restricted keys
2. **Set up webhook signatures** - Validate callbacks from auth provider
3. **Enable MFA** - Protect HYPR account with 2FA
4. **Monitor audit logs** - Review auth proxy usage in activity tab
5. **Rotate keys regularly** - Delete and recreate secrets periodically

---

## Implementation Roadmap

### Phase 1: Clerk Proxy (Week 1-2)

- [ ] Add Clerk proxy configuration to config.ts
- [ ] Create `/proxy/auth/clerk/*` endpoints
- [ ] Test with real Clerk account
- [ ] Document Clerk setup instructions
- [ ] Add audit logging for auth endpoints

### Phase 2: WorkOS Proxy (Week 2-3)

- [ ] Add WorkOS proxy configuration to config.ts
- [ ] Create `/proxy/auth/workos/*` endpoints
- [ ] Handle OAuth redirect flow (requires special handling)
- [ ] Test with real WorkOS account
- [ ] Document WorkOS setup instructions

### Phase 3: Polish & Documentation (Week 3-4)

- [ ] Add auth proxy to dashboard Secrets UI
- [ ] Create guided setup wizard
- [ ] Write integration guides for Clerk and WorkOS
- [ ] Add example apps for each pattern
- [ ] Update pricing page (no additional cost)

---

## API Reference

### Check Auth Provider Setup

```http
GET /api/auth-proxy/check/:provider
Authorization: Bearer <jwt>
```

Response:
```json
{
  "provider": "clerk",
  "configured": true,
  "missingSecrets": []
}
```

### List Available Providers

```http
GET /proxy/auth
Authorization: Bearer <jwt>
```

Response:
```json
{
  "providers": [
    {
      "name": "clerk",
      "target": "https://api.clerk.com/v1",
      "configured": true,
      "description": "Clerk Authentication API"
    },
    {
      "name": "workos",
      "target": "https://api.workos.com",
      "configured": false,
      "missingSecrets": ["WORKOS_API_KEY", "WORKOS_CLIENT_ID"]
    }
  ]
}
```

### Proxy Auth Request

```http
POST /proxy/auth/clerk/users
X-App-Slug: my-app
Content-Type: application/json

{
  "email_address": ["user@example.com"],
  "password": "securepassword123"
}
```

Response: Proxied from Clerk API

---

## Cost Analysis

### HYPR Costs

- **No additional infrastructure** - Uses existing proxy system
- **Minimal code** - ~200 lines for auth proxy routes
- **No auth provider fees** - Users pay their provider directly

### User Costs

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Clerk | 10,000 MAU | $25/mo + $0.02/MAU |
| WorkOS | 1,000,000 MAU | $2,500/1M MAU |

**Recommendation for users:**
- B2C apps: Clerk free tier covers most early-stage apps
- B2B apps: WorkOS free tier (1M MAU) is generous for enterprise

---

## FAQ

### Q: Why not build auth UI for users?

A: Auth providers have excellent SDKs. Building our own UI would be redundant and limit user flexibility. The proxy approach lets users use the best UI for their use case while keeping backend logic simple.

### Q: Can users use multiple auth providers?

A: Yes! Add secrets for both Clerk and WorkOS, then choose which to use per app.

### Q: What about OAuth redirects?

A: OAuth flows that require browser redirects (SSO, social login) need special handling:
- Frontend initiates OAuth via provider SDK
- HYPR proxy handles backend callbacks
- Session validation happens via proxy

### Q: How is this different from just using Clerk directly?

A: Similar to our API proxy, the benefit is:
1. **Secrets stay secure** - Never exposed to frontend
2. **Centralized management** - All secrets in one place
3. **App isolation** - Each app uses its owner's secrets
4. **Audit trail** - All auth requests logged

### Q: What if I want Clerk's pre-built components?

A: Use them! Clerk's React components work client-side with the publishable key. Use HYPR proxy only for backend operations (user creation, session management, etc.).

---

## Summary

HYPR's proxy-based auth design:

1. **Users choose their provider** - Clerk (B2C) or WorkOS (B2B)
2. **Users add their keys as secrets** - Stored encrypted in HYPR
3. **Users build their own UI** - Using provider SDKs or custom components
4. **HYPR proxies backend calls** - Securely injects secrets server-side
5. **Familiar pattern** - Same model as existing API proxy

This approach keeps HYPR simple while giving users maximum flexibility and control over their authentication experience.
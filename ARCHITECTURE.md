# OnHyper Architecture Documentation

This document provides a deep dive into OnHyper's technical architecture, data flows, and security model.

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Storage](#data-storage)
3. [Security Model](#security-model)
4. [Request Flows](#request-flows)
5. [Authentication & Authorization](#authentication--authorization)
6. [Proxy Service Detail](#proxy-service-detail)
7. [App Publishing System](#app-publishing-system)
8. [Rate Limiting](#rate-limiting)
9. [Analytics & Tracking](#analytics--tracking)

---

## System Overview

OnHyper is a single-server application built on Hono (a fast web framework). It serves both the frontend SPA and the API from the same process.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OnHyper Server                                  │
│                              (Hono + Node.js)                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                           Middleware Stack                               ││
│  │                                                                          ││
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ ││
│  │   │   Logger    │──▶│    CORS     │──▶│ Rate Limit  │──▶│    Auth     │ ││
│  │   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘ ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                              Route Handlers                              ││
│  │                                                                          ││
│  │   Public Routes:                    Protected Routes (requireAuth):      ││
│  │   - /api/auth/*                     - /api/secrets/*                     ││
│  │   - /api/waitlist/*                 - /api/apps/*                        ││
│  │   - /api/blog/*                     - /api/dashboard/*                   ││
│  │   - /api/chat/*                                                          ││
│  │   - /proxy/* (uses own auth)        Proxy Endpoints:                     ││
│  │   - /a/* (public apps)              - /proxy/:endpoint/*                 ││
│  │   - /* (static files)                                                    ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                              Data Layer                                  ││
│  │                                                                          ││
│  │   ┌─────────────────────┐     ┌─────────────────────┐                   ││
│  │   │       SQLite        │     │        LMDB         │                   ││
│  │   │                     │     │                     │                   ││
│  │   │  - Users            │     │  - App Content      │                   ││
│  │   │  - Secrets (enc)    │     │  - App Metadata     │                   ││
│  │   │  - Apps             │     │  - User App Lists   │                   ││
│  │   │  - API Keys         │     │                     │                   ││
│  │   │  - Usage Records    │     │  (Fast KV access)   │                   ││
│  │   │  - Waitlist         │     │                     │                   ││
│  │   └─────────────────────┘     └─────────────────────┘                   ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Storage

OnHyper uses a dual-database approach:

### SQLite (Structured Data)

Used for relational data with complex queries:
- Users and authentication
- Encrypted secrets
- Apps metadata
- API keys
- Usage tracking
- Waitlist system
- Leads

```sql
-- Core tables
users          -- User accounts (email, password_hash, plan)
secrets        -- Encrypted API keys (value_encrypted, iv, salt)
api_keys       -- Programmatic access tokens (oh_live_...)
apps           -- Published apps (name, slug, html, css, js)
usage          -- Request tracking (endpoint, status, duration)
waitlist_*     -- Waitlist system tables
leads          -- Captured leads from chat
```

### LMDB (Fast Key-Value)

Used for frequently accessed content:
- App HTML/CSS/JS content
- App metadata cache
- User app lists

```javascript
// Key patterns
app:{appId}:content     → { appId, html, css, js, updatedAt }
app:{appId}:meta        → { appId, userId, name, slug }
user:{userId}:apps      → [appId1, appId2, ...]
```

**Why dual storage?**
- SQLite: ACID transactions, complex queries, relationships
- LMDB: Blazing fast reads for app rendering (no SQL overhead)

---

## Security Model

### Secret Encryption Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Secret Storage Flow                             │
│                                                                           │
│  User Input: "sk-ant-api03-xxxxx"                                        │
│       │                                                                   │
│       ▼                                                                   │
│  ┌─────────────────┐                                                     │
│  │  Generate Salt  │  ← 32 random bytes                                  │
│  │   (32 bytes)    │                                                     │
│  └────────┬────────┘                                                     │
│           │                                                               │
│           ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     Key Derivation (PBKDF2)                          │ │
│  │                                                                      │ │
│  │   Input: Master Key (env) + Salt                                    │ │
│  │   Output: 32-byte encryption key                                    │ │
│  │   Iterations: 100,000                                               │ │
│  │   Algorithm: SHA-256                                                │ │
│  │                                                                      │ │
│  └────────────────────────────────┬────────────────────────────────────┘ │
│                                   │                                       │
│                                   ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    AES-256-GCM Encryption                            │ │
│  │                                                                      │ │
│  │   Input: Secret plaintext + IV (16 random bytes)                   │ │
│  │   Output: Ciphertext + Auth Tag (16 bytes)                         │ │
│  │                                                                      │ │
│  └────────────────────────────────┬────────────────────────────────────┘ │
│                                   │                                       │
│                                   ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     SQLite Storage                                    │ │
│  │                                                                      │ │
│  │   secret_id    │ user_id │ name          │ value_encrypted │ iv │ salt │
│  │   uuid         │ uuid    │ SCOUT_API_KEY │ hex...          │ hex│ hex  │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Why This Design?

1. **Per-secret salts**: Each secret has unique salt, so identical secrets have different ciphertexts
2. **PBKDF2 derivation**: Makes brute-force attacks expensive (100k iterations)
3. **GCM mode**: Provides both encryption AND integrity verification
4. **Auth tag**: Any tampering with ciphertext will be detected

### Master Key Security

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Master Key Handling                              │
│                                                                          │
│  Development:                                                            │
│  - Default key in config.ts (INSECURE - dev only!)                      │
│  - Server logs warning on startup                                        │
│                                                                          │
│  Production:                                                             │
│  - MUST set ONHYPER_MASTER_KEY env var                                   │
│  - Server FAILS TO START if using default                               │
│  - Use: openssl rand -hex 32                                             │
│                                                                          │
│  Key Rotation (manual process):                                          │
│  1. Generate new master key                                              │
│  2. Decrypt all secrets with old key                                     │
│  3. Re-encrypt with new key                                              │
│  4. Update env var                                                       │
│  5. Restart server                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flows

### Proxy Request Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Proxy Request Flow                                   │
│                                                                               │
│  Client Request:                                                              │
│  POST /proxy/scout-atoms/world/agent123/_interact                            │
│  Headers: { X-App-Slug: "my-app" }                                           │
│  Body: { messages: [...] }                                                    │
│       │                                                                        │
│       ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               1. Endpoint Validation                                     │ │
│  │                                                                          │ │
│  │   endpoint = "scout-atoms"                                              │ │
│  │   config = PROXY_ENDPOINTS[endpoint]                                    │ │
│  │   target = "https://api.scoutos.com"                                    │ │
│  │   secretKey = "SCOUT_API_KEY"                                           │ │
│  │                                                                          │ │
│  └────────────────────────────────────────┬────────────────────────────────┘ │
│                                            │                                  │
│                                            ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               2. User Identification                                     │ │
│  │                                                                          │ │
│  │   Try 1: Authorization: Bearer <jwt> → verify JWT                        │ │
│  │   Try 2: X-API-Key: oh_live_xxx → lookup in api_keys table              │ │
│  │   Try 3: X-App-Slug: my-app → lookup app, get owner                     │ │
│  │   Try 4: X-App-ID: uuid → lookup app, get owner                         │ │
│  │                                                                          │ │
│  │   Result: { userId: "user-uuid", appId?: "app-uuid" }                   │ │
│  │                                                                          │ │
│  └────────────────────────────────────────┬────────────────────────────────┘ │
│                                            │                                  │
│                                            ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               3. Secret Retrieval                                        │ │
│  │                                                                          │ │
│  │   SELECT * FROM secrets                                                 │ │
│  │   WHERE user_id = ? AND name = ?                                        │ │
│  │                                                                          │ │
│  │   → Get: { value_encrypted, iv, salt }                                  │ │
│  │   → Decrypt with master key + salt                                      │ │
│  │   → Result: "sk-ant-xxx" (plaintext API key)                            │ │
│  │                                                                          │ │
│  └────────────────────────────────────────┬────────────────────────────────┘ │
│                                            │                                  │
│                                            ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               4. Request Forwarding                                      │ │
│  │                                                                          │ │
│  │   Target: https://api.scoutos.com/world/agent123/_interact              │ │
│  │   Headers:                                                               │ │
│  │     Authorization: Bearer sk-ant-xxx                                    │ │
│  │     Content-Type: application/json                                      │ │
│  │     Accept-Encoding: identity  (no gzip, simpler handling)             │ │
│  │   Body: { messages: [...] }                                             │ │
│  │                                                                          │ │
│  └────────────────────────────────────────┬────────────────────────────────┘ │
│                                            │                                  │
│                                            ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               5. Response Handling                                       │ │
│  │                                                                          │ │
│  │   - Stream SSE response if content-type: text/event-stream              │ │
│  │   - Otherwise read full response                                        │ │
│  │   - Record usage (endpoint, status, duration)                           │ │
│  │   - Track in PostHog analytics                                          │ │
│  │   - Add CORS headers for browser clients                                │ │
│  │   - Return to client                                                    │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Authentication Request Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Authentication Flow                                    │
│                                                                               │
│  POST /api/auth/login                                                        │
│  Body: { email, password }                                                    │
│       │                                                                        │
│       ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               1. Validate Input                                          │ │
│  │                                                                          │ │
│  │   - Check email format                                                   │ │
│  │   - Check password present                                              │ │
│  │   - Apply strict rate limiting (10 req/min)                            │ │
│  │                                                                          │ │
│  └────────────────────────────────────────┬────────────────────────────────┘ │
│                                            │                                  │
│                                            ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               2. Lookup & Verify                                         │ │
│  │                                                                          │ │
│  │   SELECT * FROM users WHERE email = ?                                   │ │
│  │   bcrypt.compare(password, password_hash)                               │ │
│  │                                                                          │ │
│  └────────────────────────────────────────┬────────────────────────────────┘ │
│                                            │                                  │
│                                            ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               3. Generate JWT                                            │ │
│  │                                                                          │ │
│  │   jwt.sign(                                                              │ │
│  │     { sub: userId, email, plan },                                       │ │
│  │     JWT_SECRET,                                                          │ │
│  │     { expiresIn: '7d' }                                                  │ │
│  │   )                                                                      │ │
│  │                                                                          │ │
│  └────────────────────────────────────────┬────────────────────────────────┘ │
│                                            │                                  │
│                                            ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │               4. Response                                                │ │
│  │                                                                          │ │
│  │   {                                                                      │ │
│  │     user: { id, email, plan },                                          │ │
│  │     token: "eyJhbGciOiJIUzI1NiIs..."                                    │ │
│  │   }                                                                      │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization

### Supported Auth Methods

| Method | Use Case | Header Format |
|--------|----------|---------------|
| JWT Token | Dashboard sessions | `Authorization: Bearer eyJ...` |
| API Key | Programmatic access | `X-API-Key: oh_live_xxx` |
| App Slug | Published apps | `X-App-Slug: my-app-name` |
| App ID | Internal use | `X-App-ID: uuid` |

### Middleware Flow

```typescript
// src/middleware/auth.ts

async function requireAuth(c, next) {
  let user = null;
  
  // Try JWT first
  const authHeader = c.req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    user = verifyToken(token);
  }
  
  // Try API key
  if (!user) {
    const apiKey = c.req.header('x-api-key');
    if (apiKey?.startsWith('oh_live_')) {
      const keyRecord = getApiKeyByKey(apiKey);
      if (keyRecord) {
        const dbUser = getUserById(keyRecord.user_id);
        user = { userId: dbUser.id, email: dbUser.email, plan: dbUser.plan };
      }
    }
  }
  
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  c.set('user', user);
  await next();
}
```

### Authorization Levels

| Route Type | Protection | Example |
|------------|-----------|---------|
| Public | None | `/api/blog`, `/api/chat`, `/a/:slug` |
| Protected | requireAuth | `/api/apps`, `/api/secrets` |
| Admin | requireAdminAuth | `/api/waitlist/admin/*` |
| Proxy | Custom (JWT/API-Key/Slug) | `/proxy/:endpoint/*` |

---

## Proxy Service Detail

### Endpoint Configuration

```typescript
// src/config.ts

export const PROXY_ENDPOINTS = {
  'scout-atoms': {
    target: 'https://api.scoutos.com',
    secretKey: 'SCOUT_API_KEY',
    description: 'Scout OS Agents API',
  },
  'ollama': {
    target: 'https://ollama.com/v1',
    secretKey: 'OLLAMA_API_KEY',
    description: 'Ollama API',
  },
  // ... more endpoints
};
```

### Auth Header Building

Each API has different auth formats:

```typescript
function buildAuthHeader(endpoint, apiKey) {
  switch (endpoint) {
    case 'anthropic':
      return `x-api-key ${apiKey}`;      // Anthropic uses x-api-key
    default:
      return `Bearer ${apiKey}`;          // Most APIs use Bearer
  }
}
```

### Request Size Limits

- Max request body: 5MB
- Max response body: 5MB
- Request timeout: 30 seconds

### CORS Handling

All proxy responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-App-Slug, X-App-ID
```

---

## App Publishing System

### App Storage

Apps are stored in **both** SQLite and LMDB:

**SQLite** (persistent, relational):
```sql
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  html TEXT,
  css TEXT,
  js TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

**LMDB** (fast rendering):
```javascript
// app:{appId}:content
{
  appId: "uuid",
  html: "<div>...</div>",
  css: ".container { ... }",
  js: "function init() { ... }",
  updatedAt: "2024-01-15T..."
}
```

### Rendering Flow

```
GET /a/my-app → render.ts
       │
       ▼
Lookup app by slug in SQLite
       │
       ▼
Get content from LMDB (fast)
       │
       ▼
Render HTML with injected globals:
       │
       │   <script>
       │     window.ONHYPER = {
       │       proxyBase: '/proxy',
       │       appSlug: 'my-app',
       │       appId: 'uuid'
       │     };
       │   </script>
       │
       ▼
Return complete HTML page
```

### Why Dual Storage?

- **SQLite**: Reliable, queryable, supports relationships (user → apps)
- **LMDB**: Sub-millisecond reads for content on every page load
- If LMDB fails, falls back to SQLite content

---

## Rate Limiting

### Implementation

```typescript
// In-memory sliding window (per day)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Plan limits
plans: {
  FREE: { requestsPerDay: 100, maxApps: 3, maxSecrets: 5 },
  HOBBY: { requestsPerDay: 1000, maxApps: 10, maxSecrets: 20 },
  PRO: { requestsPerDay: 10000, maxApps: 50, maxSecrets: 50 },
  BUSINESS: { requestsPerDay: -1, maxApps: -1, maxSecrets: -1 },
}
```

### Client Identification

```typescript
function getClientId(c) {
  const user = getAuthUser(c);
  if (user) return `user:${user.userId}`;
  
  // Fall back to IP + user agent hash
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const ua = c.req.header('user-agent')?.slice(0, 50) || 'unknown';
  return `ip:${ip}:${ua}`;
}
```

### Strict Rate Limiting

For auth endpoints (login, signup):
- 10 requests per minute per IP
- Prevents brute-force attacks

---

## Analytics & Tracking

### PostHog Integration

```typescript
// Server-side tracking
trackServerEvent(userId, 'signup', {
  email,
  plan,
  source: 'organic'
});

trackProxyRequest({
  userId,
  appId,
  endpoint,
  status,
  durationMs,
  success
});
```

### Tracked Events

| Event | When | Properties |
|-------|------|------------|
| `signup` | User creates account | email, plan, source |
| `login` | User logs in | email |
| `proxy_request` | Proxy call made | endpoint, status, duration |
| `chat_message_sent` | Support chat message | message_count |
| `chat_lead_captured` | Email captured from chat | email |

### Usage Recording

Every proxy request is logged to SQLite:
```sql
INSERT INTO usage (id, api_key_id, app_id, endpoint, status, duration, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

This enables:
- Daily usage counts per user
- Error rate tracking
- Response time analytics

---

## Deployment Checklist

- [ ] Set `ONHYPER_JWT_SECRET` (32+ chars random)
- [ ] Set `ONHYPER_MASTER_KEY` (32+ chars random)
- [ ] Set `DATA_DIR` to persistent volume path
- [ ] Configure `SCOUTOS_API_KEY` for support chat
- [ ] Set `BASE_URL` to public URL
- [ ] Configure PostHog project (optional)
- [ ] Configure Resend for emails (optional)
- [ ] Set up SSL/TLS termination
- [ ] Configure rate limiting for production
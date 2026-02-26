# Hyper CLI - Local Development Tool

**Planning Document**  
**Date: 2026-02-24**  
**Status: Research & Planning**

---

## Executive Summary

### Is It Worth Building?

**Yes, highly recommended.** A Hyper CLI would significantly improve the developer experience and address a critical gap in the current platform. Here's why:

| Factor | Assessment |
|--------|------------|
| **Developer Pain Point** | HIGH - Currently no way to test apps locally with real secrets |
| **Competitive Parity** | HIGH - Vercel, Netlify, Firebase all offer local dev tools |
| **Implementation Complexity** | MEDIUM - Straightforward proxy + file serving |
| **Security Risk** | LOW - Secrets fetched on-demand, never stored locally in plain text |
| **User Demand** | EXPECTED - Local dev is table stakes for modern platforms |
| **Differentiation** | YES - "Test locally with production secrets" is powerful |

**ROI Estimate:** High. Small implementation effort (~2-3 weeks) for significant DX improvement. Reduces friction in the app development lifecycle, likely increasing user retention and app deployments.

---

## Problem Statement

### Current Workflow (Painful)

1. Build app locally with static files
2. Hardcode placeholder API keys for local testing
3. Upload ZIP to OnHyper
4. Replace placeholders with proxy URLs
5. Add secrets in dashboard
6. Test on production URL
7. Debug issues
8. Repeat...

### Desired Workflow (With Hyper CLI)

1. Run `hyper dev` in project folder
2. Local server starts with proxy already configured
3. Secrets fetched automatically from OnHyper account
4. Test locally with real API calls
5. Iterate quickly
6. Deploy when ready (`hyper deploy`)

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HYPER CLI                                       │
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐│
│  │   Local Server  │   │   Auth Manager  │   │      Proxy Bridge           ││
│  │   (Hono/Bun)    │   │   (Token Store) │   │   (Intercepts /proxy/*)     ││
│  └────────┬────────┘   └────────┬────────┘   └─────────────┬───────────────┘│
│           │                     │                          │                 │
│           │                     │                          │                 │
│           ▼                     ▼                          ▼                 │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐│
│  │  Static Files   │   │  Config Store   │   │   Remote Secret Fetch       ││
│  │  (./public)     │   │  (~/.hyper/)    │   │   (HTTPS to onhyper.io)     ││
│  └─────────────────┘   └─────────────────┘   └─────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OnHyper.io (Remote)                                │
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐│
│  │   Auth API      │   │  Secrets API    │   │      Proxy Endpoints        ││
│  │  /api/auth/*    │   │  /api/secrets   │   │   /proxy/:endpoint/*        ││
│  └─────────────────┘   └─────────────────┘   └─────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Local Static Server

```typescript
// Serves files from ./public or ./dist
// Injects window.HYPER config into HTML

interface HyperDevServer {
  port: number;           // Default: 3000
  staticDir: string;      // Default: ./public
  fallbackToIndex: boolean; // SPA support
  injectConfig: boolean;  // Inject HYPER_GLOBALS
}
```

**Framework Choice:** Hono (same as OnHyper server) or Bun's native server for minimal dependencies.

#### 2. Authentication Manager

```typescript
// Token storage and management

interface AuthManager {
  // Storage location: ~/.hyper/auth.json (encrypted)
  store: SecureTokenStore;
  
  // Commands
  login(): Promise<void>;      // OAuth flow or email/password
  logout(): Promise<void>;     // Clear tokens
  status(): Promise<AuthStatus>; // Check token validity
  
  // Token refresh
  refreshToken(): Promise<string>;
}

interface AuthStatus {
  loggedIn: boolean;
  email?: string;
  plan?: string;
  expiresAt?: Date;
}
```

**Token Storage:**
- macOS: Keychain integration via `security` CLI
- Linux: `secret-tool` (libsecret)
- Windows: Credential Manager via PowerShell
- Fallback: Encrypted file at `~/.hyper/auth.json` with machine-specific key

#### 3. Proxy Bridge

```typescript
// Intercepts /proxy/* requests and forwards to onhyper.io

interface ProxyBridge {
  // Local proxy configuration
  localProxyBase: string;  // http://localhost:3000/proxy
  
  // Remote target
  remoteBase: string;      // https://onhyper.io
  
  // Request flow:
  // 1. Receive request at /proxy/:endpoint/*
  // 2. Fetch user's secret from OnHyper Secrets API
  // 3. Add authentication header (X-API-Key or Bearer token)
  // 4. Forward to target API
  // 5. Stream response back to client
}

// Key insight: The CLI acts as a MINI VERSION of the OnHyper proxy
// It fetches secrets on-demand from OnHyper, then makes the API call
```

#### 4. Secrets Fetcher

```typescript
// Fetches secrets from OnHyper API

interface SecretsFetcher {
  // Get decrypted secret value (cached for session)
  getSecret(userId: string, name: string): Promise<string>;
  
  // Get all secrets for user (names only, values fetched on-demand)
  listSecrets(): Promise<SecretMetadata[]>;
  
  // Cache management
  clearCache(): void;
  refreshSecret(name: string): Promise<void>;
}

interface SecretMetadata {
  id: string;
  name: string;
  masked: string;  // ••••••••
}
```

**Secret Fetching Strategy:**

Two options:

**Option A: Fetch-and-Proxy (Recommended)**
```
1. CLI receives /proxy/scoutos/... request
2. CLI calls https://onhyper.io/api/secrets/value/SCOUT_API_KEY (new endpoint)
3. OnHyper returns decrypted secret (requires auth)
4. CLI makes request to ScoutOS with the secret
5. Response streamed back to local app
6. Secret discarded from memory after request
```

**Option B: Bulk Fetch + Local Cache**
```
1. On `hyper dev` start, fetch all secrets
2. Cache in memory (encrypted with session key)
3. Use cached secrets for proxy requests
4. Never write secrets to disk
```

**Recommendation:** Option A with short-lived memory cache (5 min). More secure, always fresh.

---

## Security Architecture

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Secrets leaked from disk | Never write decrypted secrets to disk |
| Token stolen from `~/.hyper/` | Encrypt with machine key (Keychain/libsecret) |
| MITM on secret fetch | HTTPS only, pin certificate |
| Compromised local machine | Token can be revoked from dashboard |
| Secret visible in process list | Environment variables, not CLI args |

### Authentication Flow

```
┌─────────────┐                                           ┌─────────────────┐
│  Hyper CLI  │                                           │   OnHyper.io    │
│             │                                           │                 │
│  1. hyper   │   POST /api/auth/login                    │                 │
│     login   │ ─────────────────────────────────────────▶│                 │
│             │                                           │                 │
│             │   { email, password }                     │                 │
│             │                                           │                 │
│             │                        JWT token (7 days) │                 │
│             │ ◀─────────────────────────────────────────│                 │
│             │                                           │                 │
│  2. Store   │                                           │                 │
│     token   │                                           │                 │
│     securely│                                           │                 │
└─────────────┘                                           └─────────────────┘

Alternative: Device Authorization (OAuth-like)
                                                     
┌─────────────┐                                           ┌─────────────────┐
│  Hyper CLI  │                                           │   OnHyper.io    │
│             │   1. POST /api/auth/device/start          │                 │
│             │ ─────────────────────────────────────────▶│                 │
│             │                                           │                 │
│             │   { device_code, user_code, verify_url }  │                 │
│             │ ◀─────────────────────────────────────────│                 │
│             │                                           │                 │
│             │   2. Display: "Visit onhyper.io/device    │                 │
│             │      and enter code: ABC-123"             │                 │
│             │                                           │                 │
│             │   3. Poll: POST /api/auth/device/poll     │                 │
│             │ ─────────────────────────────────────────▶│                 │
│             │                                           │                 │
│             │   (repeat until user authorizes)          │                 │
│             │                                           │                 │
│             │   4. { jwt_token }                        │                 │
│             │ ◀─────────────────────────────────────────│                 │
└─────────────┘                                           └─────────────────┘
```

### Secrets API Changes Required

**New Endpoint: `GET /api/secrets/value/:name`**

```typescript
// Returns decrypted secret value for CLI use
// Requires authentication (JWT or API key)
// Rate limited (10 requests/minute per secret)

app.get('/api/secrets/value/:name', requireAuth, async (c) => {
  const user = getAuthUser(c);
  const name = c.req.param('name');
  
  // Rate limit check
  if (!checkRateLimit(user.userId, `secret:${name}`)) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  
  // Audit log
  logAuditEvent({
    userId: user.userId,
    action: 'secret_access',
    resourceType: 'secret',
    details: { name, source: 'cli' },
  });
  
  // Get decrypted value
  const value = getSecretValue(user.userId, name);
  if (!value) {
    return c.json({ error: 'Secret not found' }, 404);
  }
  
  return c.json({ name, value });
});
```

**Security Controls:**
1. Requires authentication
2. Rate limited per secret
3. Audit logged with source='cli'
4. Optional: IP whitelist (user can restrict CLI access)

---

## CLI Commands

```
hyper [command] [options]

Commands:
  hyper login              Authenticate with OnHyper
  hyper logout             Clear stored credentials
  hyper whoami             Show current user
  
  hyper dev [dir]          Start local development server
    --port, -p             Port number (default: 3000)
    --no-proxy             Disable proxy bridge (static files only)
    --app <slug>           Associate with published app
    --env-file <path>      Load secrets to .env file (for frameworks)
    
  hyper secrets            Manage secrets
    list                   List secret names (masked)
    get <name>             Get secret value (outputs to stdout)
    set <name> <value>     Create or update secret
    delete <name>          Delete secret
    pull                   Sync secrets to .env file
    push                   Upload .env secrets to OnHyper
    
  hyper apps               Manage apps
    list                   List your apps
    create <name>          Create new app
    publish <dir>          Deploy local directory
    logs <slug>            View recent proxy requests
    
  hyper init               Create new hyper project from template
    --template <name>      Template: vanilla, react, vue, nextjs
```

### `hyper dev` Deep Dive

```bash
# Start development server
$ hyper dev

✓ Authenticated as developer@example.com (PRO plan)
✓ Fetched 5 secrets from OnHyper
✓ Proxy bridge active: /proxy/* → OnHyper
✓ Local server running at http://localhost:3000

Available proxy endpoints:
  • /proxy/scoutos/*    → ScoutOS API
  • /proxy/openai/*     → OpenAI API  
  • /proxy/anthropic/*  → Anthropic API
  • /proxy/openrouter/* → OpenRouter API
  • /proxy/custom/*     → Your custom endpoints

Watching for file changes...
```

#### Request Flow Example

```
Local App                          Hyper CLI                      OnHyper.io
   │                                   │                               │
   │ POST /proxy/scoutos/world/...    │                               │
   │──────────────────────────────────▶│                               │
   │                                   │                               │
   │                                   │ GET /api/secrets/value/       │
   │                                   │ SCOUT_API_KEY                 │
   │                                   │──────────────────────────────▶│
   │                                   │                               │
   │                                   │         { name, value }       │
   │                                   │◀──────────────────────────────│
   │                                   │                               │
   │                                   │ POST https://api.scoutos.com/ │
   │                                   │ Authorization: Bearer sk-...  │
   │                                   │──────────────────────────────▶│
   │                                   │                               │
   │                                   │           Response            │
   │                                   │◀──────────────────────────────│
   │                                   │                               │
   │           Response                │                               │
   │◀──────────────────────────────────│                               │
   │                                   │                               │
```

---

## SSE/WebSocket Considerations

### Current OnHyper Behavior

The proxy already supports Server-Sent Events streaming:

```typescript
// From proxy.ts - SSE handling
if (contentType.includes('text/event-stream')) {
  return streamSSE(c, async (stream) => {
    const reader = response.body?.getReader();
    if (!reader) return;
    
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await stream.write(decoder.decode(value));
    }
  });
}
```

### CLI Implementation

```typescript
// SSE streaming in CLI proxy bridge

async handleSSERequest(req: Request, remoteUrl: string, authToken: string) {
  const response = await fetch(remoteUrl, {
    method: req.method,
    headers: {
      ...req.headers,
      'Authorization': `Bearer ${authToken}`,
    },
    body: req.body,
  });
  
  // Stream SSE events back to client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**WebSocket:** Not currently supported by OnHyper proxy, but could be added. The CLI would need to establish a WebSocket tunnel similar to how it handles SSE.

---

## Comparison with Existing Tools

### Vercel CLI (`vercel dev`)

| Feature | Vercel | Hyper CLI |
|---------|--------|-----------|
| Local server | ✅ | ✅ |
| Fetches secrets | ✅ (`vercel env pull`) | ✅ (`hyper secrets pull`) |
| Real-time secret access | ❌ (writes to .env) | ✅ (on-demand from API) |
| Hot reload | ✅ (Next.js integration) | ✅ (file watching) |
| Emulates serverless functions | ✅ | ❌ (proxy only) |
| Production-like preview | ✅ | ✅ |

### Netlify CLI (`netlify dev`)

| Feature | Netlify | Hyper CLI |
|---------|---------|-----------|
| Local server | ✅ | ✅ |
| Netlify Functions | ✅ | ❌ |
| Environment injection | ✅ | ✅ |
| Secrets management | ✅ | ✅ |
| Edge Functions | ✅ | ❌ |

### Firebase CLI (`firebase serve`)

| Feature | Firebase | Hyper CLI |
|---------|----------|-----------|
| Local emulation | ✅ (emulators) | ❌ |
| Real Firestore | ❌ (emulator) | ✅ (proxy to real) |
| Real Auth | ❌ (emulator) | ✅ (proxy to real) |
| Functions | ✅ | ❌ |

### Hyper CLI Differentiator

**"Test locally with production secrets"** - Unlike Firebase emulators that use fake data, Hyper CLI lets you test against REAL APIs with YOUR secrets, safely encrypted and fetched on-demand.

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Basic CLI with login and static file serving

- [ ] Initialize CLI project (Bun + TypeScript)
- [ ] Implement `hyper login` with device flow
- [ ] Implement `hyper logout` and `hyper whoami`
- [ ] Create local static server (port 3000)
- [ ] Add HTML injection for `window.HYPER`
- [ ] Test locally with manual secret fetch

**Deliverable:** `hyper dev` serves files locally, `hyper login` works

### Phase 2: Proxy Bridge (Week 1-2)

**Goal:** Full proxy functionality

- [ ] Implement local `/proxy/*` handler
- [ ] Add `/api/secrets/value/:name` endpoint to OnHyper
- [ ] Implement secret fetching with caching
- [ ] Add SSE streaming support
- [ ] Add rate limiting awareness
- [ ] Test with all proxy endpoints

**Deliverable:** `hyper dev` makes real API calls locally

### Phase 3: Developer Experience (Week 2)

**Goal:** Polished CLI experience

- [ ] Add `hyper secrets list/get/set` commands
- [ ] Add `hyper secrets pull` (.env generation)
- [ ] Add `hyper apps list`
- [ ] Add `hyper init` with templates
- [ ] Implement hot reload
- [ ] Add colored output and progress indicators
- [ ] Cross-platform token storage (Keychain, etc.)

**Deliverable:** Complete developer experience

### Phase 4: Deployment (Week 2-3)

**Goal:** Deploy from CLI

- [ ] Implement `hyper deploy` command
- [ ] ZIP file creation and upload
- [ ] Progress indicator for upload
- [ ] Post-deploy URL display
- [ ] Add `hyper logs` for viewing proxy requests

**Deliverable:** Full workflow from dev to deploy

### Phase 5: Polish & Documentation (Week 3)

**Goal:** Production-ready release

- [ ] Error handling and helpful messages
- [ ] Telemetry (usage analytics, opt-in)
- [ ] Update notification
- [ ] Comprehensive documentation
- [ ] Example projects
- [ ] Video tutorial

**Deliverable:** 1.0 release

---

## File Structure

```
hyper-cli/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── login.ts          # hyper login
│   │   ├── logout.ts         # hyper logout
│   │   ├── whoami.ts         # hyper whoami
│   │   ├── dev.ts            # hyper dev
│   │   ├── secrets.ts        # hyper secrets *
│   │   ├── apps.ts           # hyper apps *
│   │   ├── init.ts           # hyper init
│   │   └── deploy.ts         # hyper deploy
│   ├── lib/
│   │   ├── auth.ts           # Token management
│   │   ├── config.ts         # CLI config (~/.hyper/)
│   │   ├── server.ts         # Local dev server
│   │   ├── proxy.ts          # Proxy bridge
│   │   ├── secrets.ts        # Secrets fetching
│   │   ├── api.ts            # OnHyper API client
│   │   └── output.ts         # Colored terminal output
│   └── types/
│       └── index.ts          # TypeScript types
├── templates/
│   ├── vanilla/              # Basic HTML/CSS/JS
│   ├── react/                # React + Vite
│   ├── vue/                  # Vue + Vite
│   └── nextjs/               # Next.js static export
├── package.json
├── tsconfig.json
└── README.md
```

---

## Configuration Schema

### ~/.hyper/config.json

```json
{
  "version": "1.0.0",
  "apiUrl": "https://onhyper.io",
  "defaultPort": 3000,
  "secretsCacheDuration": 300,
  "telemetry": true
}
```

### ~/.hyper/auth.json (encrypted)

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "expiresAt": "2026-03-03T00:00:00Z",
  "user": {
    "id": "uuid",
    "email": "developer@example.com",
    "plan": "PRO"
  }
}
```

### hyper.json (project config)

```json
{
  "name": "my-app",
  "slug": "my-app-abc123",
  "staticDir": "./public",
  "port": 3000,
  "proxiedSecrets": [
    "SCOUT_API_KEY",
    "OPENAI_API_KEY"
  ]
}
```

---

## Security Checklist

- [ ] Tokens stored encrypted using OS keychain
- [ ] Secrets never written to disk in plain text
- [ ] All API calls over HTTPS
- [ ] Token refresh before expiry
- [ ] Clear error messages on auth failure
- [ ] Logout clears all stored credentials
- [ ] Rate limited secret fetching
- [ ] Audit trail on OnHyper for CLI access

---

## Risks and Mitigations

### Risk: Secrets Exposed in Process List

**Mitigation:** Never pass secrets as command-line arguments. Use environment variables or fetch via API.

### Risk: Token Stolen from `~/.hyper/`

**Mitigation:** Encrypt with OS-specific key storage. Allow token revocation from dashboard.

### Risk: Rate Limiting on Secret Fetch

**Mitigation:** Cache secrets for 5 minutes in memory. Show warning when approaching limits.

### Risk: Breaking Changes in OnHyper API

**Mitigation:** Version the CLI and keep synchronized with API. Add `hyper update` command.

### Risk: Large Apps Slow to Develop

**Mitigation:** Efficient file watching. Consider Bun's fast file operations.

---

## Alternatives Considered

### Alternative 1: VS Code Extension

**Pros:** Integrated into IDE, visual debugging  
**Cons:** Less flexible, harder to use in CI/CD  
**Decision:** CLI first, extension later

### Alternative 2: Docker-based Development

**Pros:** Consistent environment  
**Cons:** Heavier, more complex setup  
**Decision:** Native CLI simpler for most users

### Alternative 3: Browser-based Playground

**Pros:** No local setup  
**Cons:** Can't test local files, limited features  
**Decision:** Already have this with dashboard editor

### Alternative 4: Environment File Injection Only

**Pros:** Simple, works with any tool  
**Cons:** Secrets written to disk, requires manual sync  
**Decision:** Include as option (`hyper secrets pull`), but proxy bridge is primary

---

## Success Metrics

| Metric | Target |
|--------|--------|
| CLI downloads in first month | 100+ |
| Active weekly users | 50+ |
| Support tickets about local dev | -50% |
| Time from signup to first deploy | -30% |
| User satisfaction (NPS) | +10 points |

---

## Open Questions

1. **Should secrets ever be written to disk?**
   - Current recommendation: No
   - Alternative: `hyper secrets pull` writes `.env` but warns about security

2. **How to handle multiple OnHyper accounts?**
   - Options: Multiple profiles (`hyper login --profile work`)
   - Or: Environment variable to switch

3. **Should CLI support offline mode?**
   - Cache static files, but no proxy without network
   - Low priority

4. **Integration with existing frameworks?**
   - Vite plugin for React/Vue apps?
   - Next.js integration?

---

## Appendix: API Changes Required

### New Endpoints for CLI

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/device/start` | POST | Start device login flow |
| `/api/auth/device/poll` | POST | Poll for device auth completion |
| `/api/secrets/value/:name` | GET | Get decrypted secret value |
| `/api/cli/usage` | GET | Get CLI usage statistics |
| `/api/cli/verify` | GET | Verify CLI token is valid |

### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `/api/secrets` | Add `source` field to audit log for CLI access |
| `/api/auth/login` | Return `refreshToken` for CLI use |

---

## Document Status

- [x] Executive summary with recommendation
- [x] Technical architecture
- [x] Security analysis
- [x] CLI command design
- [x] Implementation phases
- [x] Comparison with competitors
- [x] Risks and mitigations
- [x] API changes required
- [ ] Approval from team
- [ ] Implementation started

---

*Document created: 2026-02-24*  
*Author: AI Planning Agent*  
*Version: 1.0*
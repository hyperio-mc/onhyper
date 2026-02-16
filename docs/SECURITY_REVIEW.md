# OnHyper Security Review

**Review Date:** February 15, 2026  
**Reviewer:** Security Audit Agent  
**Project:** OnHyper.io - Secure Proxy Service for API-Backed Web Apps

---

## Executive Summary

**Overall Security Posture: ⚠️ MEDIUM RISK** (improved from MEDIUM-HIGH)

OnHyper demonstrates solid security architecture in several areas (encryption, password hashing, secret management). The default secrets vulnerability (CRIT-002) has been **FIXED** as of Feb 15, 2026. The most severe remaining issue involves **unprotected admin endpoints** (CRIT-001).

---

## Findings by Severity

### 🔴 CRITICAL Severity

#### CRIT-001: Unprotected Admin Endpoints
**Location:** `src/routes/waitlist.ts:237-349`

**Issue:** The admin routes (`/api/waitlist/admin/*`) have no authentication or authorization middleware. Anyone can:
- List all pending applications with emails and project details
- Approve/reject applications
- Generate invite codes
- Access the full waitlist database

```typescript
waitlist.get('/admin/pending', async (c) => {  // No auth middleware!
  // Returns sensitive user data
});

waitlist.post('/admin/:id/approve', async (c) => {  // No auth!
  // Modifies user status
});

waitlist.post('/admin/generate-invites', async (c) => {  // No auth!
  // Creates invite codes
});
```

**Impact:** 
- Unauthorized access to user PII (emails, project descriptions)
- Potential for attackers to auto-approve accounts
- Invite code abuse

**Recommendation:**
```typescript
// Add admin authentication middleware
import { requireAdmin } from '../middleware/admin.js';

waitlist.use('/admin/*', requireAdmin);
```

Create `src/middleware/admin.js`:
```typescript
export async function requireAdmin(c: Context, next: Next) {
  const user = c.get('user');
  if (!user || !config.adminEmails.includes(user.email)) {
    return c.json({ error: 'Admin access required' }, 403);
  }
  await next();
}
```

---

#### ~~CRIT-002: Production-Ready Default Secrets~~ ✅ FIXED
**Location:** `src/config.ts:16-17`

**Issue:** ~~The JWT secret and master encryption key have fallback values that will be used in production if environment variables are not set.~~

**Resolution (Feb 15, 2026):** 
Added `validateProductionSecrets()` function that:
- Detects production mode via `NODE_ENV`, `RAILWAY_ENVIRONMENT`, or `RENDER`
- Performs fail-fast validation at server startup
- Throws clear error if secrets are missing or using insecure defaults
- Only allows default values in development/test mode

Commit: `1cc9e50` - "Security: Fail fast in production with missing secrets"

---

### 🟠 HIGH Severity

#### HIGH-001: Open CORS Policy
**Location:** `src/index.ts:21`

**Issue:** CORS is configured with `*` (wildcard), allowing any origin to make requests.

```typescript
app.use('*', cors());
```

Combined with cookie/session-based auth, this enables CSRF. While the app uses Bearer tokens, browser-based attacks can still exploit this for the frontend.

**Impact:**
- Any website can make API calls to OnHyper
- Potential for data exfiltration from authenticated sessions
- CORS is permissive even for sensitive endpoints

**Recommendation:**
```typescript
app.use('*', cors({
  origin: config.production ? ['https://onhyper.io', 'https://www.onhyper.io'] : '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-App-Slug', 'X-App-ID'],
  credentials: false,  // Not using cookies
  maxAge: 86400,
}));
```

---

#### HIGH-002: XSS Vulnerability in App Rendering
**Location:** `src/routes/render.ts:38-62`

**Issue:** User-supplied HTML, CSS, and JavaScript are rendered directly into the page without sanitization.

```typescript
const renderedHtml = `
  <!DOCTYPE html>
  <html>
  <body>
    ${html}  <!-- Direct injection of user HTML -->
    <script>${js}</script>  <!-- Direct execution of user JS -->
    <style>${css}</style>  <!-- Direct injection of user CSS -->
  </body>
  </html>
`;
```

**Impact:**
- While this is intentional (apps need to run code), the app pages run in the same origin
- Any app can access cookies, localStorage, and make authenticated API calls
- Apps can steal secrets from other users who view them
- One malicious app compromises all users

**Recommendation:**
1. **Sandboxed iframe rendering** - Run apps in iframes with `sandbox` attribute:
```typescript
const renderedHtml = `
  <!DOCTYPE html>
  <html>
  <body>
    <iframe 
      sandbox="allow-scripts allow-forms" 
      srcdoc="${escapeHtml(appHtml)}"
      style="width:100%; height:100vh; border:none;"
    ></iframe>
  </body>
  </html>
`;
```

2. **Separate origin for apps** - Host apps on a subdomain like `apps.onhyper.io` to isolate cookies and localStorage.

3. **Content Security Policy** - Add CSP headers to app renders:
```typescript
c.header('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline' 'self'; style-src 'unsafe-inline' 'self'");
```

---

#### HIGH-003: Master Key Storage
**Location:** `src/lib/encryption.ts:17` and `src/config.ts:17`

**Issue:** The master encryption key is loaded from an environment variable and stored in plain text in memory. All secrets derive from this single key.

```typescript
function deriveKey(salt: Buffer): Buffer {
  return pbkdf2Sync(
    config.masterKey,  // Plain text in memory
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}
```

**Impact:**
- Memory dump or debugging reveals the master key
- Compromised master key decrypts all user secrets
- No key rotation mechanism

**Recommendation:**
1. Consider using a Hardware Security Module (HSM) or cloud KMS (AWS KMS, Google Cloud KMS)
2. Implement master key rotation mechanism
3. Consider per-user master keys derived from user password (zero-knowledge)

---

#### HIGH-004: No CSRF Protection for Frontend
**Location:** `src/index.ts` (missing)

**Issue:** While the API uses Bearer tokens (not cookies), the frontend SPA may eventually use cookie-based sessions. There's no CSRF token mechanism in place.

**Impact:**
- If cookies are added later, the app will be vulnerable to CSRF
- Current state-change endpoints have no CSRF tokens

**Recommendation:**
If cookies are ever added:
1. Implement CSRF tokens with double-submit cookie pattern
2. Use SameSite=Strict cookie attribute
3. For now, document that Bearer tokens only should be used

---

### 🟡 MEDIUM Severity

#### MED-001: In-Memory Rate Limiting
**Location:** `src/middleware/rateLimit.ts:9-16`

**Issue:** Rate limiting uses an in-memory Map, which:
- Doesn't persist across restarts
- Doesn't work in multi-instance deployments
- Can be bypassed by rotating IPs

```typescript
// In-memory rate limit tracking (replace with Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
```

**Recommendation:**
```typescript
// For production, use Redis-based rate limiting
import { Redis } from 'ioredis';

const redis = new Redis(config.redisUrl);

export async function rateLimit(c: Context, next: Next) {
  const clientId = getClientId(c);
  const key = `ratelimit:${clientId}`;
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 86400);  // 24 hours
  }
  
  // ...
}
```

---

#### MED-002: Insufficient Input Validation
**Location:** `src/routes/apps.ts` and `src/routes/secrets.ts`

**Issue:** App content (HTML/CSS/JS) and secret values lack validation:

```typescript
// apps.ts - No validation of html/css/js content
const { name, html, css, js } = body;
const app = await createApp(user.userId, name, { html, css, js });

// secrets.ts - Minimal validation
if (!name || !value) {
  return c.json({ error: 'Secret name and value are required' }, 400);
}
```

**Impact:**
- Extremely large payloads could exhaust memory
- No length limits on app code or secret values
- Potential for denial of service

**Recommendation:**
```typescript
// Add validation
const MAX_APP_SIZE = 1024 * 1024;  // 1MB total
const MAX_SECRET_LENGTH = 10000;

const totalSize = (html?.length || 0) + (css?.length || 0) + (js?.length || 0);
if (totalSize > MAX_APP_SIZE) {
  return c.json({ error: 'App content too large (max 1MB)' }, 400);
}

if (value.length > MAX_SECRET_LENGTH) {
  return c.json({ error: 'Secret value too long' },  400);
}
```

---

#### MED-003: Proxy Header Injection
**Location:** `src/routes/proxy.ts:85-98`

**Issue:** While most headers are filtered, the proxy forwards `Content-Type` and `Accept` from users:

```typescript
const forwardHeaders = ['content-type', 'accept', 'accept-language'];
for (const header of forwardHeaders) {
  const value = c.req.header(header);
  if (value) {
    headers[header] = value;
  }
}
```

This is generally safe but could potentially be exploited if the target API has header injection vulnerabilities.

**Recommendation:**
- Validate header values before forwarding:
```typescript
const isValidHeaderValue = (value: string) => !/[\r\n]/.test(value);

for (const header of forwardHeaders) {
  const value = c.req.header(header);
  if (value && isValidHeaderValue(value)) {
    headers[header] = value;
  }
}
```

---

#### MED-004: Password Requirements
**Location:** `src/config.ts:27` and `src/lib/users.ts:8-11`

**Issue:** Minimum password length is 8 characters with no complexity requirements.

```typescript
minPasswordLength: parseInt(process.env.AUTH_MIN_PASSWORD_LENGTH || '8', 10),
```

**Recommendation:**
- Increase minimum to 12 characters
- Add complexity requirements (or better, use a password strength checker):
```typescript
if (password.length < 12) {
  throw new Error('Password must be at least 12 characters');
}
if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
  throw new Error('Password must contain uppercase, lowercase, and numbers');
}
```

---

#### MED-005: JWT Token Expiration
**Location:** `src/config.ts:28` and `src/lib/users.ts:53`

**Issue:** JWT tokens expire after 7 days with no refresh mechanism.

```typescript
jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
```

**Impact:**
- Stolen tokens are valid for up to 7 days
- No way to revoke tokens (no token blacklist)

**Recommendation:**
1. Shorten access token expiration to 15-60 minutes
2. Implement refresh tokens stored in database
3. Add token revocation mechanism:
```typescript
// Add token_blacklist table
db.exec(`
  CREATE TABLE IF NOT EXISTS token_blacklist (
    jti TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Check blacklist before accepting token
```

---

#### MED-006: Dependency Vulnerabilities
**Location:** `package.json`

**Issue:** npm audit reveals 7 vulnerabilities (5 moderate, 2 high) in development dependencies:

| Package | Severity | Issue |
|---------|----------|-------|
| tar | HIGH | Arbitrary file overwrite, symlink poisoning |
| esbuild | MODERATE | Dev server request interception |
| vite | MODERATE | Downstream from esbuild |
| vitest | MODERATE | Downstream from vite |

**Impact:** These are dev dependencies, so production risk is lower. However, CI/CD pipelines could be affected.

**Recommendation:**
```bash
npm update vitest  # Updates to 4.0.18 which fixes issues
npm audit fix
```

---

### 🟢 LOW Severity

#### LOW-001: bcrypt Rounds Configuration
**Location:** `src/config.ts:25`

**Issue:** bcrypt uses 10 rounds (default). While acceptable, modern recommendations suggest 12+ for better security.

```typescript
bcryptRounds: parseInt(process.env.AUTH_BCRYPT_ROUNDS || '10', 10),
```

**Recommendation:**
```typescript
bcryptRounds: parseInt(process.env.AUTH_BCRYPT_ROUNDS || '12', 10),
```

---

#### LOW-002: Error Information Leakage
**Location:** Multiple files

**Issue:** Some error messages reveal internal details:

```typescript
// src/lib/db.ts
throw new Error('Database not initialized. Call initDatabase() first.');

// src/routes/auth.ts
const message = error instanceof Error ? error.message : 'Failed to create account';
return c.json({ error: message }, 400);
```

**Impact:** Low risk, but could reveal implementation details.

**Recommendation:** In production, use generic error messages:
```typescript
if (process.env.NODE_ENV === 'production') {
  return c.json({ error: 'An error occurred' }, 500);
} else {
  return c.json({ error: message }, 500);
}
```

---

#### LOW-003: PBKDF2 Hash Selection
**Location:** `src/lib/encryption.ts:21`

**Issue:** PBKDF2 uses SHA-256, which is acceptable but not ideal for key derivation.

```typescript
return pbkdf2Sync(config.masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');
```

**Recommendation:** Consider bcrypt or Argon2 for password-based key derivation if ever converting to user-derived keys. For current server-side key derivation, this is acceptable.

---

## Security Strengths

The following areas demonstrate good security practices:

### ✅ Encryption Implementation
- AES-256-GCM with proper IV handling and authentication tags
- Per-user salts for key derivation
- Secrets are never returned to the frontend after creation

### ✅ Password Storage
- bcrypt with salt (proper password hashing)
- Configurable work factor

### ✅ API Key Design
- Distinct prefix (`oh_live_`) for easy identification
- Separate table for tracking and revocation

### ✅ Proxy Security
- Proper header filtering (removing auth headers from passthrough)
- Request/response size limits
- Timeout enforcement
- No gzip compression forwarding (prevents response manipulation)

### ✅ SQL Injection Prevention
- Consistent use of parameterized queries throughout
- No string concatenation in SQL

### ✅ Docker Configuration
- Non-root capable (standard node image)
- Production dependency pruning
- Health checks implemented

---

## Recommendations Summary

### Immediate Actions (Before Production)
1. ~~**CRITICAL:** Remove default secrets, fail fast if not configured~~ ✅ DONE (Feb 15, 2026)
2. **CRITICAL:** Protect admin endpoints with authentication
3. **HIGH:** Configure CORS for specific origins only
4. **HIGH:** Implement app sandboxing (iframe or separate origin)

### Short-Term (Within 1 Week)
5. **HIGH:** Move rate limiting to Redis or similar
6. **MEDIUM:** Add input validation with size limits
7. **MEDIUM:** Implement refresh token mechanism
8. **Update dependencies** to fix npm vulnerabilities

### Medium-Term (Within 1 Month)
9. **HIGH:** Consider HSM/KMS for master key storage
10. **MEDIUM:** Add password complexity requirements
11. **MEDIUM:** Implement CSRF protection if cookies are added
12. **LOW:** Increase bcrypt rounds to 12+

---

## Security Checklist for Deployment

```bash
# Pre-deployment verification
[✓] ONHYPER_JWT_SECRET is set to a secure random value (min 32 chars) - ENFORCED BY SERVER
[✓] ONHYPER_MASTER_KEY is set (min 32 chars) - ENFORCED BY SERVER
[ ] Admin endpoints are protected
[ ] CORS configured for production domain only
[ ] Rate limiting uses Redis (or accept in-memory for single instance)
[ ] All dependencies updated (npm audit clean)
[ ] POSTHOG_KEY set for analytics
[ ] RESEND_API_KEY set for emails
```

---

## Conclusion

OnHyper has a solid foundation for a secrets management and proxy service. The core encryption architecture is sound, and the JWT/API key authentication is properly implemented. The **default secrets vulnerability has been fixed** - the server will now refuse to start in production mode without proper secrets configured. 

**The unprotected admin endpoints remain a critical issue** that must be addressed before production deployment.

**Risk Rating Progression:**
- ~~Current: ⚠️ **MEDIUM-HIGH RISK** (not production-ready)~~ ✅ RESOLVED
- After Default Secrets Fix: ⚠️ **MEDIUM RISK** (admin endpoints exposed)
- After Admin Auth Fix: ✅ **MEDIUM RISK** (production-viable with monitoring)
- After All Fixes: ✅ **LOW-MEDIUM RISK** (production-ready)

---

*Review completed by Security Audit Agent on February 15, 2026*
# OnHyper Code Review Report

**Date:** 2026-02-20
**Reviewer:** Automated Code Review
**Files Analyzed:** 47 TypeScript files
**Lines of Code:** ~8,000+

## Executive Summary

The OnHyper codebase demonstrates solid architecture with well-organized modules, comprehensive test coverage (163 tests passing), and good documentation. However, several security and performance concerns warrant attention.

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 0 | 2 | 3 | 2 |
| Performance | 0 | 0 | 3 | 2 |
| Architecture | 0 | 0 | 3 | 4 |

---

## Build & Test Results

### Build Status: ✅ PASS
```
> onhyper@1.0.0 build
> tsc
```
TypeScript compilation succeeded with no errors.

### Test Results: ✅ PASS
```
✓ src/lib/encryption.test.ts (20 tests) 168ms
✓ src/routes/settings.test.ts (28 tests | 8 skipped) 787ms
✓ src/lib/subdomains.test.ts (87 tests) 833ms
✓ src/lib/users.test.ts (36 tests) 1587ms

Test Files  4 passed (4)
Tests  163 passed | 8 todo (171)
```

---

## Security Issues

### HIGH SEVERITY

#### SECH-001: XSS Vulnerability in App Rendering
**File:** `src/routes/render.ts` (lines 87-106)
**Severity:** HIGH

**Description:** User-controlled HTML, CSS, and JavaScript is rendered directly into the page without sanitization. Malicious users could inject:
- `<script>` tags for XSS attacks
- `<iframe>` for clickjacking
- CSS keyloggers via `input[type="password"] { background: url(...) }`
- JavaScript that exfiltrates user data

**Code:**
```typescript
const renderedHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>...<style>/* User CSS */ ${css}</style></head>
  <body>
    ${html}  // User HTML - no sanitization
    <script>${js}</script>  // User JS - no sanitization
  </body>
  </html>
`;
```

**Recommendation:**
1. Implement Content Security Policy (CSP) headers for rendered apps
2. Sandboxed iframe approach for user content
3. Consider using DOMPurify or similar for HTML sanitization
4. Add clear warnings in the UI that apps run with user privileges

---

#### SECH-002: Insecure Default Secrets in Production Check
**File:** `src/config.ts` (lines 58-102)
**Severity:** HIGH (reduced by validation at startup)

**Description:** Default development secrets could potentially be used in production if environment detection fails. While `validateProductionSecrets()` is called at startup, the logic for production detection could miss edge cases.

**Code:**
```typescript
jwtSecret: process.env.ONHYPER_JWT_SECRET || 'dev-jwt-secret-change-in-production',
masterKey: process.env.ONHYPER_MASTER_KEY || 'dev-master-key-change-in-production',
```

**Recommendation:**
1. Add explicit `NODE_ENV=production` check to startup
2. Consider using a secrets management service (Vault, AWS Secrets Manager)
3. Add runtime checks that periodically validate secrets aren't defaults

---

### MEDIUM SEVERITY

#### SECM-001: In-Memory Rate Limiting
**File:** `src/middleware/rateLimit.ts` (lines 13-25)
**Severity:** MEDIUM

**Description:** Rate limiting is implemented with an in-memory Map. This:
- Doesn't scale horizontally (multiple server instances won't share state)
- Loses all rate limit data on restart
- Vulnerable to memory exhaustion attacks

**Code:**
```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
```

**Recommendation:**
1. Use Redis for distributed rate limiting (as noted in comments)
2. Add maximum size limit to the Map
3. Consider rate limit by API key in addition to user/IP

---

#### SECM-002: Missing CSRF Protection
**File:** `src/index.ts` (line 25)
**Severity:** MEDIUM

**Description:** CORS is enabled globally but there's no CSRF token protection for state-changing operations. While JWT/API key auth provides some protection, browser-based sessions could be vulnerable.

**Code:**
```typescript
app.use('*', cors());  // No CSRF configuration
```

**Recommendation:**
1. Implement CSRF tokens for browser-based form submissions
2. Use SameSite cookie attribute if cookies are used
3. Consider using `cors({ origin: whitelist })` instead of `cors()`

---

#### SECM-003: Timing Attack in Admin Key Comparison
**File:** `src/middleware/auth.ts` (lines 147-166)
**Severity:** MEDIUM

**Description:** While timing-safe comparison is attempted, the early length check could leak information about key validity.

**Code:**
```typescript
let isValid = adminKey.length === masterKey.length;
if (isValid) {
  for (let i = 0; i < adminKey.length; i++) {
    if (adminKey.charCodeAt(i) !== masterKey.charCodeAt(i)) {
      isValid = false;
    }
  }
}
```

**Recommendation:**
1. Use Node.js `crypto.timingSafeEqual()` instead
2. Always compare full-length buffers

```typescript
import { timingSafeEqual } from 'crypto';

const adminBuf = Buffer.from(adminKey.padEnd(128, '\0'));
const masterBuf = Buffer.from(masterKey.padEnd(128, '\0'));
const isValid = timingSafeEqual(adminBuf, masterBuf);
```

---

### LOW SEVERITY

#### SECL-001: Error Messages Reveal Internal Details
**File:** `src/routes/proxy.ts` (lines 225-229)
**Severity:** LOW

**Description:** Error messages expose internal implementation details that could aid attackers.

**Code:**
```typescript
if (error.name === 'AbortError') {
  return c.json({ error: 'Request timed out' }, 504);
}
return c.json({ error: error.message }, 502);
```

**Recommendation:**
1. Log full error details server-side
2. Return generic error messages to clients
3. Use error codes instead of free-form messages

---

#### SECL-002: IP Address Handling in Headers
**File:** Multiple files
**Severity:** LOW

**Description:** IP addresses are extracted from `X-Forwarded-For` and `X-Real-IP` headers without validation. An attacker could spoof these headers.

**Code:**
```typescript
const forwardedFor = c.req.header('x-forwarded-for');
const realIp = c.req.header('x-real-ip');
const ip = forwardedFor?.split(',')[0].trim() || realIp || undefined;
```

**Recommendation:**
1. Configure trusted proxy list
2. Validate IP address format before hashing
3. Use Express's `trust proxy` setting equivalent

---

## Performance Issues

### MEDIUM SEVERITY

#### PERF-001: Missing Database Indexes
**File:** `src/lib/db.ts`
**Severity:** MEDIUM

**Description:** Some frequently queried columns lack indexes:

- `audit_logs.action` - queried for filtering
- `audit_logs.resource_type` - queried for filtering  
- `custom_secrets.user_id` - foreign key without index

**Recommendation:**
```sql
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_custom_secrets_user ON custom_secrets(user_id);
```

---

#### PERF-002: Synchronous Analytics Updates
**File:** `src/lib/appAnalytics.ts` (lines 60-85)
**Severity:** MEDIUM

**Description:** Analytics tracking blocks request processing with database writes. The `setImmediate` usage helps but the aggregate update has race conditions.

**Code:**
```typescript
export function trackAppView(appId: string, data: ViewData = {}): void {
  const db = getDatabase();
  // ... synchronous INSERT ...
  updateDailyAggregate(appId, today, 'view');  // synchronous
}
```

**Recommendation:**
1. Use a background job queue (BullMQ, etc.)
2. Batch analytics writes
3. Consider time-series optimized storage (TimescaleDB)

---

#### PERF-003: Dual Storage Synchronization Risk
**File:** `src/lib/apps.ts` and `src/lib/lmdb.ts`
**Severity:** MEDIUM

**Description:** App content is stored in both SQLite and LMDB. If a write fails to one but succeeds to the other, data becomes inconsistent.

**Code:**
```typescript
// In createApp():
db.prepare(`INSERT INTO apps...`).run(...);  // SQLite
await AppContentStore.save(id, {...});        // LMDB - could fail
```

**Recommendation:**
1. Implement transaction-like pattern with rollback
2. Add consistency check on startup
3. Consider SQLite as primary with LMDB as cache only

---

### LOW SEVERITY

#### PERFL-001: No Connection Pooling Configuration
**File:** `src/lib/db.ts` (line 57)
**Severity:** LOW

**Description:** better-sqlite3 is created without explicit pool configuration.

**Recommendation:**
Add read-only connections for scaling read operations.

---

#### PERFL-002: Large JSON Parsing in Feature Rules
**File:** `src/lib/features.ts` (lines 80-91)
**Severity:** LOW

**Description:** Custom rules JSON is parsed on every feature check. For frequently checked features, this adds overhead.

**Recommendation:**
Cache parsed rules or parse once at flag retrieval.

---

## Architecture Issues

### MEDIUM SEVERITY

#### ARCH-001: No Input Validation Library
**File:** Multiple
**Severity:** MEDIUM

**Description:** Input validation is done manually with inconsistent patterns. No schema validation library is used.

**Examples:**
```typescript
// Pattern 1 - Manual checks
if (!email || !password) {
  return c.json({ error: 'Email and password are required' }, 400);
}

// Pattern 2 - Regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pattern 3 - Length check
if (password.length < config.auth.minPasswordLength) {...}
```

**Recommendation:**
1. Adopt Zod or Joi for schema validation
2. Create reusable validation middleware
3. Standardize error response format

---

#### ARCH-002: No Centralized Error Handling
**File:** `src/index.ts` (lines 163-166)
**Severity:** MEDIUM

**Description:** A generic error handler exists but doesn't differentiate between error types or provide structured logging.

**Code:**
```typescript
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});
```

**Recommendation:**
1. Create custom error classes (ValidationError, AuthError, etc.)
2. Log errors with context (request ID, user ID, path)
3. Return different status codes for different error types

---

#### ARCH-003: Missing Health Check Depth
**File:** `src/index.ts` (lines 31-38)
**Severity:** MEDIUM

**Description:** Health check doesn't verify database or external service connectivity.

**Code:**
```typescript
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});
```

**Recommendation:**
Add database ping and LMDB status check:
```typescript
app.get('/health', async (c) => {
  const dbOk = checkDatabaseConnection();
  const lmdbOk = checkLMDBConnection();
  return c.json({ 
    status: dbOk && lmdbOk ? 'ok' : 'degraded',
    checks: { database: dbOk, cache: lmdbOk }
  });
});
```

---

### LOW SEVERITY

#### ARCHL-001: Large Files
**Files:** `src/lib/db.ts` (600+ lines), `src/routes/waitlist.ts` (500+ lines)
**Severity:** LOW

**Recommendation:**
Split into focused modules (e.g., `db/schema.ts`, `db/migrations.ts`, `db/queries.ts`).

---

#### ARCHL-002: No Graceful Degradation for Analytics
**File:** `src/lib/analytics.ts`
**Severity:** LOW

**Description:** If PostHog is unavailable, events are silently logged to console but operations continue normally.

**Recommendation:**
Add circuit breaker pattern for external service calls.

---

#### ARCHL-003: Inconsistent Async Patterns
**File:** Multiple
**Severity:** LOW

**Description:** Mix of `async` functions with no awaits, and synchronous functions that could benefit from async.

**Example:**
```typescript
// apps.ts - async but returns synchronously
export async function deleteApp(appId: string, userId: string): Promise<boolean> {
  // ... sync code except LMDB delete
}
```

---

#### ARCHL-004: Missing TypeScript Strict Checks
**File:** `tsconfig.json` (not provided but inferred)
**Severity:** LOW

**Recommendation:**
Enable `strict: true` and `noUncheckedIndexedAccess: true` in tsconfig.json.

---

## Code Quality Observations

### Positive Patterns
1. **Excellent documentation** - Comprehensive JSDoc comments throughout
2. **Clear module organization** - Logical separation of concerns
3. **Type safety** - Good TypeScript usage with interfaces
4. **Encryption best practices** - AES-256-GCM with unique salts per secret
5. **Audit logging** - Comprehensive action tracking

### Areas for Improvement
1. **Test coverage gaps** - No integration tests for routes
2. **No API versioning** - All routes are `/api/*` without version
3. **Missing rate limiting per endpoint** - Could have different limits for expensive operations
4. **No request ID for tracing** - Difficult to trace requests across logs

---

## Recommendations Summary

### Priority: Immediate (Ship Blockers)
1. ✅ Fix XSS vulnerability in render.ts (SECH-001)
2. Add CSP headers for rendered apps

### Priority: High (Next Sprint)
1. Implement Redis-backed rate limiting (SECM-001)
2. Add CSRF protection (SECM-002)
3. Fix timing attack in admin auth (SECM-003)

### Priority: Medium (Next Quarter)
1. Add input validation library (ARCH-001)
2. Create centralized error handling (ARCH-002)
3. Add missing database indexes (PERF-001)
4. Implement background analytics queue (PERF-002)

### Priority: Low (Backlog)
1. Split large files (ARCHL-001)
2. Add health check depth (ARCH-003)
3. Implement request tracing

---

## Files Reviewed

### Core Files
- `src/index.ts` - Application entry point
- `src/config.ts` - Configuration management
- `src/lib/db.ts` - Database schema and queries
- `src/lib/lmdb.ts` - LMDB cache operations
- `src/lib/users.ts` - User authentication
- `src/lib/secrets.ts` - Secrets management
- `src/lib/encryption.ts` - Encryption utilities
- `src/lib/apps.ts` - App CRUD operations
- `src/lib/analytics.ts` - PostHog integration
- `src/lib/features.ts` - Feature flag system
- `src/lib/appAnalytics.ts` - Per-app analytics

### Routes
- `src/routes/auth.ts` - Authentication endpoints
- `src/routes/apps.ts` - App management
- `src/routes/secrets.ts` - Secrets management
- `src/routes/proxy.ts` - API proxy
- `src/routes/render.ts` - App rendering
- `src/routes/waitlist.ts` - Waitlist management
- `src/routes/settings.ts` - User settings

### Middleware
- `src/middleware/auth.ts` - Authentication middleware
- `src/middleware/rateLimit.ts` - Rate limiting

---

## Conclusion

The OnHyper codebase is well-structured and follows good practices for the most part. The test suite is solid with 163 passing tests. The main concerns are:

1. **Security**: XSS vulnerability in app rendering needs immediate attention
2. **Scalability**: In-memory rate limiting won't work with multiple instances
3. **Maintainability**: Missing validation library and centralized error handling

Addressing the critical XSS issue should be the top priority, followed by the rate limiting and CSRF improvements.

---

*Report generated: 2026-02-20*
# HYPR Full-Stack Product Capabilities Research

**Date**: 2026-02-21  
**Goal**: Enable HYPR (OnHyper) users to build full end-to-end products, not just prototypes

---

## Executive Summary

HYPR currently excels as a **secure proxy platform** for API-backed web apps, but lacks critical capabilities for full-stack product development. This research identifies the gaps and provides actionable recommendations.

### Current State
- ✅ Secure API key management with AES-256-GCM encryption
- ✅ Proxy service for 10+ AI APIs (ScoutOS, OpenAI, Anthropic, etc.)
- ✅ Static app hosting with ZIP upload and SPA routing
- ✅ User authentication (JWT + API keys)
- ✅ Basic PostHog analytics (server-side tracking)
- ✅ Email service (Resend) for transactional emails
- ✅ Usage tracking and rate limiting per plan

### Missing for Full-Stack Products
- ❌ **End-user authentication** (for HYPR users' customers)
- ❌ **Multi-tenant analytics** (per-user dashboards)
- ❌ **Payment processing** (Stripe integration)
- ❌ **User-scoped database/storage** 
- ⚠️ **Notifications** (partial - only transactional emails)

---

## Part 1: PostHog Multi-Tenant Analytics

### The Challenge

HYPR users building production apps need to show **analytics to their own users**. Today, all events go to a single OnHyper PostHog project, making it impossible for users to see just their app's data.

### Research Findings

#### PostHog Project Isolation Model

PostHog provides **project-level data isolation**:

| Feature | Details |
|---------|---------|
| **Projects per Organization** | Unlimited (free tier: 1, paid: 6+) |
| **Data Isolation** | Each project has completely separate data |
| **Write-Only Token** | Each project gets a unique API key |
| **Programmatic Creation** | Full API to create/delete projects |

**Key PostHog API Endpoints:**
```
POST /api/organizations/:organization_id/projects     # Create project
GET  /api/organizations/:organization_id/projects     # List projects
GET  /api/organizations/:organization_id/projects/:id # Get project
DELETE /api/organizations/:organization_id/projects/:id # Delete project
```

Each project returns:
- `id` - Project ID (used in API calls)
- `api_key` - Write-only token for event capture
- `name` - Project name

#### Analytics Options for Multi-Tenant SaaS

Based on research, there are **three approaches**:

---

### Option A: Per-User PostHog Project (Recommended)

**Architecture:**
```
OnHyper Account
├── User A's App
│   └── PostHog Project A (unique API key)
├── User B's App
│   └── PostHog Project B (unique API key)
└── User C's App
    └── PostHog Project C (unique API key)
```

**Implementation:**
1. When a HYPR user creates their first app, create a PostHog project via API
2. Store `posthog_project_id` and `posthog_api_key` in the `apps` table
3. Provide a PostHog proxy endpoint for user's apps to capture events
4. Use PostHog's embedded dashboards or Query API to show analytics in HYPR dashboard

**Pros:**
- ✅ Complete data isolation
- ✅ Full PostHog feature set per user
- ✅ Users can export their PostHog data
- ✅ Professional-grade analytics

**Cons:**
- ⚠️ PostHog project limits (free: 1, paid: 6, scale: need to verify)
- ⚠️ Requires PostHog Scale plan for many projects ($750+/mo)
- ⚠️ Management overhead for project lifecycle

**Cost Analysis:**
- PostHog Free: 1 project (suitable for OnHyper internal use only)
- PostHog Pay-as-you-go: 6 projects
- PostHog Scale ($2,000/mo): Unlimited projects + 7-year retention

---

### Option B: Single Project + Group Analytics

**Architecture:**
```
OnHyper PostHog Project
├── Group: app_user_a (all events for App A)
├── Group: app_user_b (all events for App B)
└── Group: app_user_c (all events for App C)
```

PostHog Group Analytics allows segmenting events by "groups" (e.g., organizations, projects).

**Implementation:**
1. Use HYPR's single PostHog project
2. Tag all events with `app_id` as a group identifier
3. Use PostHog's Query API to fetch per-app analytics
4. Build custom dashboard visualizations in HYPR UI

**Pros:**
- ✅ Single project (simpler, cheaper)
- ✅ No PostHog plan limits
- ✅ Works with PostHog free tier

**Cons:**
- ⚠️ Group Analytics is a paid add-on ($0.000071/event after 1M free)
- ⚠️ Not full isolation - users can't use PostHog directly
- ⚠️ Custom dashboard development required
- ⚠️ Query complexity increases with scale

---

### Option C: Build Custom Analytics

**Architecture:**
Store events in HYPR's SQLite database, build custom dashboards.

**Pros:**
- ✅ Full control
- ✅ No external dependencies
- ✅ Free

**Cons:**
- ❌ Significant development effort
- ❌ No session replay, feature flags, experiments
- ❌ Doesn't scale (SQLite limitations)
- ❌ Reinventing the wheel

---

### Recommended Approach: Option A (Phased)

**Phase 1: MVP - Shared Analytics with Filtering**
- Use Option B initially
- Store `app_id` with every event
- Build simple dashboard showing per-app metrics
- Lower cost, faster to market

**Phase 2: Per-User Projects (Paid Feature)**
- Offer "Analytics Dashboard" as a PRO/BUSINESS tier feature
- Create PostHog projects on demand via API
- Allow users to access their PostHog dashboard directly
- Charge premium for isolated analytics

### Implementation Details

#### Database Schema Changes

```sql
-- Add to apps table
ALTER TABLE apps ADD COLUMN posthog_project_id TEXT;
ALTER TABLE apps ADD COLUMN posthog_api_key_encrypted TEXT;
ALTER TABLE apps ADD COLUMN analytics_enabled INTEGER DEFAULT 0;

-- New table for analytics events cache (optional, for fast dashboard)
CREATE TABLE IF NOT EXISTS analytics_cache (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  metric_type TEXT NOT NULL,  -- 'pageviews', 'unique_visitors', 'events'
  metric_value INTEGER,
  period_start DATE,
  period_end DATE,
  updated_at DATETIME,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);
```

#### Event Capture Architecture

Users would send events from their HYPR apps via a proxy:

```javascript
// User's app code
fetch('https://onhyper.io/api/analytics/capture', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Slug': 'my-app'
  },
  body: JSON.stringify({
    event: 'button_clicked',
    properties: { button_id: 'signup' }
  })
});
```

Server-side:
```typescript
// HYPR proxy to PostHog
app.post('/api/analytics/capture', async (c) => {
  const app = getAppFromSlug(c.req.header('X-App-Slug'));
  const projectKey = app.posthog_api_key || process.env.POSTHOG_KEY;
  
  // Capture to appropriate project
  await posthog.capture({
    distinctId: generateOrGetUserId(c),
    event: body.event,
    properties: {
      ...body.properties,
      app_id: app.id,  // Always tag with app_id
    }
  }, projectKey);
});
```

#### Dashboard Integration

Two options for showing analytics in HYPR:

**1. Embedded Dashboard (Simple)**
- Create dashboard in PostHog
- Share publicly
- Embed via iframe in HYPR dashboard

```html
<iframe src="https://app.posthog.com/embedded/{dashboard_id}?refresh=true" 
        width="100%" height="600"></iframe>
```

**2. Custom Dashboard via Query API (Flexible)**

```typescript
// Fetch analytics data from PostHog
const response = await fetch('https://app.posthog.com/api/projects/:id/query/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: {
      kind: 'HogQLQuery',
      query: `
        SELECT 
          event,
          count() as count,
          uniq(distinct_id) as unique_users
        FROM events
        WHERE app_id = '${appId}'
          AND timestamp >= now() - INTERVAL 7 DAY
        GROUP BY event
        ORDER BY count DESC
      `
    }
  })
});
```

### Default Events to Track

For HYPR apps, automatically track:

| Event | Properties | Description |
|-------|------------|-------------|
| `$pageview` | `$current_url`, `$referrer` | Page views (PostHog auto) |
| `$click` | `$element_text`, `$element_id` | Click tracking (PostHog auto) |
| `app_load` | `app_id`, `version` | App initialization |
| `api_call` | `endpoint`, `status`, `duration_ms` | Proxy API calls |
| `error` | `error_type`, `error_message` | JavaScript errors |
| `user_identify` | `user_id`, `email` (if provided) | User identification |

---

## Part 2: Implementation Approach

### PostHog Proxy via HYPR

**Why proxy?**
- Users don't need to manage PostHog API keys
- HYPR can inject `app_id` automatically
- Centralized control over analytics

**Endpoint Design:**

```
POST /api/analytics/capture    → Capture event
GET  /api/analytics/events     → Query events (PRO+)
GET  /api/analytics/dashboard  → Get dashboard data
```

### Analytics Dashboard in HYPR

The analytics view should show:

1. **Overview Cards**
   - Total pageviews (7d, 30d)
   - Unique visitors (7d, 30d)
   - API calls made
   - Error rate

2. **Trend Charts**
   - Pageviews over time
   - Top pages
   - Traffic sources

3. **Event Table**
   - Custom events
   - User sessions
   - Error logs

4. **Export Options**
   - CSV download
   - (Future) Export to user's own PostHog

### Data Flow

```
User's App (Client)
    │
    ▼ POST /api/analytics/capture
┌─────────────────────────────────────────┐
│           OnHyper Server                │
│  ┌─────────────┐    ┌────────────────┐  │
│  │  Analytics  │───▶│   PostHog      │  │
│  │   Proxy     │    │   (or custom)  │  │
│  └─────────────┘    └────────────────┘  │
│         │                    │          │
│         ▼                    ▼          │
│  ┌─────────────┐    ┌────────────────┐  │
│  │   Cache     │    │  Query API     │  │
│  │ (optional)  │◀───│  (dashboard)   │  │
│  └─────────────┘    └────────────────┘  │
└─────────────────────────────────────────┘
    │
    ▼ Dashboard UI
OnHyper Dashboard
```

---

## Part 3: Other Full-Stack Gaps

### 3.1 End-User Authentication

**Current State:** HYPR has authentication for HYPR users (developers), but no way for those developers to authenticate their own end-users.

**The Problem:**
- User builds a SaaS app on HYPR
- Their customers need to sign up, log in, manage profiles
- Currently, developer must build this from scratch or use external service

**Options:**

#### A. Clerk (Recommended for SaaS)

| Factor | Assessment |
|--------|------------|
| **Setup Time** | 1-3 days (vs 2-5 for Supabase) |
| **Features** | Auth, user management, organizations, webhooks |
| **SSO** | Google, GitHub, Microsoft, etc. included |
| **Pricing** | Free: 10K MAU, Pro: $25/mo for 10K+ |
| **Organizations** | Built-in team/organization support |
| **Component Library** | Pre-built sign-in/sign-up components |

**Integration:**
- HYPR provides `hypr-auth.js` client library
- Users add `<script src="https://onhyper.io/auth.js">` to their app
- Auth state automatically available via `window.HYPR_AUTH`

```javascript
// User's app code
HYPR_AUTH.signIn('google');  // OAuth
HYPR_AUTH.signUp({ email, password });
HYPR_AUTH.signOut();
HYPR_AUTH.onAuthStateChange((user) => {
  console.log('Current user:', user);
});
```

#### B. Supabase Auth

| Factor | Assessment |
|--------|------------|
| **Setup Time** | 2-5 days |
| **Features** | Auth + database in one |
| **Pricing** | Free: 50K MAU, Pro: $25/mo |
| **RLS** | Row-level security with Postgres |
| **Realtime** | Built-in realtime subscriptions |

**Hybrid Approach:** HYPR could offer both, letting users choose.

#### Recommended Implementation

**Phase 1: Clerk Integration**
- Partner with Clerk or build custom integration
- HYPR provisions Clerk applications for users
- Seamless auth in user's apps

**Phase 2: Native Auth (Optional)**
- Build lightweight auth system if cost becomes issue
- JWT-based authentication stored in HYPR's SQLite
- Email verification via existing Resend integration

**Database Schema:**

```sql
-- For HYPR's native auth (if built)
CREATE TABLE end_users (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  email_verified INTEGER DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (app_id) REFERENCES apps(id),
  UNIQUE(app_id, email)
);

CREATE TABLE end_user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE,
  expires_at DATETIME,
  created_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES end_users(id)
);

CREATE TABLE end_user_oauth (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,  -- 'google', 'github', etc.
  provider_user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES end_users(id),
  UNIQUE(provider, provider_user_id)
);
```

---

### 3.2 Payment Processing

**Current State:** No payment integration. Users can't monetize their apps.

**The Problem:**
- Developer builds subscription SaaS on HYPR
- No way to accept payments
- Must integrate Stripe externally (requires separate backend)

**Recommended: Stripe Integration**

```typescript
// HYPR Stripe proxy endpoint
POST /api/payments/create-checkout-session
Body: { priceId: string, successUrl: string, cancelUrl: string }

// Returns Stripe Checkout URL
```

**Implementation:**

1. HYPR creates Stripe Connect account
2. Users connect their Stripe accounts (OAuth)
3. HYPR proxies Stripe API calls
4. Subscription webhooks update user data

**Database Schema:**

```sql
CREATE TABLE payment_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_account_id TEXT,
  stripe_access_token_encrypted TEXT,
  stripe_refresh_token_encrypted TEXT,
  created_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT,  -- 'active', 'canceled', 'past_due'
  plan_id TEXT,
  current_period_end DATETIME,
  created_at DATETIME,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);
```

**User Experience:**
1. Developer goes to Settings → Payments
2. Connects Stripe account
3. Creates products/pricing in HYPR dashboard
4. Adds payment buttons to their app
5. HYPR handles checkout + webhooks

---

### 3.3 Database/Storage for User Apps

**Current State:** User apps are static frontends. No backend data storage.

**The Problem:**
- Modern apps need databases
- Users must use external services (Supabase, Firebase, etc.)
- Disconnects from HYPR's "all-in-one" value prop

**Options:**

#### A. Hyper-Nano Integration (Recommended)

Based on existing research (`RESEARCH-hyper-multitenant.md`):

- Run one hyper-nano instance per app
- Each app gets isolated `data`, `cache`, `storage`, `search` services
- Access via proxy endpoint: `POST /api/data/:appId/...`

**Pros:**
- Complete isolation
- Horizontal scaling
- Multiple services (DB, cache, files, search)

**Cons:**
- Operational complexity
- Resource overhead per instance

#### B. SQLite Per App

- Each app gets its own SQLite database file
- Access via REST API through HYPR proxy

**Pros:**
- Simpler operation
- Low overhead
- Uses existing SQLite infrastructure

**Cons:**
- No realtime
- Limited to single server

#### C. Turso/LibSQL

- Distributed SQLite
- Better scaling
- Still SQLite-compatible

---

### 3.4 Notification System

**Current State:** Transactional emails only (Resend).

**Missing:**
- Push notifications
- In-app notifications
- SMS notifications
- Notification preferences

**Recommended: Build on Resend**

```typescript
// Notification abstraction layer
interface NotificationService {
  sendEmail(userId: string, template: string, data: object): Promise<void>;
  sendPush(userId: string, title: string, body: string): Promise<void>;
  sendSMS(userId: string, message: string): Promise<void>;
}

// Database schema
CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY,
  email_enabled INTEGER DEFAULT 1,
  push_enabled INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 0,
  push_token TEXT,
  phone_number_encrypted TEXT
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  read INTEGER DEFAULT 0,
  created_at DATETIME
);
```

---

## Part 4: Priority Ranking

Based on impact and effort, here's the recommended priority:

| Priority | Feature | Impact | Effort | Dependencies |
|----------|---------|--------|--------|--------------|
| **P0** | Multi-tenant Analytics (Phase 1) | ⭐⭐⭐⭐⭐ | 🔨🔨 | None |
| **P1** | End-User Auth (Clerk Integration) | ⭐⭐⭐⭐⭐ | 🔨🔨🔨 | Clerk partnership/account |
| **P1** | Database for User Apps | ⭐⭐⭐⭐ | 🔨🔨🔨🔨 | Infrastructure decision |
| **P2** | Payment Processing (Stripe) | ⭐⭐⭐⭐ | 🔨🔨🔨 | Stripe Connect |
| **P2** | Multi-tenant Analytics (Phase 2) | ⭐⭐⭐ | 🔨🔨 | PostHog Scale plan |
| **P3** | Notification System | ⭐⭐⭐ | 🔨🔨 | None |
| **P3** | File Upload/Storage | ⭐⭐⭐ | 🔨🔨🔨 | Depends on DB choice |

### MVP Feature Set (Ship First)

1. **Multi-tenant Analytics (Phase 1)**
   - Single PostHog project with app_id filtering
   - Basic dashboard: pageviews, unique visitors, top pages
   - Event capture proxy endpoint

2. **End-User Auth (Phase 1)**
   - Clerk integration for PRO+ users
   - Email/password signup
   - OAuth (Google, GitHub)
   - Session management

---

## Part 5: Next Steps

### Immediate (Week 1-2)

1. **Set up PostHog project structure**
   - Add `posthog_project_id` to apps table
   - Test PostHog API for project creation
   - Build `/api/analytics/capture` endpoint

2. **Implement basic analytics dashboard**
   - Fetch data via PostHog Query API
   - Show pageviews, visitors, events
   - Add to existing dashboard UI

### Short-term (Week 3-4)

3. **Research Clerk integration**
   - Sign up for Clerk account
   - Test embedded auth components
   - Document integration steps

4. **Design database solution**
   - Evaluate hyper-nano vs SQLite per-app
   - Create proof of concept
   - Plan data isolation strategy

### Medium-term (Month 2-3)

5. **Build end-user auth**
   - Integrate Clerk or build native
   - User management UI for developers
   - Auth state in user apps

6. **Implement Stripe integration**
   - Stripe Connect OAuth flow
   - Payment proxy endpoints
   - Webhook handling

### Long-term (Month 3+)

7. **Launch full-stack platform**
   - Combine all pieces
   - Update pricing
   - Marketing push

---

## Appendix: Quick Reference

### PostHog API Endpoints

```bash
# Create project
curl -X POST https://app.posthog.com/api/organizations/:org_id/projects \
  -H "Authorization: Bearer $PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "User App Analytics"}'

# Query events
curl -X POST https://app.posthog.com/api/projects/:project_id/query/ \
  -H "Authorization: Bearer $PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": {"kind": "HogQLQuery", "query": "SELECT * FROM events LIMIT 10"}}'

# Capture event
curl -X POST https://app.posthog.com/capture/ \
  -H "Content-Type: application/json" \
  -d '{"api_key": "$PROJECT_API_KEY", "event": "my_event", "distinct_id": "user123"}'
```

### Clerk Integration Snippet

```html
<!-- In user's app -->
<script src="https://onhyper.io/auth.js"></script>
<script>
  HYPR_AUTH.init({
    appId: 'your-app-id',
    onAuthStateChange: (user) => {
      if (user) {
        console.log('Signed in:', user.email);
      } else {
        console.log('Signed out');
      }
    }
  });
</script>

<button onclick="HYPR_AUTH.signIn('google')">Sign in with Google</button>
<button onclick="HYPR_AUTH.signOut()">Sign out</button>
```

### Stripe Checkout Integration

```javascript
// In user's app
const response = await fetch('https://onhyper.io/api/payments/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Slug': window.HYPR.appSlug,
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    priceId: 'price_pro_monthly',
    successUrl: window.location.origin + '/success',
    cancelUrl: window.location.origin + '/pricing'
  })
});

const { checkoutUrl } = await response.json();
window.location.href = checkoutUrl;
```

---

## Conclusion

HYPR is well-positioned to become a full-stack development platform. The primary missing pieces are:

1. **Multi-tenant analytics** - Can be implemented in phases, starting with shared PostHog project + app_id filtering
2. **End-user authentication** - Clerk integration is fastest path; native auth possible later
3. **Database/storage** - Hyper-nano or per-app SQLite could provide this
4. **Payments** - Stripe Connect for marketplace-style integration

The most impactful immediate work is **analytics**, as it requires no external partnerships or major infrastructure decisions. A Phase 1 implementation using the existing PostHog account with proper filtering can ship in 1-2 weeks and provide immediate value to users.
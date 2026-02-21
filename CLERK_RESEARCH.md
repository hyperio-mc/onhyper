# Clerk Research for HYPR End-User Authentication

**Research Date:** 2026-02-21  
**Purpose:** Evaluate Clerk.com as an identity provider for end-user authentication in HYPR

---

## Executive Summary

**Recommendation: Clerk is a strong fit for HYPR's end-user authentication needs**, with some important architectural considerations.

Clerk provides excellent developer experience, pre-built UI components, and robust B2B/multi-tenant features through Organizations. However, HYPR's "platform" use case (where each published app has its own isolated auth) is not yet fully supported by Clerk's current offering. A shared-user-pool model with Organizations is the recommended approach for initial implementation.

---

## 1. How Clerk Works

### Architecture Overview

Clerk operates as a **hosted authentication service** with three key components:

1. **Frontend API (FAPI)** - Hosted at `<slug>.clerk.accounts.dev` (dev) or your custom domain (prod)
   - Handles authentication flows (sign-up, sign-in, session management)
   - Returns short-lived session tokens (60-second expiry)
   - Managed via "Publishable Key" (base64-encoded FAPI URL)

2. **Backend API (BAPI)** - Administrative operations
   - User management, organization management, etc.
   - Requires Secret Key (server-side only)

3. **Frontend SDKs** - React, Next.js, Hono, and more
   - Pre-built UI components (`<SignIn />`, `<SignUp />`, `<UserButton />`)
   - Headless components (Clerk Elements) for custom UI
   - Automatic token refresh mechanism

### Authentication Model

Clerk uses a **hybrid authentication model** combining stateful and stateless approaches:

| Token Type | Cookie | Expiry | Purpose |
|------------|--------|--------|---------|
| **Client Token** | `__client` (HttpOnly) | Browser-dependent | Long-lived session truth |
| **Session Token** | `__session` | 60 seconds | Short-lived JWT for API calls |

**Key innovation:** The 60-second session token is automatically refreshed by Clerk's SDK, providing:
- Near-instant session revocation capability
- Performance benefits of stateless JWTs
- Security of stateful sessions

### Integration Levels

Clerk offers three abstraction levels for UI:

1. **Prebuilt Components** (`<SignIn />`, `<UserButton />`)
   - Drop-in, fully styled auth flows
   - Customizable CSS only
   - Fastest to implement

2. **Clerk Elements** (Beta)
   - Headless, unstyled components
   - Full HTML/CSS control
   - Auth logic still handled by Clerk

3. **Custom Flows**
   - Direct API usage
   - Complete control
   - Most development effort

---

## 2. Integration with HYPR Architecture

### Current HYPR Auth Model

HYPR currently has **owner authentication**:
- JWT-based auth with email/password
- Users own apps, secrets, and API keys
- Self-hosted in the Hono backend (`/api/auth/*` endpoints)

### Proposed End-User Auth Model

For apps published on HYPR that need their own user authentication:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HYPR Platform Architecture                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐     ┌──────────────────┐     ┌────────────────┐  │
│   │   HYPR Owner     │     │   Published App  │     │   Clerk Auth   │  │
│   │   Dashboard      │     │   (subdomain)    │     │   Service      │  │
│   └────────┬─────────┘     └────────┬─────────┘     └───────┬────────┘  │
│            │                        │                       │           │
│            │ JWT/API Key            │ Clerk Session         │           │
│            │                        │ Token                 │           │
│            ▼                        ▼                       ▼           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      HYPR Backend (Hono)                        │   │
│   │                                                                 │   │
│   │   Owner Auth:     JWT verification (current system)             │   │
│   │   End-User Auth:  Clerk token verification (@hono/clerk-auth)   │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Clerk Hono Integration

HYPR uses Hono, and Clerk has official Hono support:

```typescript
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { Hono } from 'hono'

const app = new Hono()

// Clerk middleware for end-user routes
app.use('/app/:slug/*', clerkMiddleware())

// Protected app route
app.get('/app/:slug/api/data', async (c) => {
  const auth = getAuth(c)
  
  if (!auth?.userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  // User is authenticated with Clerk
  // auth.userId contains the Clerk user ID
  // auth.orgId contains the active organization (if using Organizations)
  
  return c.json({ userId: auth.userId, data: '...' })
})
```

### Architecture Approaches

#### Option A: Single Clerk Application + Organizations (Recommended for Initial Implementation)

Each HYPR app gets its own **Organization** within a single Clerk application:

```
Clerk Application: HYPR Platform
├── Organization: "my-awesome-app" (owned by HYPR user A)
│   ├── Members: end-users of my-awesome-app
│   └── Roles: admin, member, viewer
├── Organization: "another-app" (owned by HYPR user B)
│   ├── Members: end-users of another-app
│   └── Roles: admin, member
└── ...
```

**Pros:**
- Supported by Clerk today
- Shared user pool (users can join multiple apps with one account)
- Simple implementation
- Centralized user management

**Cons:**
- Users see all apps they're part of in organization switcher
- Apps share the same "brand" (Clerk instance branding)
- Less isolation between apps

#### Option B: Clerk for Platforms (Future - Not Yet Available)

> ⚠️ **Clerk for Platforms is currently in development** and not yet available.

This would allow each HYPR app to have:
- Isolated user pools
- Custom branding
- Separate authentication policies
- Vanity domains

**When launched, this would be ideal for HYPR's use case.**

#### Option C: One Clerk Application Per HYPR App

Create a separate Clerk application for each HYPR user:

```
Clerk Application: "my-awesome-app-auth" (HYPR user A's app)
Clerk Application: "another-app-auth" (HYPR user B's app)
```

**Pros:**
- Complete isolation
- Custom branding per app

**Cons:**
- Complex management (programmatic Clerk app creation)
- Users need separate accounts for each app
- Free tier limits apply per application
- Higher operational overhead

### Recommended Approach: Hybrid

For initial MVP:

1. **Use Option A (Organizations)** for most HYPR apps
2. **Allow "enterprise" apps** to configure their own Clerk application (bring-your-own-auth)
3. **Plan migration path** to Clerk for Platforms when available

---

## 3. Pricing and Limits

### Free Tier

| Metric | Limit |
|--------|-------|
| **Monthly Retained Users (MRUs)** | 50,000 per application |
| **Monthly Retained Organizations (MROs)** | 100 per application |
| **MAUs (Monthly Active Users)** | Unlimited (only MRUs billed) |

**MRU Definition:** A user is counted as retained when they return 24+ hours after signing up.

### Paid Tier (Pro)

| MRU Range | Price per MRU/month |
|-----------|---------------------|
| 1 - 50,000 | Included in free |
| 50,001 - 100,000 | $0.02 |
| 100,001 - 1,000,000 | $0.018 |
| 1,000,001 - 10,000,000 | $0.015 |
| 10,000,001+ | $0.012 |

**Example costs:**
- 75,000 MRUs = $500/month (25,000 × $0.02)
- 200,000 MRUs = $1,900/month (50k free + 50k × $0.02 + 100k × $0.018)

### Pricing Comparison

| Feature | Clerk | Supabase Auth | Auth.js |
|---------|-------|---------------|---------|
| **Free Tier** | 50K MRUs | 50K MAUs | Self-hosted (your infra costs) |
| **Pricing Model** | Per retained user | Part of Supabase plan | Your hosting costs |
| **Database** | Hosted by Clerk | Requires Supabase DB | Your database |
| **Dev Experience** | Excellent | Good | Self-managed |

---

## 4. End-User Auth vs Current Owner Auth

### Current Owner Auth (Keep As-Is)

HYPR's current JWT-based auth serves **platform owners**:
- Users who create HYPR accounts
- Manage their apps, secrets, API keys
- Access the dashboard at `onhyper.io`

**This should remain unchanged.**

### New End-User Auth (Add Clerk)

For **users of published apps**:
- Users who sign up for "my-app.onhyper.io"
- Access app-specific features
- Managed by app owners (HYPR users)

### Auth Flow Comparison

| Aspect | Owner Auth (HYPR) | End-User Auth (Clerk) |
|--------|-------------------|----------------------|
| **Who** | HYPR platform users | Users of published apps |
| **Auth Provider** | HYPR backend (JWT) | Clerk |
| **User Pool** | Single HYPR user pool | Per-app or shared pool |
| **Session Management** | HYPR backend | Clerk FAPI |
| **UI** | Custom HYPR dashboard | Clerk components (customizable) |
| **Token Storage** | JWT in localStorage/cookie | Clerk SDK handles |

### Implementation Pattern

```typescript
// HYPR middleware for dual auth support
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { requireAuth as requireOwnerAuth } from './middleware/auth.js'

const app = new Hono()

// Owner routes use HYPR's existing JWT auth
app.use('/api/*', requireOwnerAuth)
app.use('/dashboard/*', requireOwnerAuth)

// Published app routes use Clerk auth
app.use('/a/:slug/*', clerkMiddleware())

// App-specific API routes
app.get('/a/:slug/api/user', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  // Get Clerk user info
  const clerkClient = c.get('clerk')
  const user = await clerkClient.users.getUser(auth.userId)
  
  return c.json({ user })
})

// App owner can manage users via Clerk Backend API
app.post('/api/apps/:id/invite-user', requireOwnerAuth, async (c) => {
  const { email, role } = await c.req.json()
  const appId = c.req.param('id')
  
  // Get the Clerk org for this app
  const orgId = await getAppOrganization(appId)
  
  // Invite user to organization
  const clerkClient = c.get('clerk')
  await clerkClient.organizations.createOrganizationInvitation({
    organizationId: orgId,
    emailAddress: email,
    role: role,
  })
  
  return c.json({ success: true })
})
```

---

## 5. Technical Implementation Steps

### Phase 1: Setup & Core Integration

1. **Create Clerk Application**
   - Sign up at clerk.com
   - Create new application
   - Configure allowed sign-in methods (email, OAuth providers)
   - Get Publishable Key and Secret Key

2. **Install Dependencies**
   ```bash
   npm install @hono/clerk-auth @clerk/backend
   ```

3. **Add Environment Variables**
   ```env
   CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   CLERK_JWT_KEY=xxx  # For manual JWT verification
   ```

4. **Add Clerk Middleware**
   ```typescript
   // src/middleware/clerk.ts
   import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
   
   export { clerkMiddleware, getAuth }
   ```

5. **Create Organization on App Creation**
   ```typescript
   // When a HYPR user creates a new app
   import { createClerkClient } from '@clerk/backend'
   
   const clerkClient = createClerkClient({
     secretKey: process.env.CLERK_SECRET_KEY,
   })
   
   async function createAppOrganization(appName: string, ownerId: string) {
     const org = await clerkClient.organizations.createOrganization({
       name: appName,
       createdBy: ownerId, // Clerk user ID of app owner
     })
     
     // Store org.id in your database linked to the app
     return org.id
   }
   ```

### Phase 2: Frontend Integration

1. **Add Clerk to the published app's HTML**
   ```html
   <script async crossorigin src="https://js.clerk.com/embed.js"></script>
   ```

2. **Render auth components**
   ```javascript
   // In the published app's JavaScript
   window.Clerk.load({
     publishableKey: 'pk_test_xxx',
   })
   
   // Show sign-in if not authenticated
   if (!window.Clerk.user) {
     window.Clerk.openSignIn()
   }
   ```

3. **Protect app routes**
   ```javascript
   // Require authentication for app features
   async function fetchAppData() {
     const token = await window.Clerk.session.getToken()
     
     const response = await fetch('/a/my-app/api/data', {
       headers: {
         'Authorization': `Bearer ${token}`,
       },
     })
     
     return response.json()
   }
   ```

### Phase 3: User Management

1. **Add org membership UI to HYPR dashboard**
   - Let app owners invite users to their organization
   - Manage roles and permissions

2. **Implement role-based access**
   ```typescript
   // In HYPR backend
   app.get('/a/:slug/api/admin', clerkMiddleware, async (c) => {
     const auth = getAuth(c)
     
     // Check if user has admin role in this org
     const clerkClient = c.get('clerk')
     const membership = await clerkClient.organizations.getOrganizationMembership({
       organizationId: auth.orgId,
       userId: auth.userId,
     })
     
     if (membership.role !== 'org:admin') {
       return c.json({ error: 'Forbidden' }, 403)
     }
     
     // Admin-only logic
     return c.json({ message: 'Admin access granted' })
   })
   ```

### Phase 4: Advanced Features

1. **Webhook Integration**
   - Sync Clerk user data to HYPR database
   - Track user signups, deletions

2. **SSO for Enterprise Apps**
   - Enable SAML/OIDC for specific organizations
   - Allow enterprise customers to bring their IdP

3. **Custom Claims**
   - Add app-specific data to JWT tokens
   - Implement fine-grained permissions

---

## 6. Comparison: Clerk vs Alternatives

### Clerk vs Supabase Auth

| Aspect | Clerk | Supabase Auth |
|--------|-------|---------------|
| **Setup Complexity** | Low - hosted, drop-in components | Medium - requires Supabase project |
| **UI Components** | Excellent pre-built components | Basic, requires more custom work |
| **Multi-tenant (B2B)** | Native Organizations feature | Row Level Security (manual setup) |
| **Customization** | Limited styling, full headless option | Full control (self-managed) |
| **Database** | Managed by Clerk | Requires Supabase (PostgreSQL) |
| **Pricing** | 50K MRUs free | 50K MAUs free (part of Supabase) |
| **Token Model** | 60-sec session tokens, auto-refresh | JWTs with configurable expiry |
| **SSO/SAML** | Native support | Available but complex |
| **MFA** | Built-in | Available |

**Winner for HYPR: Clerk** - Better B2B/multi-tenant support, easier integration, superior UI components.

### Clerk vs Auth.js (NextAuth)

| Aspect | Clerk | Auth.js |
|--------|-------|---------|
| **Hosting** | Managed service | Self-hosted |
| **User Management** | Full dashboard included | Build your own |
| **Database** | Managed by Clerk | Your database |
| **Cost** | Per-user pricing | Your infrastructure costs |
| **Maintenance** | None | Ongoing security updates |
| **Customization** | Limited by service design | Unlimited |
| **Session Management** | Feature-rich | Basic |
| **Organizations** | Native | Build-your-own |

**Winner for HYPR: Clerk** - Less maintenance, better UX, organizations out of the box. Auth.js would require significant custom development for multi-tenant features.

### Clerk vs Custom Auth (Current HYPR approach)

| Aspect | Clerk | Custom (Current) |
|--------|-------|------------------|
| **Development Time** | Hours | Weeks |
| **Security Expertise Needed** | Low | High |
| **Feature Velocity** | Fast (managed updates) | Slow (build everything) |
| **Control** | Moderate | Full |
| **Cost** | Per-user | Developer time |
| **Session Features** | Advanced (short-lived tokens, refresh) | Basic (long-lived JWTs) |
| **SSO/OAuth** | Pre-configured | Build-it-yourself |
| **MFA** | Built-in | Build-it-yourself |

**Winner for HYPR end-users: Clerk** - For end-user authentication, the managed benefits outweigh the control tradeoffs. Keep custom auth for platform owners.

---

## 7. Pros and Cons Summary

### Pros of Clerk for HYPR

✅ **Excellent Developer Experience**
- Hono SDK available (`@hono/clerk-auth`)
- Pre-built components reduce development time
- Clear documentation

✅ **B2B Features Out of the Box**
- Organizations for multi-tenant support
- Role-based access control (RBAC)
- SSO/SAML for enterprise customers

✅ **Security Best Practices**
- Short-lived tokens (60 seconds) with auto-refresh
- HttpOnly cookies for client tokens
- Breach detection and bot protection
- MFA built-in

✅ **Scalable Architecture**
- Handles up to millions of users
- No database management required
- Automatic session cleanup

✅ **Good Free Tier**
- 50K monthly retained users
- 100 organizations
- Sufficient for MVP and early growth

### Cons of Clerk for HYPR

⚠️ **Platform Scenario Not Yet Supported**
- Clerk for Platforms (isolated user pools per app) is in development
- Current Organizations model requires shared user pool

⚠️ **Vendor Lock-in Risk**
- Migration would require significant effort
- User data stored in Clerk's systems

⚠️ **Cost at Scale**
- Per-user pricing can become expensive at high volumes
- $0.02-0.012 per MRU after free tier

⚠️ **Limited Customization**
- Pre-built components have fixed flows
- Custom flows require more development
- White-labeling limited without custom implementation

⚠️ **External Dependency**
- Service availability depends on Clerk
- Latency added for auth operations

---

## 8. Recommendations

### Immediate Actions

1. **Implement Option A (Organizations)** for end-user authentication
   - Use Clerk's Organizations feature for per-app user isolation
   - Each HYPR app = one Clerk Organization
   - App owners invite users to their org

2. **Keep Current Owner Auth**
   - HYPR platform owners continue using existing JWT auth
   - No migration needed
   - Dual auth system (owner + end-user)

3. **Start with Free Tier**
   - 50K MRUs sufficient for MVP
   - No upfront cost
   - Upgrade only when scaling

### Future Considerations

1. **Monitor Clerk for Platforms Launch**
   - Will enable isolated user pools per app
   - Custom branding per app
   - Plan migration path when available

2. **Consider BYO-Auth for Enterprise**
   - Allow enterprise HYPR users to configure their own auth
   - Support custom Clerk instances or other providers
   - Premium feature for high-value customers

3. **Implement Webhook Sync**
   - Mirror essential user data to HYPR database
   - Reduce Clerk API calls
   - Enable custom queries/analytics

### Implementation Priority

| Phase | Work | Effort | Impact |
|-------|------|--------|--------|
| **Phase 1** | Core Clerk integration, middleware setup | 1-2 days | High |
| **Phase 2** | Organization creation on app publish | 1 day | High |
| **Phase 3** | User invitation flow in dashboard | 2-3 days | Medium |
| **Phase 4** | SSO for enterprise, webhooks | 1 week | Medium |
| **Phase 5** | Migration to Clerk for Platforms | TBD | Low (wait for launch) |

---

## 9. Key Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Hono Integration](https://clerk.com/changelog/2023-11-08)
- [Clerk Organizations Guide](https://clerk.com/docs/guides/organizations/overview)
- [Clerk Multi-Tenant Architecture](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture)
- [Manual JWT Verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification)
- [Clerk Pricing](https://clerk.com/pricing)
- [@hono/clerk-auth on npm](https://www.npmjs.com/package/@hono/clerk-auth)

---

**Document prepared by:** OpenClaw Research Agent  
**Last updated:** 2026-02-21
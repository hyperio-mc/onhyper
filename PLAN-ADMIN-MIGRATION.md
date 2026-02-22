# OnHyper Migration Scripts and Admin Panel Plan

**Created:** 2026-02-22
**Status:** Draft

## Executive Summary

OnHyper has a robust feature flag system stored in SQLite (not LMDB as initially assumed). The current issue is that the `seedDefaultFeatureFlags()` function only inserts new flags if none exist - it does NOT update existing flags when code defaults change. 

This document outlines the gaps, recommended solutions, and a migration strategy.

---

## Current State Analysis

### ✅ What Exists

#### Feature Flag System (`src/lib/features.ts`)
- Full CRUD operations for feature flags
- Plan tier restrictions (`min_plan_tier`)
- Rollout percentages (0-100%)
- Custom rules engine (JSON-based conditions)
- Per-user overrides for beta testing/admin control
- Stored in SQLite `feature_flags` and `user_feature_overrides` tables

#### Admin API Endpoints (`src/routes/features.ts`)
All under `/api/admin/features/*`, protected by `X-Admin-Key` header:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | List all flags |
| `/` | POST | Create new flag |
| `/:name` | GET | Get flag details with overrides |
| `/:name` | PUT | Update flag |
| `/:name` | DELETE | Delete flag (protected core flags) |
| `/:name/override` | POST | Set user override |
| `/:name/override/:userId` | DELETE | Remove override |
| `/:name/overrides` | GET | List all overrides for flag |

#### User Plan Management (`src/index.ts`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/users/:userId/plan` | PATCH | Upgrade/downgrade user plan |

#### Admin Authentication (`src/middleware/auth.ts`)
- `requireAdminAuth` middleware
- Uses `X-Admin-Key` header matching `ONHYPER_MASTER_KEY` env var
- Timing-safe comparison for security

### ❌ What's Missing

1. **List All Users Admin Endpoint**
   - No way to view users with their current plans
   - No search/filter capability
   - Required for user management UI

2. **Database Migration Script**
   - `seedDefaultFeatureFlags()` only runs if DB is empty
   - No way to sync code defaults to existing DB
   - No version-controlled migrations

3. **Admin Panel UI**
   - All management is curl/Postman-based
   - No visual dashboard for feature flags
   - No user management interface

4. **Feature Flag Migration Utility**
   - If code changes `min_plan_tier`, DB has old value
   - No automatic sync mechanism

---

## Option A: Admin API Endpoints ✅ RECOMMENDED

### Overview
Add missing admin endpoints for complete user and feature management via API.

### Implementation

#### New Endpoints to Add

```typescript
// src/routes/admin.ts (new file)

// User Management
GET    /api/admin/users              // List users with pagination
GET    /api/admin/users/:userId       // Get user details
PATCH  /api/admin/users/:userId/plan  // Update plan (exists)
PATCH  /api/admin/users/:userId       // Update user fields

// Feature Flag Migration
POST   /api/admin/features/migrate    // Sync code defaults to DB
GET    /api/admin/features/diff       // Show code vs DB differences

// System Status
GET    /api/admin/status              // System health, stats
```

#### User List Endpoint Details

```typescript
// GET /api/admin/users
{
  users: [
    {
      id: string,
      email: string,
      plan: 'FREE' | 'HOBBY' | 'PRO' | 'BUSINESS',
      created_at: string,
      app_count: number,
      secret_count: number,
      subdomain_count: number
    }
  ],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ONHYPER_MASTER_KEY` | **Yes** | Admin API key (32+ chars) |
| `ONHYPER_JWT_SECRET` | **Yes** | JWT signing secret (32+ chars) |

### Railway Setup

```bash
# Set in Railway dashboard or CLI
railway variables set ONHYPER_MASTER_KEY="$(openssl rand -hex 32)"
railway variables set ONHYPER_JWT_SECRET="$(openssl rand -hex 32)"
```

### Pros
- ✅ Fast to implement (1-2 hours)
- ✅ Works with existing auth system
- ✅ Can be used immediately via curl
- ✅ Foundation for future admin UI
- ✅ Maintains security via X-Admin-Key

### Cons
- ❌ No visual interface
- ❌ Requires API knowledge to use

---

## Option B: Database Migration Script

### Overview
Create a standalone script to run migrations and sync feature flags.

### Implementation

```bash
# New files
src/scripts/migrate.ts        # Migration runner
src/migrations/001_sync_feature_flags.ts  # Specific migration
```

### Migration Script Example

```typescript
// src/migrations/001_sync_feature_flags.ts
import { getDatabase } from '../lib/db.js';

export function up() {
  const db = getDatabase();
  
  // Update short_subdomains min_plan_tier
  db.prepare(`
    UPDATE feature_flags 
    SET min_plan_tier = ?, updated_at = CURRENT_TIMESTAMP
    WHERE name = ?
  `).run('PRO', 'short_subdomains');
  
  console.log('Migration 001: Synced feature flags');
}

export function down() {
  // Rollback logic
}
```

### Running Migrations

```bash
# Via Railway CLI
railway run npm run migrate

# Or one-off deployment
railway run -- npx tsx src/scripts/migrate.ts
```

### Pros
- ✅ Version-controlled schema changes
- ✅ Rollback capability
- ✅ Good for production deployments

### Cons
- ❌ Requires Railway CLI or redeploy
- ❌ Not interactive
- ❌ No visibility for non-technical users

---

## Option C: Admin Panel UI

### Overview
Add admin section to OnHyper dashboard.

### Implementation

```
public/
├── pages/
│   └── admin/
│       ├── index.html       # Admin dashboard
│       ├── features.html    # Feature flag management
│       └── users.html       # User management
public/
├── app.js                   # Add admin routes
```

### Features

1. **Feature Flags Dashboard**
   - Table of all flags with current values
   - Toggle enabled/disabled
   - Edit min_plan_tier
   - View/edit custom rules
   - User overrides management

2. **User Management**
   - Search users by email
   - View user details
   - Change plan tier
   - View apps/secrets/subdomains

3. **System Status**
   - Database stats
   - Active users
   - API usage

### Pros
- ✅ Visual interface
- ✅ Easy for non-technical users
- ✅ Full control over system

### Cons
- ❌ Longer implementation (4-8 hours)
- ❌ Requires frontend development
- ❌ More surface area for bugs
- ❌ Needs styling/UX work

---

## Recommendation

### Immediate: Hybrid Approach (Option A + B)

1. **Phase 1: Add Missing Admin Endpoints** (1-2 hours)
   - `GET /api/admin/users` - List users
   - `POST /api/admin/features/migrate` - Sync feature flags
   - `GET /api/admin/features/diff` - Show drift

2. **Phase 2: Create Migration Script** (30 min)
   - Single file to sync feature flag defaults
   - Can run via Railway CLI or one-off deployment

3. **Phase 3: Admin UI** (Future)
   - Build visual admin panel when needed
   - Use existing API endpoints

### Why This Approach

| Factor | API Only | Migration Script | Admin UI |
|--------|----------|------------------|----------|
| Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Maintainability | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Security | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Usability | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Implementation Details

### Fix Current Subdomain Issue

**Problem:** Code has `min_plan_tier: 'PRO'` for `short_subdomains` but DB may have old value.

**Immediate Fix via API:**

```bash
# Update via admin API
curl -X PUT https://onhyper.io/api/admin/features/short_subdomains \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ONHYPER_MASTER_KEY" \
  -d '{
    "min_plan_tier": "PRO"
  }'
```

**Or Fix via SQLite directly:**

```bash
# Connect to SQLite on Railway
railway run sqlite3 /app/data/onhyper.db

# Update the flag
UPDATE feature_flags SET min_plan_tier = 'PRO' WHERE name = 'short_subdomains';
```

### New Admin Endpoints Code

```typescript
// Add to src/index.ts or create src/routes/admin.ts

// GET /api/admin/users - List all users with stats
app.get('/api/admin/users', requireAdminAuth, async (c) => {
  const db = getDatabase();
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const search = c.req.query('search');
  const plan = c.req.query('plan');
  
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      u.id, u.email, u.plan, u.created_at, u.updated_at,
      COUNT(DISTINCT a.id) as app_count,
      COUNT(DISTINCT s.id) as secret_count,
      COUNT(DISTINCT sr.subdomain) as subdomain_count
    FROM users u
    LEFT JOIN apps a ON u.id = a.user_id
    LEFT JOIN secrets s ON u.id = s.user_id
    LEFT JOIN subdomain_reservations sr ON u.id = sr.owner_id
  `;
  
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (search) {
    conditions.push('u.email LIKE ?');
    params.push(`%${search}%`);
  }
  
  if (plan) {
    conditions.push('u.plan = ?');
    params.push(plan.toUpperCase());
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const users = db.prepare(query).all(...params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM users';
  const countParams: any[] = [];
  if (search) {
    countQuery += ' WHERE email LIKE ?';
    countParams.push(`%${search}%`);
  }
  const { count } = db.prepare(countQuery).get(...countParams) as { count: number };
  
  return c.json({
    users,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
});

// POST /api/admin/features/migrate - Sync defaults
app.post('/api/admin/features/migrate', requireAdminAuth, async (c) => {
  const db = getDatabase();
  
  // Code defaults
  const codeDefaults = {
    subdomains: {
      display_name: 'Custom Subdomains',
      description: 'Allow users to claim custom subdomains for their apps',
      enabled: true,
      rollout_percentage: 100,
      min_plan_tier: 'FREE',
    },
    short_subdomains: {
      display_name: 'Short Subdomains',
      description: 'Allow subdomains with fewer than 6 characters (premium feature)',
      enabled: true,
      rollout_percentage: 100,
      min_plan_tier: 'PRO',
    }
  };
  
  const updates: { name: string; changes: string[] }[] = [];
  
  for (const [name, defaults] of Object.entries(codeDefaults)) {
    const existing = db.prepare('SELECT * FROM feature_flags WHERE name = ?').get(name);
    
    if (existing) {
      const changes: string[] = [];
      
      if ((existing as any).min_plan_tier !== defaults.min_plan_tier) {
        db.prepare('UPDATE feature_flags SET min_plan_tier = ? WHERE name = ?')
          .run(defaults.min_plan_tier, name);
        changes.push(`min_plan_tier: ${(existing as any).min_plan_tier} → ${defaults.min_plan_tier}`);
      }
      
      if ((existing as any).display_name !== defaults.display_name) {
        db.prepare('UPDATE feature_flags SET display_name = ? WHERE name = ?')
          .run(defaults.display_name, name);
        changes.push(`display_name updated`);
      }
      
      if ((existing as any).description !== defaults.description) {
        db.prepare('UPDATE feature_flags SET description = ? WHERE name = ?')
          .run(defaults.description, name);
        changes.push(`description updated`);
      }
      
      if (changes.length > 0) {
        updates.push({ name, changes });
      }
    }
  }
  
  return c.json({
    success: true,
    migrated: updates,
    message: updates.length > 0 
      ? `Updated ${updates.length} feature flag(s)` 
      : 'All feature flags already in sync'
  });
});
```

---

## Current Gaps Summary

| Gap | Impact | Priority |
|-----|--------|----------|
| No user list endpoint | Can't view/manage users | High |
| No migration sync | Flag drift between code & DB | High |
| `seedDefaultFeatureFlags` doesn't update | Manual DB changes needed | High |
| No admin UI | Requires API knowledge | Medium |
| No migration versioning | No audit trail | Low |

---

## Next Steps

1. **Set ONHYPER_MASTER_KEY in Railway** (if not set)
   ```bash
   railway variables set ONHYPER_MASTER_KEY="$(openssl rand -hex 32)"
   ```

2. **Fix current issue immediately via API**
   ```bash
   curl -X PUT https://onhyper.io/api/admin/features/short_subdomains \
     -H "Content-Type: application/json" \
     -H "X-Admin-Key: $ONHYPER_MASTER_KEY" \
     -d '{"min_plan_tier": "PRO"}'
   ```

3. **Add user list endpoint** (`GET /api/admin/users`)

4. **Add migration endpoint** (`POST /api/admin/features/migrate`)

5. **Create migration script** for version-controlled changes

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/routes/admin.ts` | **Create** | Consolidate admin endpoints |
| `src/index.ts` | Modify | Import and mount admin routes |
| `src/scripts/migrate.ts` | **Create** | CLI migration runner |
| `src/migrations/` | **Create** | Migration files directory |

---

## Testing

```bash
# Test admin feature flag endpoint
curl -X GET https://onhyper.io/api/admin/features \
  -H "X-Admin-Key: $ONHYPER_MASTER_KEY"

# Test user plan update
curl -X PATCH https://onhyper.io/api/admin/users/USER_ID/plan \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ONHYPER_MASTER_KEY" \
  -d '{"plan": "PRO"}'

# Test future user list endpoint
curl -X GET "https://onhyper.io/api/admin/users?search=@hyper.io&limit=10" \
  -H "X-Admin-Key: $ONHYPER_MASTER_KEY"
```
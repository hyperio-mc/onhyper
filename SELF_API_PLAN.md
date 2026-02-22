# OnHyper Self-API Feature Plan

## Overview

Enable OnHyper apps to call OnHyper's own API through the proxy, allowing apps to manage other apps programmatically. This enables a "builder app on OnHyper that builds OnHyper apps."

## User Experience

1. User goes to Settings page
2. Checks "Enable OnHyper API access for my apps"
3. All their published apps can now call `/proxy/onhyper/api/apps` etc.
4. No manual API key management - the proxy uses the user's own `oh_live_` token

## Technical Design

### Architecture

```
Builder App (builder.onhyper.io)
    │
    ├── POST /proxy/openrouter/v1/chat/completions
    │   └── Agent generates HTML/CSS/JS
    │
    └── POST /proxy/onhyper/api/apps
        └── Creates new app using user's own API token

New App (new-app-xyz.onhyper.io) ✅
```

### Components

1. **Settings Persistence** - new `user_settings` table
2. **Proxy Endpoint** - `onhyper` in `PROXY_ENDPOINTS`
3. **Dashboard UI** - checkbox in settings
4. **Proxy Logic** - special handling for `onhyper` endpoint

---

## Implementation Steps

### Step 1: Add User Settings Table

**File**: `src/lib/db.ts`

Add a `user_settings` table to store per-user feature flags:

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  onhyper_api_enabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Success Criteria:**
- [ ] Table created in SQLite schema
- [ ] Migration runs on server start
- [ ] Can query `getUserSettings(userId)`
- [ ] Can update `setUserSettings(userId, settings)`

---

### Step 2: Add OnHyper Proxy Endpoint Config

**File**: `src/config.ts`

Add `onhyper` to `PROXY_ENDPOINTS`:

```typescript
'onhyper': {
  target: 'https://onhyper.io',
  secretKey: 'ONHYPER_API_KEY', // Special: auto-populated from user's own token
  description: 'OnHyper API - manage apps, secrets, dashboard. Enable in Settings.',
  self: true, // Flag to indicate special handling
}
```

**Success Criteria:**
- [ ] Endpoint appears in `GET /proxy` list
- [ ] Has `self: true` flag for special handling

---

### Step 3: Update Proxy Logic for Self-Endpoint

**File**: `src/routes/proxy.ts`

Modify the proxy handler to check `onhyper_api_enabled` setting and use user's own API token:

```typescript
// In identifyUser or before fetching secret
if (endpointConfig.self) {
  const settings = getUserSettings(identity.userId);
  if (!settings?.onhyper_api_enabled) {
    return c.json({
      error: 'OnHyper API access not enabled. Enable in Settings.',
    }, 403);
  }
  // Use user's own API key instead of stored secret
  const userApiKey = getUserApiKey(identity.userId);
  if (!userApiKey) {
    return c.json({
      error: 'No API key found. Generate one in Dashboard.',
    }, 401);
  }
  secretValue = userApiKey;
}
```

**Success Criteria:**
- [ ] Returns 403 if user hasn't enabled the feature
- [ ] Uses user's `oh_live_` token when enabled
- [ ] Routes to `https://onhyper.io/api/...`
- [ ] Works with `X-App-Slug` header from published apps

---

### Step 4: Add Settings API Endpoints

**File**: `src/routes/settings.ts` (new file)

```typescript
// GET /api/settings - Get user settings
// PUT /api/settings - Update user settings
```

Endpoints:
- `GET /api/settings` → `{ onhyper_api_enabled: boolean }`
- `PUT /api/settings` → body: `{ onhyper_api_enabled: boolean }`

**Success Criteria:**
- [ ] GET returns current settings
- [ ] PUT updates settings
- [ ] Requires authentication (JWT or API key)
- [ ] Registered in `src/index.ts`

---

### Step 5: Update Dashboard UI

**File**: `public/pages/settings.html` or `public/app.js`

Add UI for the checkbox:

```html
<div class="setting-item">
  <label>
    <input type="checkbox" id="onhyper-api-enabled" />
    Enable OnHyper API access for my apps
  </label>
  <p class="help-text">
    Allows your published apps to call OnHyper APIs through the proxy.
    Required for builder apps that create other apps.
  </p>
</div>
```

Add JS to load/save the setting via API.

**Success Criteria:**
- [ ] Checkbox shows current state on page load
- [ ] Toggling saves to `/api/settings`
- [ ] Shows success/error feedback
- [ ] Help text explains the feature

---

### Step 6: Add Tests

**File**: `src/routes/settings.test.ts`

```typescript
- Test GET /api/settings (authenticated)
- Test PUT /api/settings (authenticated)
- Test proxy /proxy/onhyper with feature disabled → 403
- Test proxy /proxy/onhyper with feature enabled → success
```

**Success Criteria:**
- [ ] All tests pass
- [ ] `npm test` exits 0

---

### Step 7: Documentation Update

**Files**: 
- `README.md` - Add `onhyper` endpoint to table
- `PROXY_GUIDE.md` - Add self-API section

**Success Criteria:**
- [ ] README shows `onhyper` endpoint
- [ ] PROXY_GUIDE explains self-API feature

---

### Step 8: Code Review & Integration Testing

**Task**: Comprehensive review of all changes

**Checklist:**
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Manual test: enable setting, call `/proxy/onhyper/api/apps` from a test app
- [ ] Manual test: create app via self-API
- [ ] Security review: no token leakage
- [ ] Railway deploy succeeds

**Success Criteria:**
- [ ] Full integration test passes
- [ ] Builder app concept proven with minimal example

---

## Dependencies

- Step 3 depends on Steps 1 and 2
- Step 5 depends on Step 4
- Step 6 depends on Steps 1-5
- Step 8 depends on everything

## Estimated Time

| Step | Est. Time |
|------|-----------|
| 1. Settings Table | 15 min |
| 2. Proxy Config | 5 min |
| 3. Proxy Logic | 20 min |
| 4. Settings API | 15 min |
| 5. Dashboard UI | 25 min |
| 6. Tests | 20 min |
| 7. Docs | 10 min |
| 8. Review | 25 min |
| **Total** | ~2 hours |

## Future Enhancements

- Rate limiting for self-API calls (count against user's plan)
- Audit log of self-API usage
- Builder app template in app gallery

# Task 032: Add Delete Account Functionality

## Status: ✅ COMPLETE

**Implementation Date:** 2026-02-19  
**Commit:** `8b5fca4 feat(auth): add DELETE /api/auth/account endpoint (task-032)`

---

## Tables Referencing `user_id`

| Table | Foreign Key | On Delete | Manual Cleanup Needed |
|-------|-------------|-----------|----------------------|
| `secrets` | `user_id → users.id` | CASCADE | No |
| `api_keys` | `user_id → users.id` | CASCADE | No |
| `apps` | `user_id → users.id` | CASCADE | No |
| `app_analytics` | `app_id → apps.id` | CASCADE | No (via apps) |
| `app_analytics_daily` | `app_id → apps.id` | CASCADE | No (via apps) |
| `custom_secrets` | `user_id → users.id` | CASCADE | No |
| `password_resets` | `user_id → users.id` | CASCADE | No |
| `subdomain_reservations` | `owner_id → users.id` | CASCADE | No (but done explicitly) |
| `user_settings` | `user_id → users.id` | **NO CASCADE** | **Yes** |
| `usage` | `api_key_id → api_keys.id` | SET NULL | No |

### LMDB Data (Key-Value Store)
- `app:{appId}:content` - App HTML/CSS/JS content
- `app:{appId}:meta` - App metadata cache
- `user:{userId}:apps` - User's app ID list

---

## Implementation Plan

### Step 1: Create `deleteUserAccount` Function ✅
**File:** `src/lib/users.ts`

- [x] Validate user exists
- [x] Verify password with bcrypt
- [x] Get user's apps for LMDB cleanup
- [x] Delete `user_settings` (no CASCADE)
- [x] Delete `subdomain_reservations` (explicit cleanup)
- [x] Delete user record (CASCADE handles: apps, secrets, api_keys, custom_secrets, password_resets)
- [x] Clean up LMDB: AppContentStore, AppMetaStore, user apps list

### Step 2: Create DELETE Endpoint ✅
**File:** `src/routes/auth.ts`

- [x] Route: `DELETE /api/auth/account`
- [x] Middleware: `requireAuth`
- [x] Accept password in request body
- [x] Call `deleteUserAccount` with userId and password
- [x] Return 200 on success
- [x] Return 400 for missing password
- [x] Return 401 for wrong password or unauthenticated
- [x] Return 500 for server errors
- [x] Track `account_deleted` event in analytics

### Step 3: Write Tests ✅
**File:** `src/lib/users.test.ts`

- [x] Delete user with correct password
- [x] Reject deletion with wrong password
- [x] Throw error for non-existent user
- [x] Cascade delete API keys
- [x] Cascade delete user settings
- [x] Cascade delete apps
- [x] Cascade delete secrets
- [x] Not affect other users' data

### Step 4: Register Endpoint ✅
**File:** `src/index.ts`

- [x] Auth routes already mounted at `/api/auth`
- [x] No additional registration needed

### Step 5: Commit & Document ✅
- [x] Commit with message: `feat(auth): add DELETE /api/auth/account endpoint (task-032)`
- [x] Create this plan document

---

## Success Criteria

| Criteria | Status |
|----------|--------|
| DELETE /api/auth/account endpoint exists | ✅ |
| Requires current password verification | ✅ |
| Cascades to delete ALL user data | ✅ |
| Returns 200 on success | ✅ |
| Returns 401 for wrong password | ✅ |
| Returns 401 for unauthenticated | ✅ |
| Returns 400 for missing password | ✅ |
| Code committed | ✅ |
| Tests pass | ✅ |

---

## API Documentation

### DELETE /api/auth/account

Delete the current user's account and all associated data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "password": "currentpassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing password | `{"error": "Password is required to delete account"}` |
| 401 | Not authenticated | `{"error": "Not authenticated"}` |
| 401 | Wrong password | `{"error": "Incorrect password"}` |
| 500 | Server error | `{"error": "Failed to delete account"}` |

---

## Data Deleted

When a user deletes their account, the following data is removed:

### SQLite (Auto-CASCADE)
- Apps (HTML, CSS, JS, metadata)
- App analytics events
- App analytics daily summaries
- API keys (`oh_live_*`)
- Secrets (encrypted API keys)
- Custom secrets
- Password reset tokens

### SQLite (Manual Delete)
- User settings
- Subdomain reservations

### LMDB (Manual Delete)
- App content cache
- App metadata cache
- User's app list

### Analytics
- `account_deleted` event tracked before deletion
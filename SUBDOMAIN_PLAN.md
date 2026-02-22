# OnHyper Subdomain Support - Dev Plan

**Goal**: Every published app becomes available at `appname.onhyper.io`

## Overview

### Current Behavior
- Apps accessible at: `{subdomain}.onhyper.io` (primary) or `onhyper.io/a/{slug}` (fallback)
- URL pattern: `/a/{random-id}`

### New Behavior
- Apps accessible at: `{subdomain}.onhyper.io`
- First publisher claims subdomain permanently
- Subsequent publishes update the app at that subdomain
- Reserved subdomains blocked

## Architecture

### DNS
```
*.onhyper.io → CNAME → onhyper-production.up.railway.app
```

### SSL
- Let's Encrypt wildcard certificate
- DNS-01 challenge via Porkbun API
- Or: Railway handles SSL termination (simpler)

### Request Flow
```
User visits: myapp.onhyper.io
    ↓
Railway (SSL termination)
    ↓
Hono: Extract subdomain from Host header
    ↓
Look up app by subdomain
    ↓
Serve app or 404
```

## Database Changes

### Apps Table - Add Columns
```sql
ALTER TABLE apps ADD COLUMN subdomain TEXT UNIQUE;
ALTER TABLE apps ADD COLUMN subdomain_claimed_at DATETIME;
ALTER TABLE apps ADD COLUMN subdomain_owner_id TEXT; -- user_id who claimed it
```

### New Table: Subdomain Reservations
```sql
CREATE TABLE subdomain_reservations (
  subdomain TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  app_id TEXT, -- null until first publish
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (app_id) REFERENCES apps(id)
);
```

## Reserved Subdomains

```
www, mail, email, smtp, pop, imap, pop3
api, api-v1, api-v2, graphql, rest
admin, dashboard, console, panel, control
app, apps, staging, dev, test, demo
blog, docs, help, support, status
cdn, static, assets, media, img, images
auth, login, logout, signup, register
db, database, mysql, postgres, mongo, redis
ns, dns, mx, txt, srv, ftp, sftp, ssh
```

## Validation Rules

### Subdomain Format
- 3-63 characters
- Lowercase letters, numbers, hyphens only
- Cannot start or end with hyphen
- No consecutive hyphens
- Regex: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`

### Reserved List
- Check against reserved subdomains
- Case-insensitive matching

### Availability
- First-come, first-served
- Check `subdomain_reservations` table

## API Changes

### New Endpoint: Check Subdomain Availability
```
GET /api/subdomains/check?name=myapp
Response: { available: true, message: "Available" }
```

### New Endpoint: Claim Subdomain
```
POST /api/subdomains/claim
Body: { subdomain: "myapp" }
Response: { success: true, subdomain: "myapp" }
```

### Update: Publish App
```
POST /api/apps
Body: { name: "My App", subdomain: "myapp", html: "...", css: "...", js: "..." }
```

## Frontend Changes

### App Editor
- Add subdomain input field
- Real-time availability checker
- Show claimed subdomains for user
- Validation messages

### New Page: `/domains`
- List user's claimed subdomains
- Option to release unused subdomains (after confirmation)
- Link to associated apps

### App Preview
- Show both URLs: `/a/{id}` and `{subdomain}.onhyper.io`
- Preview button opens subdomain URL

## Backend Implementation

### Middleware: Subdomain Router
```typescript
// src/middleware/subdomain.ts
export async function subdomainRouter(c: Context, next: Next) {
  const host = c.req.header('host') || '';
  
  // Skip for main domain
  if (host === 'onhyper.io' || host === 'www.onhyper.io') {
    return next();
  }
  
  // Extract subdomain
  const match = host.match(/^([a-z0-9-]+)\.onhyper\.io$/i);
  if (match) {
    const subdomain = match[1].toLowerCase();
    
    // Check reserved
    if (isReserved(subdomain)) {
      return c.redirect('https://onhyper.io');
    }
    
    // Look up app
    const app = await getAppBySubdomain(subdomain);
    if (app) {
      return renderApp(c, app);
    }
    
    // 404 for non-existent subdomain
    return c.html(render404Page(subdomain), 404);
  }
  
  return next();
}
```

### Update: src/index.ts
```typescript
// Add early in middleware chain
app.use('*', subdomainRouter);
```

### New Functions: src/lib/subdomains.ts
```typescript
export function isReserved(subdomain: string): boolean;
export function validateSubdomain(subdomain: string): { valid: boolean; error?: string };
export function isSubdomainAvailable(subdomain: string): Promise<boolean>;
export function claimSubdomain(userId: string, subdomain: string): Promise<{ success: boolean; error?: string }>;
export function getSubdomainOwner(subdomain: string): Promise<string | null>;
export function releaseSubdomain(userId: string, subdomain: string): Promise<boolean>;
```

## Implementation Phases

### Phase 1: DNS & SSL Setup (1-2 days)
1. Add wildcard DNS record in Porkbun
2. Test DNS propagation
3. Verify SSL works (Railway auto-SSL or manual)

### Phase 2: Database Schema (1 day)
1. Add columns to apps table
2. Create subdomain_reservations table
3. Write migration script

### Phase 3: Backend Core (2-3 days)
1. Create subdomains.ts lib
2. Add subdomain router middleware
3. Implement API endpoints:
   - Check availability
   - Claim subdomain
   - Update publish flow
4. Add reserved subdomain list

### Phase 4: Frontend (2 days)
1. Add subdomain input to app editor
2. Add availability checker (debounced)
3. Create /domains page
4. Update preview URLs

### Phase 5: Testing & Polish (1-2 days)
1. Write tests for subdomain logic
2. Test edge cases:
   - Reserved subdomains
   - Invalid characters
   - Concurrent claims
   - Subdomain release
3. Update documentation

### Phase 6: Migration (1 day)
1. Optionally migrate existing apps
2. Guide users to claim subdomains

## Edge Cases

### Concurrent Claims
- Use database transaction
- UNIQUE constraint on subdomain column
- Return clear error message

### Subdomain Release
- User can release if no published app
- If app exists, must unpublish first
- 24-hour cooling period? (optional)

### App Updates
- Owner can publish new version to same subdomain
- Version history preserved

### User Deletion
- On user delete, release all subdomains
- Or: Subdomains become available after 30 days

## Security Considerations

### Subdomain Takeover Prevention
- Only owner can publish to claimed subdomain
- Validate ownership on every publish

### Rate Limiting
- Limit subdomain checks: 10/minute
- Limit claims: 5/hour per user

### Content Moderation
- Reserved subdomains for inappropriate terms? (optional)
- Future: Content scanning for published apps

## Success Metrics

- [ ] Wildcard DNS propagates correctly
- [ ] SSL works for arbitrary subdomains
- [ ] Subdomain claim flow works end-to-end
- [ ] Reserved subdomains blocked
- [ ] Subdomain routing serves correct app
- [ ] Existing `/a/{id}` URLs still work
- [ ] Users can see their claimed subdomains

## Future Enhancements

1. **Custom domains**: `myapp.com` → OnHyper app
2. **Subdomain transfers**: Transfer ownership to another user
3. **Premium subdomains**: Reserved premium names for paid plans
4. **Subdomain analytics**: Track visits per subdomain

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| DNS & SSL | 1-2 days | Porkbun access |
| Database | 1 day | None |
| Backend | 2-3 days | Database schema |
| Frontend | 2 days | Backend API |
| Testing | 1-2 days | All above |
| **Total** | **7-10 days** | |

## Questions to Resolve

1. **Railway SSL**: Does Railway auto-provision wildcard certs?
2. **Migration**: Should existing apps get auto-assigned subdomains?
3. **Pricing**: Free tier limits on subdomains?
4. **Disputes**: Process for trademark conflicts?

---

*Plan created: Feb 16, 2026*
*Author: MC / OpenClaw*
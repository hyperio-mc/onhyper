# Task: Enhanced Published Apps - Pushstate + ZIP Upload

## Goals

### 1. Pushstate Routing for Published Apps (task-066)
**Problem:** Published apps on subdomains only work at the root (`/`) - direct links to SPA routes like `/dashboard` return 404.

**Solution:**
- Modify subdomain middleware to catch all paths under a subdomain
- Serve app HTML for any path, letting client-side router handle it
- Keep `/css`, `/js`, `/raw` endpoints working by checking path patterns

**Implementation:**
- Update `src/middleware/subdomain.ts` to handle `subdomain.onhyper.io/*`
- Ensure backwards compatibility with existing `/css`, `/js`, `/raw` endpoints
- Test: Create SPA app, navigate to `/any/route`, verify it renders

### 2. ZIP File Publishing (task-067)
**Problem:** Users can only paste HTML, CSS, JS separately. Want to upload a complete static site.

**Solution:**
- Add ZIP upload endpoint that extracts and stores files
- Support common static site patterns:
  - `index.html` at root
  - `assets/` folder for images, fonts, etc.
  - `.css` and `.js` files anywhere

**Implementation:**
- Add `POST /api/apps/:id/zip` endpoint
- Use `unzipper` or `adm-zip` to extract
- Store files in LMDB or filesystem with paths preserved
- Serve static assets from stored paths

**API Changes:**
- `POST /api/apps/:id/zip` - Upload ZIP file
- `GET /api/apps/:id/files` - List uploaded files
- `DELETE /api/apps/:id/files/:path` - Delete file

**Backward Compatibility:**
- Existing HTML/CSS/JS endpoints still work
- ZIP upload is additive, not breaking

## Files to Modify
- `src/middleware/subdomain.ts` - Pushstate routing
- `src/routes/apps.ts` - Add ZIP endpoints
- `src/lib/apps.ts` - Add file storage functions
- `src/lib/lmdb.ts` - Store file contents

## Dependencies to Add
- `unzipper` or `adm-zip` - ZIP extraction

## Testing
1. Create app, upload ZIP with `index.html` and `/assets/logo.png`
2. Visit `subdomain.onhyper.io/` - shows index.html
3. Visit `subdomain.onhyper.io/assets/logo.png` - serves image
4. Visit `subdomain.onhyper.io/dashboard` - renders app (SPA handles route)

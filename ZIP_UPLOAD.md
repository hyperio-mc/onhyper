# ZIP Upload Guide

OnHyper supports uploading static web apps via ZIP files. This document covers how to prepare your app for ZIP upload and the path transformation rules.

## Supported Frameworks

### Next.js

Next.js static exports require configuration in `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
```

**Build and export:**
```bash
npm run build
npx next export
```

This creates a static export in the `out/` directory. Zip the contents:

```bash
cd out && zip -r app.zip .
```

**Important:** Next.js apps with `output: 'export'` generate paths like `/_next/static/...` which OnHyper preserves as absolute paths.

### Vite

For Vite apps, you must set the base path to relative:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',  // Required for sub-path deployment
})
```

**Build and export:**
```bash
npm run build
cd dist && zip -r app.zip .
```

Without `base: './'`, assets will use absolute paths like `/assets/app.js` which won't work from sub-paths.

### Other Static Site Generators

Ensure your build outputs relative paths (starting with `./` or no prefix) rather than absolute paths like `/assets/`.

---

## Path Transformation Rules

OnHyper transforms paths in uploaded HTML to ensure correct resolution from sub-paths:

| Original Path | Transformed | Notes |
|---------------|-------------|-------|
| `/_next/...` | `/_next/...` | Next.js - kept absolute |
| `/_vercel/...` | `/_vercel/...` | Vercel - kept absolute |
| `/api/...` | `/api/...` | API routes - kept absolute |
| `/a/{slug}/...` | `/a/{slug}/...` | App paths - kept absolute |
| `/assets/...` | `./assets/...` | Vite assets - made relative |
| `/images/...` | `./images/...` | Images - made relative |
| `./assets/...` | `./assets/...` | Already relative - unchanged |

**Why?** 
- Relative paths (`./assets/`) resolve correctly from any sub-path
- Framework paths (`/_next/`) must stay absolute because they're served by the framework's built-in server

---

## Troubleshooting

### Assets returning 404

1. **For Vite:** Ensure `base: './'` is set in `vite.config.ts` before building
2. **Re-upload:** After fixing your config, rebuild and re-upload the ZIP
3. **Check paths:** Inspect the HTML to see if paths are correct

### Check stored files

Query the API to see what files are stored:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://onhyper.io/api/apps/{app-id} | jq '.html' | head -20
```

### Check asset URLs

Visit your app and view source. Verify:
- Next.js: `src="/_next/static/..."` (absolute, preserved)
- Vite: `src="./assets/..."` (relative)

### Double slashes

If you see paths like `/a/a/slug/...`, the app was uploaded before the fix. Re-upload the ZIP.

---

## API Endpoint

```
POST /api/apps/:id/zip
```

Upload a ZIP file containing your static app.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (ZIP file)

**Response:**
```json
{
  "success": true,
  "files_count": 43,
  "files": ["index.html", "_next/static/chunks/...", ...]
}
```

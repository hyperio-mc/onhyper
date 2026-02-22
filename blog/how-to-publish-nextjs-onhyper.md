---
title: "How to Publish a Next.js App on OnHyper"
date: 2026-02-22
author: MC
tags: [nextjs, tutorial, deployment, static-export]
---

Next.js is one of the most popular React frameworks for building modern web applications. But when it comes to deploying a static export, you might hit a wall with traditional hosting. OnHyper makes it simple: zip your build, upload, and get a live URL in seconds.

In this guide, we'll walk through publishing a Next.js static export to OnHyper from start to finish.

## What We'll Build

We'll create a simple Next.js app, configure it for static export, build it, and deploy it to OnHyper. Along the way, you'll learn:

- How to configure Next.js for static export
- The correct way to zip your output for deployment
- How to use OnHyper's dashboard (or API) to publish
- Common pitfalls and how to avoid them

**Prerequisites:**

- Node.js 18+ installed
- Basic familiarity with Next.js
- An OnHyper account (free tier works)

---

## Step 1: Create a Next.js App

If you already have a Next.js app, skip to Step 2. Otherwise, let's create one:

```bash
npx create-next-app@latest my-nextjs-app
```

You'll be prompted with several options. For a static export, here's what we recommend:

```
What is your project named? my-nextjs-app
Would you like to use TypeScript? Yes
Would you like to use ESLint? Yes
Would you like to use Tailwind CSS? Yes
Would you like to use `src/` directory? No
Would you like to use App Router? Yes
Would you like to customize the default import alias? No
```

Once created, navigate to your project:

```bash
cd my-nextjs-app
```

**Expected output:**

```
my-nextjs-app/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── next.config.ts
├── package.json
└── ...
```

---

## Step 2: Configure for Static Export

Next.js supports static exports out of the box, but you need to configure it. Open `next.config.ts` (or `next.config.js` if using JavaScript) and add the `output: 'export'` option:

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
```

**What this does:**

When you run `next build`, Next.js will generate a static site instead of a Node.js server. All your pages become plain HTML files that can be served from any static host.

**Important limitations:**

Static exports don't support some Next.js features that require a server:

| Feature | Works with Static Export |
|---------|-------------------------|
| App Router | ✅ Yes |
| Static pages | ✅ Yes |
| Client-side data fetching | ✅ Yes |
| API Routes | ❌ No |
| Server Actions | ❌ No |
| ISR (Incremental Static Regeneration) | ❌ No |
| Dynamic SSR | ❌ No |

If your app uses API Routes, you'll need to either:
1. Move the API logic to external services (like OnHyper's proxy)
2. Use client-side fetching to external APIs
3. Keep server features and deploy elsewhere

---

## Step 3: Build for Static Export

Now build your app:

```bash
npm run build
```

**Expected output:**

```
   ▲ Next.js 15.x.x
   - Environments: .env

   Creating an optimized production build...
   Compiled successfully.

   Linting and checking validity of types...
   Collecting page data...
   Generating static pages (0/0) ...
   Generating static pages (1/1)

   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages (1/1)

   Route (app)                Size     First Load JS
   ┌ ○ /                      1.2 kB          87 kB
   └ ○ /_not-found            871 B          86.8 kB
   + First Load JS shared by all  86 kB

   ○ Static

   ✅ Export successful. Output written to 'out' directory.
```

After the build completes, you'll see a new `out` directory:

```bash
ls out/
```

**Expected output:**

```
_index.html       favicon.ico       next/
404.html          images/           static/
```

This `out` directory contains everything needed to serve your app statically.

---

## Step 4: Zip the Output

OnHyper accepts zip files for deployment. The key is to zip the **contents** of the `out` directory, not the `out` directory itself.

```bash
cd out && zip -r ../my-nextjs-app.zip . && cd ..
```

**Let's break this down:**

1. `cd out` — Navigate into the output directory
2. `zip -r ../my-nextjs-app.zip .` — Create a zip of everything in this directory (`.`)
3. `cd ..` — Return to the project root

**Why this matters:**

If you zip the `out` directory itself (`zip -r app.zip out`), your app's HTML will be nested inside `out/` in the zip. When deployed, visitors would need to visit `yourapp.onhyper.io/out/` instead of just `yourapp.onhyper.io/`.

**Verify your zip:**

```bash
unzip -l my-nextjs-app.zip | head -20
```

**Expected output:**

```
Archive:  my-nextjs-app.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     1234  02-22-2026 09:00   _next/static/...
      567  02-22-2026 09:00   index.html
      123  02-22-2026 09:00   favicon.ico
     ...
```

You should see `index.html` at the root of the zip, not inside a subdirectory.

---

## Step 5: Upload to OnHyper

### Option A: Dashboard Upload

1. **Sign in** to [onhyper.io](https://onhyper.io)
2. **Create a new app** — Click "New App" in the dashboard
3. **Give it a name** — This becomes your subdomain (e.g., `my-nextjs-app.onhyper.io`)
4. **Upload your zip** — Drag and drop `my-nextjs-app.zip` or click to browse
5. **Click Publish** — Your app goes live immediately

### Option B: API Upload

For automated deployments, use the OnHyper API:

```bash
# First, get your API key from the dashboard
ONHYPER_API_KEY="your-api-key-here"

# Upload and publish
curl -X POST https://onhyper.io/api/apps \
  -H "Authorization: Bearer $ONHYPER_API_KEY" \
  -F "name=my-nextjs-app" \
  -F "file=@my-nextjs-app.zip" \
  -F "publish=true"
```

**Expected response:**

```json
{
  "success": true,
  "app": {
    "id": "app_abc123",
    "name": "my-nextjs-app",
    "slug": "my-nextjs-app-d0839b31",
    "subdomain": "my-nextjs-app",
    "status": "published",
    "urls": {
      "subdomain": "https://my-nextjs-app.onhyper.io",
      "path": "https://onhyper.io/a/my-nextjs-app-d0839b31"
    }
  }
}
```

---

## Step 6: Visit Your App

Once published, your app is live at:

```
https://your-app-name.onhyper.io
```

Subdomains are automatic for new apps. If your preferred name is taken, we'll generate an alternative subdomain, or you can claim a different one.

**Bonus: SPA Routing Support**

If your Next.js app uses client-side routing (like navigating between pages with `<Link>`), OnHyper handles this automatically:

```
my-app.onhyper.io/           → serves index.html
my-app.onhyper.io/about      → serves index.html (SPA handles route)
my-app.onhyper.io/dashboard  → serves index.html (SPA handles route)
```

This means browser refresh works correctly on nested routes. No more 404s when users land directly on `/about`.

---

## Troubleshooting

### "My zip uploads but shows a blank page"

**Cause:** You zipped the `out` directory instead of its contents.

**Fix:** Re-zip from inside the `out` directory:

```bash
cd out && zip -r ../app.zip . && cd ..
```

Verify with `unzip -l app.zip` — you should see `index.html` at the root.

---

### "My assets (images, styles) aren't loading"

**Cause:** Incorrect paths in your Next.js config.

**Fix:** For static exports, avoid absolute paths. In `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '', // Leave empty for OnHyper
  assetPrefix: '', // Leave empty for OnHyper
};
```

If you need a base path, set it to match your OnHyper path URL, or use subdomains instead.

---

### "I'm getting 404 errors on route refresh"

**Cause:** This typically happens with dynamic routes in static exports.

**Fix:** For pages like `/blog/[slug]`, use `generateStaticParams` to pre-render all routes at build time:

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts(); // Your data source
  return posts.map((post) => ({
    slug: post.slug,
  }));
}
```

---

### "API routes don't work"

**Cause:** Static exports don't support Next.js API routes (`app/api/*`).

**Solutions:**

1. **Use OnHyper's proxy** — Call external APIs through `/proxy/openai/*`, `/proxy/anthropic/*`, etc.
2. **Client-side fetching** — Fetch from external APIs directly in the browser.
3. **External backend** — Deploy your API separately and call it from your static app.

---

### "Build fails with 'use server' error"

**Cause:** Server Actions aren't supported in static exports.

**Fix:** Remove Server Actions (`'use server'` directives) and use client-side data fetching instead:

```typescript
// Before (Server Action)
'use server';
export async function submitForm(data: FormData) { ... }

// After (Client-side)
'use client';
export function submitForm(data: FormData) { 
  return fetch('/proxy/your-api', { ... });
}
```

---

### "My app uses `next/image` and images are broken"

**Cause:** `next/image` with the default loader requires a server.

**Fix:** Use the `unoptimized` option or a custom image loader:

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Serves images as-is, no optimization
  },
};
```

Or use a CDN like Cloudinary:

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  images: {
    loader: 'custom',
    loaderFile: './imageLoader.ts',
  },
};
```

---

## Summary

Here's the complete workflow:

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `npx create-next-app@latest my-app` | Create project |
| 2 | Add `output: 'export'` to config | Enable static export |
| 3 | `npm run build` | Generate static files |
| 4 | `cd out && zip -r ../app.zip . && cd ..` | Package for deployment |
| 5 | Upload to OnHyper (dashboard or API) | Publish your app |
| 6 | Visit `https://your-app.onhyper.io` | Done! |

**What you get:**

- ✅ Automatic subdomain (`yourapp.onhyper.io`)
- ✅ HTTPS included
- ✅ SPA routing support
- ✅ Fast global CDN
- ✅ No cold starts (it's static!)
- ✅ Optional API proxy for secrets

---

## Next Steps

Now that your Next.js app is live, here are some ideas:

1. **Add an API** — Use OnHyper's proxy to call OpenAI, Claude, or any API without exposing keys
2. **Custom domain** — Map your own domain in the dashboard (Pro tier)
3. **Analytics** — Check the Analytics tab to see visitor traffic
4. **Iterate** — Update your app and re-upload anytime

Ready to deploy? Sign up at [onhyper.io](https://onhyper.io) and publish your Next.js app in minutes.

---

*Questions? Our support chat is an OnHyper app, published on OnHyper, proxying through OnHyper. Meta is the new normal.*
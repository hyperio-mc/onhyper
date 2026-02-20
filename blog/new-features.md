---
title: "Publish Static Sites with ZIP Files + Pushstate Routing"
date: 2026-02-20
author: MC
tags: [onhyper, features, static-sites, nextjs]
---

Today we're shipping two major features that make OnHyper a first-class home for static sites and single-page applications:

1. **ZIP upload** — Deploy your static site in one request
2. **Pushstate routing** — SPAs work natively on subdomains

No more manual file-by-file uploads. No more broken routes when users refresh on `/dashboard`. Your Next.js exports, Vite builds, and vanilla HTML sites just work.

## The Problem We Solved

Static sites are the bread and butter of modern web development. But deploying them has always had friction:

**The upload friction:** You build your app, get a `dist/` folder with 50+ files, and then what? Upload each file individually? Write a custom script to hit an API 50 times?

**The routing problem:** Single-page apps use client-side routing. Users navigate to `/dashboard`, refresh the page, and get... 404. Because the server doesn't know `/dashboard` is a client route. You need server-side rewrite rules or a catch-all route.

We fixed both.

## ZIP Upload: One Request, Entire Site

Upload your entire static site with a single API call:

```bash
# Build your app
npm run build

# Upload the dist folder as a ZIP
cd dist && zip -r ../site.zip . && cd ..

# Deploy to OnHyper
curl -X POST https://onhyper.io/api/apps/{app_id}/zip \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@site.zip"
```

That's it. Your site is live at `yourapp.onhyper.io`.

### What Gets Served

The ZIP upload handles everything:

- **HTML** — Your `index.html` and any subdirectory pages
- **JavaScript** — All your bundled JS files
- **CSS** — Stylesheets, including frameworks like Tailwind
- **Images** — PNG, JPG, SVG, WebP — all served with proper MIME types
- **Fonts** — WOFF, WOFF2, TTF, OTF — your typography works out of the box
- **Other assets** — JSON, XML, favicons, manifests, whatever you need

No configuration required. Standard static file conventions work automatically.

## Pushstate Routing: SPAs Just Work

The real magic happens with routing.

Before today, if you published a React app with routes like `/dashboard` and `/settings`, a user who refreshed on `/dashboard` would hit a 404. The server didn't have that file.

Now? We handle it automatically.

**Published apps on subdomains get pushstate routing by default.**

```
myapp.onhyper.io/           → serves index.html
myapp.onhyper.io/dashboard  → serves index.html (client handles the route)
myapp.onhyper.io/settings   → serves index.html (client handles the route)
myapp.onhyper.io/_next/...  → serves actual static files
```

This means:

- **Next.js static exports** work natively
- **React Router** works without server config
- **Vue Router** works out of the box
- **Any SPA framework** with client-side routing just works

### How It Works

For requests to published apps:

1. First, check if the path matches a static file in your ZIP → serve that file
2. If not, check if it's an internal path (`/_next/`, `/api/`, etc.) → serve that file
3. Otherwise, serve `index.html` → your SPA handles the route

This is the same technique Vercel, Netlify, and other modern platforms use. Now it's on OnHyper.

## Next.js Support: First-Class Citizen

Next.js is the most popular React framework, and static exports are a common deployment target. We've optimized for this.

```bash
# next.config.js
module.exports = {
  output: 'export',
  trailingSlash: true,  // Optional, but recommended for clean URLs
}
```

Build and deploy:

```bash
npm run build
# Creates 'out/' directory with your static site

cd out && zip -r ../nextjs-app.zip . && cd ..

curl -X POST https://onhyper.io/api/apps/{app_id}/zip \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@nextjs-app.zip"
```

Your Next.js app is live with:

- Client-side routing working on refresh
- `/_next/static/` assets served correctly
- Image optimization (if using static images)
- All the benefits of Next.js without a Node server

## The Full Picture

Here's what you get with OnHyper static hosting:

| Feature | Status |
|---------|--------|
| ZIP upload | ✅ Live |
| Pushstate routing | ✅ Live |
| CSS/JS serving | ✅ Live |
| Image serving | ✅ Live |
| Font serving | ✅ Live |
| Next.js support | ✅ Live |
| Vite support | ✅ Live |
| Custom domains | 🚧 Coming soon |

## Try It Now

1. **Create an app** on [onhyper.io](https://onhyper.io)
2. **Build your static site** (Next.js, Vite, vanilla HTML, whatever)
3. **ZIP the output** and upload via API
4. **Share the link** — `yourapp.onhyper.io` works anywhere

No server. No config. No routing headaches. Just your code, live.

---

*Ready to ship? [Sign up](https://onhyper.io) and deploy your first static site in minutes.*
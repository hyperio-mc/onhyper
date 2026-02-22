---
title: "Subdomain-First: Cleaner URLs for Your Apps"
date: 2026-02-22
author: MC
tags: [onhyper, features, urls, subdomains]
---

We're making subdomains the default way to access your OnHyper apps. Starting today, every new app automatically gets a subdomain URL like `yourapp.onhyper.io` — no configuration required.

## What Changed

**Before:** Apps were primarily accessed via path-based URLs like `onhyper.io/a/my-app-abc123`. Subdomains were a separate feature you had to configure.

**Now:** Subdomains are automatic. When you create an app, we generate and claim a subdomain for you. Your app is immediately available at `yourapp.onhyper.io`.

## Cleaner URLs

The difference is obvious:

| Style | URL |
|-------|-----|
| Path-based | `onhyper.io/a/my-todo-app-d0839b31` |
| **Subdomain** | `my-todo-app.onhyper.io` |

Subdomains are:
- **Shorter** — No random suffix needed
- **Memorable** — Easier to share and type
- **Professional** — Looks like a real product URL

## How It Works

1. **Create an app** with any name
2. **We auto-generate a subdomain** from your app name (if available)
3. **Your app is live** at `yourapp.onhyper.io`

If the subdomain is already taken, we fall back to a path-based URL. You can always claim a different subdomain later.

## Path URLs Still Work

The path-based URL (`onhyper.io/a/slug`) remains available as a fallback. This is useful for:

- **Custom domains** — When you bring your own domain, the path URL provides a reliable backup
- **Compatibility** — Any existing links continue to work
- **Flexibility** — Some users prefer the longer URL format

## SPA Routing Support

Subdomains also unlock proper client-side routing for single-page apps. If you're building with React, Vue, or Next.js static exports:

```
myapp.onhyper.io/           → serves index.html
myapp.onhyper.io/dashboard  → serves index.html (SPA handles route)
myapp.onhyper.io/settings   → serves index.html (SPA handles route)
```

This means refresh works correctly. No more 404s when users land on `/dashboard` directly.

## Pricing

Subdomains are available on all plans:

- **Free:** Auto-generated subdomains from app name
- **Pro & Business:** Custom subdomains + custom domains

Path-based URLs (`/a/{slug}`) remain free and available to everyone.

## Get Started

Create a new app and see your subdomain URL instantly. No extra steps required.

[Sign up at onhyper.io](https://onhyper.io)

---

*Questions? Our support chat is an OnHyper app, published on OnHyper, proxying through OnHyper. Meta is the new normal.*
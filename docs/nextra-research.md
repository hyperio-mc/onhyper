# Nextra 4 Research for OnHyper Documentation Site

**Date:** 2026-02-23
**Task:** task-124
**Status:** Research Complete

## Executive Summary

**Recommendation: Nextra 4 is an excellent choice for OnHyper's documentation site.**

Nextra 4 provides a modern, fast, and highly customizable documentation platform built on Next.js 14+ with full MDX support, excellent theming capabilities, built-in search (Pagefind), and straightforward deployment to Railway or Vercel. The React/Next.js ecosystem aligns well with modern web development practices and offers the flexibility needed for API reference documentation.

---

## 1. Nextra 4 Overview

### What is Nextra?

Nextra is a documentation framework built on top of Next.js. It transforms Markdown/MDX files into a polished documentation site with minimal configuration. Version 4 (released 2025) is a major update with App Router support, Turbopack, and a Rust-based search engine.

### Key Features

| Feature | Details |
|---------|---------|
| **Framework** | Next.js 14+ App Router (Pages Router discontinued in v4) |
| **Content** | MDX (Markdown + React components) |
| **Themes** | Built-in docs theme + custom themes supported |
| **Search** | Pagefind (Rust-powered, client-side, no server needed) |
| **Syntax Highlighting** | Shiki (build-time, 100+ languages with Twoslash support) |
| **I18n** | Built-in multi-language support with RSC |
| **Bundle Size** | 36-39% smaller than Nextra 3 |
| **License** | MIT (open source) |

### Notable Companies Using Nextra

- Next.js
- React
- Tailwind CSS
- Node.js
- CodeSandbox
- SWR

---

## 2. Evaluation for OnHyper

### 2.1 MDX Support for Technical Docs

**Rating: Excellent**

Nextra has first-class MDX support:

```mdx
## API Reference

import { ApiEndpoint } from '@/components/ApiEndpoint'

<ApiEndpoint 
  method="POST" 
  path="/v1/chat/completions"
  auth="Bearer token"
/>

You can use React components directly in your docs:

export function Counter({ children }) {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(prev => prev + 1)}>
      {children} {count}
    </button>
  )
}

<Counter>Clicks:</Counter>
```

**Features for API Docs:**
- **Code blocks with syntax highlighting** (Shiki, 100+ languages)
- **Filename annotations** - Show file names above code blocks
- **Line highlighting** - Highlight specific lines
- **Copy button** - Built-in copy-to-clipboard
- **Live playground** - Interactive code editing
- **GitHub Alert Syntax** - Callouts, warnings, notes
- **Custom components** - Create your own API reference components

**Example Code Block:**
```mdx
```typescript title="app.ts"
import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from OnHyper!' })
})
```
```

### 2.2 Theming and Customization

**Rating: Excellent**

#### Theme Configuration

Nextra's docs theme is highly customizable via the `<Layout>` component:

```jsx
// app/layout.jsx
import { Layout, Navbar, Footer } from 'nextra-theme-docs'

export default async function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Layout
          banner={<Banner>OnHyper 2.0 now available!</Banner>}
          navbar={
            <Navbar
              logo={<b>OnHyper Docs</b>}
              projectLink="https://github.com/hyperio-software/onhyper"
            />
          }
          sidebar={{ autoCollapse: true, defaultMenuCollapseLevel: 2 }}
          footer={<Footer>MIT {new Date().getFullYear()} © OnHyper</Footer>}
          docsRepositoryBase="https://github.com/hyperio-software/onhyper/tree/main/docs"
          editLink="Edit this page on GitHub"
          feedback={{ content: 'Question? Give us feedback' }}
          darkMode={true}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
```

#### Branding Customization

1. **Logo & Colors:** Pass custom logo, configure primary hue via CSS variables
2. **Dark Mode:** Built-in with next-themes integration
3. **Custom CSS:** Override any styles via global CSS or cascade layers
4. **Custom Components:** Create fully custom components for API references, code samples, etc.
5. **Page Configuration:** Control sidebar, navbar, footer per-page via `_meta.js` files

**Example: Custom Primary Color**
```css
:root {
  --nextra-primary-hue: 210deg; /* Blue for OnHyper branding */
}
```

### 2.3 Search Capabilities

**Rating: Excellent**

Nextra 4 uses **Pagefind** - a Rust-powered static search engine:

**Benefits:**
- **Lightning fast** - Client-side search, no server required
- **Indexing:** Automatic indexing of MDX, Markdown, and static pages
- **Build-time:** Search index generated during `next build`
- **Zero latency** - No network requests for search
- **Better results** - Superior to previous FlexSearch implementation

**Setup:**
```json
// package.json
{
  "scripts": {
    "postbuild": "pagefind --site .next/server/app --output-path public/_pagefind"
  }
}
```

**Alternative Integrations:**
- Algolia DocSearch (free for open source)
- Custom search components supported

### 2.4 Deployment Options

**Rating: Excellent**

Nextra is a Next.js app, so it supports all Next.js deployment targets:

| Platform | Support | Notes |
|----------|---------|-------|
| **Vercel** | Native | Zero-config deployment, recommended by Nextra |
| **Railway** | Full support | Deploy as Node.js server or Docker |
| **Docker** | Full support | Use `output: 'standalone'` in next.config |
| **Static Export** | Supported | `output: 'export'` for static HTML |
| **Node.js Server** | Full support | Self-host on any VPS |

**Railway Deployment (Recommended for OnHyper):**

1. **Option A: Node.js Runtime**
   ```toml
   # railway.toml
   [build]
   builder = "nixpacks"
   
   [deploy]
   startCommand = "npm run start"
   healthcheckPath = "/"
   ```

2. **Option B: Docker**
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   FROM node:20-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   COPY --from=builder /app/public ./public
   CMD ["node", "server.js"]
   ```

**Subdomain Strategy:**
- `docs.onhyper.io` - Primary docs site
- Deploy to Railway as separate service
- Configure DNS CNAME to Railway

### 2.5 Integration with Hono/Vite Stack

**Rating: Good (Separate Concerns)**

The docs site would run as a separate Next.js application, not integrated directly with the Hono API:

**Recommended Architecture:**
```
onhyper.io (main app - Hono/Vite)
├── API routes (Hono)
├── Dashboard (Vite/SPA)
└── App hosting (*.onhyper.io subdomains)

docs.onhyper.io (docs - Nextra)
├── Getting Started
├── API Reference
├── Guides
└── Examples
```

**Shared Resources:**
- Design tokens (CSS variables) for consistent branding
- Shared components can be published as npm package
- Link between docs and dashboard

---

## 3. Comparison with Alternatives

### Feature Comparison

| Feature | Nextra 4 | Docusaurus | Mintlify | GitBook |
|---------|----------|------------|----------|---------|
| **Framework** | Next.js 14 | React (Custom) | Proprietary | Proprietary |
| **License** | MIT (Free) | MIT (Free) | Freemium | Freemium |
| **Self-host** | Yes | Yes | No | No |
| **MDX Support** | Excellent | Good | Good | Limited |
| **API Reference** | Custom | OpenAPI plugin | Built-in | Built-in |
| **Search** | Pagefind (Built-in) | Algolia | Built-in AI | Built-in |
| **Theming** | Full control | Full control | Limited | Limited |
| **Deployment** | Any platform | Any platform | Mintlify only | GitBook only |
| **Vercel Optimized** | Yes | Yes | N/A | N/A |
| **Pricing** | Free | Free | $150-300/mo | Free-$8/user/mo |

### Nextra vs Docusaurus

**Docusaurus Pros:**
- Mature ecosystem, larger community
- Built-in OpenAPI/Swagger plugin for API docs
- Versioning support out of the box
- i18n more mature

**Docusaurus Cons:**
- Uses older React patterns (not Next.js)
- Custom Pages Router, slower dev experience
- Bundle size larger
- No Turbopack support

**Nextra Pros:**
- Modern Next.js 14+ with App Router
- Smaller bundle size (36% lighter)
- Turbopack for faster builds
- React Server Components
- Simpler setup

**Winner for OnHyper: Nextra 4**
- Better DX with modern tooling
- More flexibility for custom components
- Lighter and faster
- Active development (just released v4 in 2025)

### Nextra vs Mintlify

**Mintlify Pros:**
- Beautiful out-of-the-box design
- AI-powered search and writing
- Built-in API reference generation
- Automatic OpenAPI docs
- LLM-optimized (great for AI assistants)

**Mintlify Cons:**
- **$150-300/month** for paid features
- Cannot self-host
- Limited customization
- Vendor lock-in

**Winner for OnHyper: Nextra 4**
- Zero cost (open source)
- Full control over hosting (Railway)
- Can customize to match OnHyper branding
- API reference components can be built custom

### Nextra vs GitBook

**GitBook Pros:**
- Non-technical friendly UI
- Collaboration features
- Built-in analytics
- Easy to get started

**GitBook Cons:**
- Limited customization
- Expensive at scale ($8/user/month)
- Vendor lock-in
- Not developer-focused

**Winner for OnHyper: Nextra 4**
- Developer-focused features
- Git-based workflow (already using)
- Full customization
- No per-user pricing

---

## 4. Recommendation

### Primary Recommendation: Use Nextra 4

**Why Nextra 4 for OnHyper:**

1. **Zero Cost** - Open source MIT license, no subscription fees
2. **Full Control** - Self-host on Railway alongside your existing infrastructure
3. **Modern Stack** - Next.js 14+ with App Router, Turbopack, RSC
4. **Excellent DX** - MDX, hot reload, TypeScript, custom components
5. **Great Performance** - Small bundle size, fast builds, client-side search
6. **Branding Freedom** - Full theme customization to match OnHyper
7. **API Docs Ready** - Create custom components for API references
8. **Future-Proof** - Active development, just released major v4 update

### Deployment Strategy

```
Repository: onhyper-docs (separate from main onhyper repo)
Platform: Railway
Domain: docs.onhyper.io
Build: Next.js standalone
```

### Project Structure

```
onhyper-docs/
├── app/
│   ├── layout.tsx          # Theme configuration
│   ├── page.mdx            # Homepage
│   ├── getting-started/
│   │   ├── _meta.js
│   │   ├── quickstart.mdx
│   │   └── installation.mdx
│   ├── api-reference/
│   │   ├── _meta.js
│   │   ├── proxy.mdx
│   │   ├── secrets.mdx
│   │   └── analytics.mdx
│   ├── guides/
│   │   ├── _meta.js
│   │   ├── nextjs.mdx
│   │   └── publishing.mdx
│   └── components/
│       └── ApiEndpoint.tsx  # Custom API docs component
├── public/
├── next.config.mjs
├── package.json
└── styles/
    └── globals.css
```

### Pros and Cons Summary

| Aspect | Pros | Cons |
|--------|------|------|
| **Cost** | Free, open source | Need to maintain yourself |
| **Customization** | Full control | More initial setup than SaaS |
| **Performance** | Very fast, small bundles | Build time for large docs |
| **API Docs** | Custom components possible | No built-in OpenAPI plugin |
| **Search** | Built-in Pagefind (fast) | Not as advanced as Algolia |
| **Deployment** | Any platform | Need to set up CI/CD |
| **Learning Curve** | Next.js familiarity helps | Need to learn Nextra patterns |

---

## 5. Next Steps

If approved, here's the implementation plan:

1. **Create docs repository** - `onhyper-docs` GitHub repo
2. **Initialize Nextra 4** - `npm create nextra@latest`
3. **Configure theme** - Match OnHyper branding (blue primary, logo)
4. **Set up Railway deployment** - Connect GitHub, deploy
5. **Configure DNS** - `docs.onhyper.io` CNAME to Railway
6. **Create API reference components** - Custom React components for endpoints
7. **Migrate existing content** - From SKILL.md, README.md, blog posts
8. **Add search** - Enable Pagefind
9. **Write guides** - Getting started, Next.js deployment, etc.

### Estimated Timeline

- **Setup & Configuration:** 2-4 hours
- **Theme Customization:** 2-4 hours
- **Content Migration:** 4-8 hours
- **API Reference Components:** 4-8 hours
- **Deployment & DNS:** 1-2 hours

**Total: 2-3 days**

---

## 6. Resources

- **Nextra Docs:** https://nextra.site/docs
- **Nextra 4 Announcement:** https://the-guild.dev/blog/nextra-4
- **GitHub:** https://github.com/shuding/nextra
- **Pagefind:** https://pagefind.app
- **Example Sites:** Next.js docs, React docs, Tailwind CSS docs

---

*Research completed by OpenClaw subagent for task-124*
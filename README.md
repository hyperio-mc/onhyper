# OnHyper.io

> Deploy web apps in 2 minutes with secure API key management

OnHyper is a platform for publishing static web apps that securely call external APIs. Upload a ZIP file, get a subdomain, and your app is live — with API keys stored server-side and injected securely at request time.

## ⚡ Quickstart: Deploy in 2 Minutes

### 1. Build Your App

Export your static site. For Next.js:

```bash
# next.config.js
module.exports = {
  output: 'export',
  images: { unoptimized: true }
}
```

```bash
npm run build
# Creates 'out/' directory with static files
```

### 2. Create a ZIP

```bash
cd out && zip -r ../my-app.zip . && cd ..
```

### 3. Upload & Get Your URL

```bash
curl -X POST https://onhyper.io/api/apps/my-app/zip \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@my-app.zip"
```

**That's it!** Your app is now live at `my-app.onhyper.io`

---

## 🌐 Subdomain-First URLs

Every app gets a clean subdomain by default:

```
your-app-name.onhyper.io
```

- **No path prefixes** — your assets and routes work naturally
- **HTTPS included** — SSL certificates auto-provisioned
- **Custom domains** — add your own domain (PRO plan)

Legacy path-based URLs (`onhyper.io/a/your-app`) still work for backward compatibility.

## 📦 ZIP Publishing

ZIP upload is the primary way to deploy:

**Supported files:**
- HTML, CSS, JavaScript
- Images: PNG, JPG, GIF, SVG, WebP, ICO
- Fonts: WOFF, WOFF2, TTF, OTF, EOT
- Other: JSON, XML, TXT, PDF, manifests

**Endpoint:** `POST /api/apps/:id/zip`

### SPA Routing (Automatic)

Published apps support client-side routing out of the box:

```
yourapp.onhyper.io/           → serves index.html
yourapp.onhyper.io/dashboard  → serves index.html (SPA handles route)
yourapp.onhyper.io/settings   → serves index.html (SPA handles route)
yourapp.onhyper.io/assets/... → serves actual static files
```

Works with: Next.js, Vite, React, Vue, Svelte, Angular, and any SPA framework.

## ⚛️ Next.js Compatibility

To deploy a Next.js app, you need static export mode:

```javascript
// next.config.js
module.exports = {
  output: 'export',
  images: { unoptimized: true }
}
```

Then build and deploy:

```bash
npm run build          # Creates 'out/' directory
cd out
zip -r ../app.zip .
# Upload via /api/apps/:id/zip
```

**What works:**
- ✅ Client-side routing (pushstate)
- ✅ Static assets (`/_next/static/...`)
- ✅ API routes via OnHyper proxy
- ✅ Image imports (unoptimized)

**What doesn't work:**
- ❌ Server-side rendering (SSR)
- ❌ Server components
- ❌ API routes (use OnHyper proxy instead)

## 🔑 Features

### Secure Proxy Service

Call external APIs without exposing keys in client code:

```javascript
// Your app code
fetch('/proxy/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'X-App-Slug': 'my-app',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ messages: [...] })
})
```

API keys are stored encrypted server-side and injected at request time.

**Supported endpoints:**

| Endpoint | Target API |
|----------|-----------|
| `/proxy/openai` | OpenAI API |
| `/proxy/anthropic` | Anthropic API |
| `/proxy/openrouter` | OpenRouter API |
| `/proxy/scoutos` | ScoutOS Platform |
| `/proxy/ollama` | Ollama API |

Add custom APIs via the Secrets tab in your dashboard.

### Secrets Management

Store API keys securely:

```bash
# Add a secret
curl -X POST https://onhyper.io/api/secrets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "OPENAI_API_KEY", "value": "sk-..."}'
```

Secrets are encrypted with AES-256-GCM and never exposed to clients.

### Analytics

Track events from your apps:

```javascript
// In your app
fetch('/api/analytics/capture', {
  method: 'POST',
  headers: {
    'X-App-Slug': 'my-app',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event: 'button_clicked',
    properties: { button: 'signup' }
  })
})
```

View analytics in your dashboard or query via API.

## 🛠 Development

```bash
# Clone and install
git clone https://github.com/hyperio-mc/onhyper.git
cd onhyper
npm install

# Set up environment
cp .env.example .env

# Start dev server
npm run dev
```

Server runs at `http://localhost:3000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ONHYPER_JWT_SECRET` | **Yes** | JWT signing secret (32+ chars) |
| `ONHYPER_MASTER_KEY` | **Yes** | Encryption master key (32+ chars) |
| `PORT` | No | Server port (default: 3000) |
| `DATA_DIR` | No | Data directory (default: ./data) |

Generate secure secrets:
```bash
openssl rand -hex 32
```

## 📋 Pricing

| Plan | Requests/Day | Apps | Secrets | Subdomains |
|------|-------------|------|---------|------------|
| FREE | 100 | 3 | 5 | Path-based only |
| HOBBY | 1,000 | 10 | 20 | ✅ |
| PRO | 10,000 | 50 | 50 | ✅ Custom domains |
| BUSINESS | Unlimited | Unlimited | Unlimited | ✅ Short + custom |

## 🔐 Security

- **AES-256-GCM encryption** for all stored secrets
- **PBKDF2 key derivation** (100k iterations)
- **JWT authentication** with bcrypt password hashing
- **Rate limiting** on sensitive endpoints

## 🚀 Deployment

Designed for single-server deployment (Railway, Render, Fly.io):

```bash
# Build
npm run build

# Start production
npm start
```

Required environment variables:
- `ONHYPER_JWT_SECRET`
- `ONHYPER_MASTER_KEY`
- `DATA_DIR` (for persistent storage)

## 📚 API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create account |
| `/api/auth/login` | POST | Get JWT token |
| `/api/auth/me` | GET | Current user |

### Apps

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apps` | GET | List your apps |
| `/api/apps` | POST | Create app |
| `/api/apps/:id` | GET | App details |
| `/api/apps/:id` | PUT | Update app |
| `/api/apps/:id` | DELETE | Delete app |
| `/api/apps/:id/zip` | POST | Upload ZIP |
| `/api/apps/:id/publish` | POST | Publish (get subdomain) |

### Secrets

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/secrets` | GET | List secrets (masked) |
| `/api/secrets` | POST | Store secret |
| `/api/secrets/:name` | PUT | Update secret |
| `/api/secrets/:name` | DELETE | Delete secret |

### Proxy

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/proxy/:endpoint/*` | ALL | Proxy to external API |

## 📄 License

MIT — See [LICENSE](LICENSE) for details.

## 🤝 Contributing

Issues and PRs welcome at [github.com/hyperio-mc/onhyper](https://github.com/hyperio-mc/onhyper)

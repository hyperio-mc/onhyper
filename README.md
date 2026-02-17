# OnHyper.io

> Secure Proxy Service for API-Backed Web Apps

OnHyper is a platform for publishing web applications that securely call external APIs. It solves the problem of exposing API keys in client-side code by providing a secure proxy layer that holds secrets server-side and injects them at request time.

## Quick Start

```bash
# Clone and install
git clone https://github.com/hyperio-mc/onhyper.git
cd onhyper
npm install

# Set up environment (development defaults are provided)
cp .env.example .env

# Start development server
npm run dev
```

The server will start at `http://localhost:3000`.

## Features

- **Secure Secret Storage**: API keys encrypted at rest with AES-256-GCM
- **Proxy Service**: Forward requests to external APIs with automatic auth injection
- **App Publishing**: Deploy static apps that can call APIs securely
- **User Authentication**: JWT-based auth with email/password
- **Usage Tracking**: Monitor API calls per app and endpoint
- **Waitlist System**: Managed access with referral bonuses

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                              │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                        Published App                             │    │
│   │                                                                 │    │
│   │   fetch('/proxy/scout-atoms/world/{id}/_interact', {           │    │
│   │     method: 'POST',                                             │    │
│   │     headers: { 'X-App-Slug': 'my-app' },                        │    │
│   │     body: JSON.stringify({ messages: [...] })                   │    │
│   │   })                                                            │    │
│   │                                                                 │    │
│   └─────────────────────────────┬──────────────────────────────────┘    │
│                                 │                                        │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
                                  │ 1. Request to /proxy/{endpoint}
                                  │    (no API key exposed)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          OnHyper.io Server                               │
│                                                                          │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│   │   Auth Layer     │  │  Secret Vault    │  │  Usage Tracker   │      │
│   │  (JWT + API Key) │  │  (AES-256-GCM)   │  │   (SQLite)       │      │
│   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│            │                     │                     │                 │
│            └─────────────────────┼─────────────────────┘                 │
│                                  │                                       │
│   ┌──────────────────────────────▼──────────────────────────────────┐   │
│   │                        Proxy Service                              │   │
│   │                                                                  │   │
│   │   1. Identify user (JWT, API key, or App-Slug)                   │   │
│   │   2. Look up encrypted secret for endpoint                       │   │
│   │   3. Decrypt and inject Authorization header                     │   │
│   │   4. Forward request to target API                               │   │
│   │   5. Return response (with CORS headers)                         │   │
│   │                                                                  │   │
│   └──────────────────────────────┬──────────────────────────────────┘   │
│                                  │                                       │
└──────────────────────────────────┼───────────────────────────────────────┘
                                   │
                                   │ 2. Forward with secret
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           External APIs                                  │
│                                                                          │
│   api.scoutos.com    ollama.com/v1    openrouter.ai    anthropic.com    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create new account |
| `/api/auth/login` | POST | Authenticate and get JWT |
| `/api/auth/token` | POST | Validate JWT token |
| `/api/auth/me` | GET | Get current user info |

### Secrets Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/secrets` | GET | List user's secrets (masked) |
| `/api/secrets` | POST | Store a new secret |
| `/api/secrets/:name` | DELETE | Delete a secret |
| `/api/secrets/check/:name` | GET | Check if secret exists |

### Apps

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apps` | GET | List user's apps |
| `/api/apps` | POST | Create new app |
| `/api/apps/:id` | GET | Get app details |
| `/api/apps/:id` | PUT | Update app |
| `/api/apps/:id` | DELETE | Delete app |

### Proxy

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/proxy` | GET | List available endpoints |
| `/proxy/:endpoint/*` | ALL | Proxy request to external API |

### App Rendering

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/a/:slug` | GET | Render published app |
| `/a/:slug/raw` | GET | Get raw HTML |
| `/a/:slug/css` | GET | Get app CSS |
| `/a/:slug/js` | GET | Get app JavaScript |

### Waitlist (Public)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/waitlist` | POST | Submit waitlist application |
| `/api/waitlist/position` | GET | Get position in queue |
| `/api/waitlist/referral` | POST | Process a referral |
| `/api/waitlist/invite/:code` | GET | Validate invite code |
| `/api/waitlist/stats` | GET | Get global waitlist stats |

### Chat (Public)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/message` | POST | Send message to support agent |
| `/api/chat/lead` | POST | Capture lead from chat |
| `/api/chat/status` | GET | Check chat service status |

### Blog (Public)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/blog` | GET | List all posts |
| `/api/blog/:slug` | GET | Get single post |
| `/api/blog/rss` | GET | RSS feed |

### Dashboard (Protected)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Get user statistics |

## Proxy Endpoints

Pre-configured proxy endpoints for common AI APIs:

| Endpoint | Target API | Secret Key |
|----------|-----------|------------|
| `/proxy/scoutos` | ScoutOS Platform (Agents, Tables, Drive, Workflows) | `SCOUT_API_KEY` |
| `/proxy/openai` | OpenAI API | `OPENAI_API_KEY` |
| `/proxy/anthropic` | Anthropic API | `ANTHROPIC_API_KEY` |
| `/proxy/openrouter` | OpenRouter API | `OPENROUTER_API_KEY` |
| `/proxy/ollama` | Ollama API | `OLLAMA_API_KEY` |
| `/proxy/onhyper/*` | OnHyper API (self-API) | `ONHYPER_API_KEY` |

**Note**: `/proxy/scout-atoms` is deprecated - use `/proxy/scoutos` instead.

**Note**: `/proxy/onhyper` is a special "self-api" endpoint. Users must enable it in Settings. It uses the user's own API token, not a stored secret.

### ScoutOS Proxy Examples

```javascript
// Agent chat (streaming)
fetch('/proxy/scoutos/world/{agent_id}/_interact', {
  method: 'POST',
  headers: {
    'X-App-Slug': window.ONHYPER.appSlug,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] })
})

// Scout Tables
fetch('/proxy/scoutos/v2/collections/{collection_id}/rows', {
  headers: { 'X-App-Slug': window.ONHYPER.appSlug }
})

// Drive
fetch('/proxy/scoutos/drive/download/{file_id}', {
  headers: { 'X-App-Slug': window.ONHYPER.appSlug }
})
```

The proxy supports three authentication methods:

1. **JWT Token**: `Authorization: Bearer <token>`
2. **API Key**: `X-API-Key: oh_live_...`
3. **App Slug**: `X-App-Slug: my-app` (for published apps)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `HOST` | No | Server host (default: 0.0.0.0) |
| `BASE_URL` | No | Public URL (default: http://localhost:3000) |
| `DATA_DIR` | No | Data storage directory (default: ./data) |
| `STATIC_PATH` | No | Frontend files path (default: ./public) |
| **`ONHYPER_JWT_SECRET`** | **Yes** | Secret for JWT signing (32+ chars) |
| **`ONHYPER_MASTER_KEY`** | **Yes** | Master key for secret encryption (32+ chars) |
| `SCOUTOS_API_KEY` | No | ScoutOS API key for chat support |
| `SCOUTOS_SUPPORT_AGENT_ID` | No | ScoutOS agent ID for support chat |

### Security Note

In production, `ONHYPER_JWT_SECRET` and `ONHYPER_MASTER_KEY` **must** be set to secure random values. The server will fail to start if these are left as defaults in production mode.

Generate secure values:
```bash
# Generate JWT secret
openssl rand -hex 32

# Generate master key
openssl rand -hex 32
```

## Project Structure

```
onhyper/
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Configuration and validation
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── apps.ts           # App management
│   │   ├── secrets.ts        # Secret management
│   │   ├── proxy.ts          # Proxy service
│   │   ├── render.ts         # App rendering
│   │   ├── dashboard.ts      # Dashboard stats
│   │   ├── waitlist.ts       # Waitlist system
│   │   ├── chat.ts           # Support chat
│   │   ├── blog.ts           # Blog endpoints
│   │   └── unsubscribe.ts    # Email unsubscribe
│   ├── lib/
│   │   ├── db.ts             # SQLite database
│   │   ├── lmdb.ts           # LMDB key-value store
│   │   ├── encryption.ts     # AES-256-GCM encryption
│   │   ├── secrets.ts        # Secret management
│   │   ├── users.ts          # User operations
│   │   ├── apps.ts           # App operations
│   │   ├── usage.ts          # Usage tracking
│   │   ├── analytics.ts      # PostHog analytics
│   │   └── email.ts          # Email sending (Resend)
│   ├── middleware/
│   │   ├── auth.ts           # JWT/API key authentication
│   │   └── rateLimit.ts      # Rate limiting
│   └── emails/               # React Email templates
├── public/
│   ├── index.html            # SPA entry point
│   ├── app.js                # Frontend application
│   ├── styles.css            # Styles
│   └── pages/                # SPA page templates
├── data/                     # SQLite + LMDB data (gitignored)
├── blog/                     # Markdown blog posts
└── dist/                     # Compiled JavaScript
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm test` | Run tests with Vitest |

## Pricing Plans

| Plan | Requests/Day | Apps | Secrets |
|------|-------------|------|---------|
| FREE | 100 | 3 | 5 |
| HOBBY | 1,000 | 10 | 20 |
| PRO | 10,000 | 50 | 50 |
| BUSINESS | Unlimited | Unlimited | Unlimited |

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Hono (fast web framework)
- **Language**: TypeScript
- **Database**: SQLite (users, secrets, apps) + LMDB (content cache)
- **Encryption**: AES-256-GCM with PBKDF2 key derivation
- **Auth**: JWT with bcrypt password hashing
- **Email**: Resend
- **Analytics**: PostHog
- **Frontend**: Vanilla JS SPA

## Security Model

### Secret Encryption

1. Secrets are encrypted with AES-256-GCM
2. Each secret has a unique random salt (32 bytes)
3. Encryption key derived from master key + salt via PBKDF2 (100k iterations)
4. Auth tags ensure integrity
5. Master key stored in environment variable (never in code)

### Request Flow

1. Request arrives at `/proxy/:endpoint/*`
2. User identified via JWT, API key, or App-Slug header
3. Secret looked up from encrypted database
4. Secret decrypted and injected into Authorization header
5. Request forwarded to target API
6. Response returned to client (with CORS headers)

### Rate Limiting

- Daily request limits per plan
- Strict rate limiting on auth endpoints (10/min)
- In-memory tracking (use Redis for production)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Deployment

OnHyper is designed for single-server deployment (Railway, Render, Fly.io).

Required environment variables for production:
- `ONHYPER_JWT_SECRET` - Must be set (no default)
- `ONHYPER_MASTER_KEY` - Must be set (no default)
- `DATA_DIR` or `RAILWAY_VOLUME_MOUNT_PATH` - For persistent storage

## License

MIT

## Contributing

Issues and pull requests welcome at [github.com/hyperio-mc/onhyper](https://github.com/hyperio-mc/onhyper)
# OnHyper.io - Secure Proxy Service for API-Backed Web Apps

OnHyper.io is a platform for publishing full-stack applications that require secure backend functionality. It enables developers to publish web apps that can safely call external APIs without exposing secrets to the browser.

## Features

- **Secure Secret Storage**: API keys are encrypted at rest with per-user salts
- **Proxy Service**: Call external APIs without exposing keys in browser code
- **App Publishing**: Create and publish HTML/CSS/JS apps
- **Usage Tracking**: Monitor API usage per app and endpoint
- **Analytics**: PostHog integration for user behavior tracking

## Quick Start

```bash
# Install dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env

# Edit .env with your settings
# ONHYPER_JWT_SECRET - a secure random string for JWT signing
# ONHYPER_MASTER_KEY - 32 bytes hex for encryption

# Start development server
npm run dev

# In another terminal, start the frontend
cd frontend && npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create a new account
- `POST /api/auth/login` - Authenticate and get JWT
- `POST /api/auth/token` - Validate JWT and return user info

### Secrets

- `GET /api/secrets` - List user secrets (masked)
- `POST /api/secrets` - Add a new secret
- `DELETE /api/secrets/:name` - Delete a secret

### Apps

- `GET /api/apps` - List user apps
- `POST /api/apps` - Create a new app
- `GET /api/apps/:id` - Get app details
- `PUT /api/apps/:id` - Update an app
- `DELETE /api/apps/:id` - Delete an app

### Proxy

- `GET /proxy` - List available proxy endpoints
- `ALL /proxy/:endpoint/*` - Proxy requests to external API

Available endpoints:
- `/proxy/scout-atoms` - Scout OS Atoms API
- `/proxy/ollama` - Ollama API
- `/proxy/openrouter` - OpenRouter API
- `/proxy/anthropic` - Anthropic API
- `/proxy/openai` - OpenAI API

### Render

- `GET /a/:slug` - Render a published app

## Example Usage

### 1. Create an account

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

### 2. Add an API key

```bash
curl -X POST http://localhost:3000/api/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"OPENAI_API_KEY","value":"sk-..."}'
```

### 3. Create an app

```bash
curl -X POST http://localhost:3000/api/apps \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"My AI App",
    "html":"<h1>AI Chat</h1><div id=\"output\"></div>",
    "js":"fetch(\"/proxy/openai/chat/completions\", {method:\"POST\", headers:{\"Content-Type\":\"application/json\"}, body: JSON.stringify({model:\"gpt-4\", messages:[{role:\"user\",content:\"Hello!\"}]})}).then(r=>r.json()).then(console.log)"
  }'
```

### 4. View your app

Visit `http://localhost:3000/a/your-app-slug`

## Analytics (PostHog)

OnHyper uses PostHog for analytics tracking. Events are tracked both client-side (browser) and server-side (backend).

### Setup

1. Create a free account at [posthog.com](https://posthog.com)
2. Create a new project and get your API key from Project Settings
3. Add environment variables:

**Backend (.env):**
```bash
POSTHOG_KEY=phc_your_project_key_here
POSTHOG_HOST=https://app.posthog.com
```

**Frontend (frontend/.env):**
```bash
VITE_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Tracked Events

#### Client-Side Events (Browser)
| Event | Description | Properties |
|-------|-------------|------------|
| `page_view` | Page navigation (automatic) | `path`, `referrer` |
| `signup` | User creates account | `email`, `plan`, `source` |
| `login` | User logs in | `email` |
| `app_created` | User creates an app | `app_id`, `app_name` |
| `app_viewed` | User views an app | `app_id`, `app_name` |
| `secret_added` | User adds an API key | `key_name` |
| `upgrade_clicked` | User clicks upgrade CTA | `from_plan`, `to_plan` |

#### Server-Side Events (Backend)
| Event | Description | Properties |
|-------|-------------|------------|
| `proxy_request` | API proxied to external service | `endpoint`, `status`, `duration_ms`, `success` |
| `signup` | Account created (server-side backup) | `email`, `plan`, `source` |
| `login` | User authenticated (server-side) | `email` |
| `upgrade_clicked` | Upgrade attempted | `from_plan`, `to_plan` |
| `trial_started` | Trial period begins | `plan`, `source` |

### User Identification

After login/signup, users are identified in PostHog with:
- `id` - User's database ID
- `email` - User's email address
- `plan` - Current subscription plan

This allows tracking user journeys across sessions and devices.

### Analytics Utility Files

- **Client-side**: `frontend/src/lib/analytics.ts` - Use for browser events
- **Server-side**: `src/lib/analytics.ts` - Use for backend events

### Usage in Code

```typescript
// Client-side tracking
import { trackEvent, trackAppCreated } from '$lib/analytics';

// Simple event
trackEvent('custom_action', { detail: 'value' });

// Pre-built events
trackAppCreated({ appId: 'abc123', appName: 'My App' });

// Server-side tracking
import { trackProxyRequest, identifyServerUser } from '../lib/analytics.js';

trackProxyRequest({
  userId: 'user123',
  endpoint: 'openai',
  status: 200,
  durationMs: 450,
  success: true
});
```

### Development Mode

When no PostHog key is configured, analytics events are logged to the console instead:

```
[Analytics] (no key) signup { email: 'test@example.com', plan: 'FREE' }
```

This allows testing analytics integration without a real PostHog project.

## Security

- **AES-256-GCM Encryption**: All secrets are encrypted at rest
- **Per-User Salts**: Each user has a unique salt for encryption
- **JWT Authentication**: Secure token-based auth with configurable expiration
- **Rate Limiting**: Per-user and per-plan rate limits

## Tech Stack

- **Framework**: Hono (fast, minimal web framework)
- **Frontend**: SvelteKit with Tailwind CSS
- **Database**: SQLite (users, secrets, apps) + LMDB (app content)
- **Auth**: JWT + bcrypt password hashing
- **Encryption**: AES-256-GCM with PBKDF2 key derivation
- **Analytics**: PostHog

## Project Structure

```
onhyper/
├── src/                    # Backend (Hono server)
│   ├── index.ts           # Main entry point
│   ├── config.ts          # Configuration
│   ├── lib/               # Shared utilities
│   │   ├── analytics.ts   # Server-side PostHog
│   │   ├── db.ts          # SQLite database
│   │   ├── encryption.ts  # AES-256-GCM
│   │   ├── lmdb.ts        # App content storage
│   │   ├── secrets.ts     # Secret management
│   │   ├── usage.ts       # Usage tracking
│   │   └── users.ts       # User management
│   ├── middleware/        # Auth, rate limiting
│   └── routes/            # API endpoints
│       ├── apps.ts
│       ├── auth.ts
│       ├── dashboard.ts
│       ├── proxy.ts
│       ├── render.ts
│       └── secrets.ts
├── frontend/              # Frontend (SvelteKit)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── analytics.ts  # Client-side PostHog
│   │   │   ├── components/   # Reusable UI components
│   │   │   └── stores/       # Svelte stores
│   │   └── routes/           # Pages
│   └── vite.config.ts
├── data/                  # Database files (gitignored)
├── dist/                  # Compiled output
└── static/                # Static assets
```

## License

MIT
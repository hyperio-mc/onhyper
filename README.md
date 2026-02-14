# OnHyper.io - Secure Proxy Service for API-Backed Web Apps

OnHyper.io is a platform for publishing full-stack applications that require secure backend functionality. It enables developers to publish web apps that can safely call external APIs without exposing secrets to the browser.

## Features

- **Secure Secret Storage**: API keys are encrypted at rest with per-user salts
- **Proxy Service**: Call external APIs without exposing keys in browser code
- **App Publishing**: Create and publish HTML/CSS/JS apps
- **Usage Tracking**: Monitor API usage per app and endpoint

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# ONHYPER_JWT_SECRET - a secure random string for JWT signing
# ONHYPER_MASTER_KEY - 32 bytes hex for encryption

# Start development server
npm run dev
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

## Security

- **AES-256-GCM Encryption**: All secrets are encrypted at rest
- **Per-User Salts**: Each user has a unique salt for encryption
- **JWT Authentication**: Secure token-based auth with configurable expiration
- **Rate Limiting**: Per-user and per-plan rate limits

## Tech Stack

- **Framework**: Hono (fast, minimal web framework)
- **Database**: SQLite (users, secrets, apps) + LMDB (app content)
- **Auth**: JWT + bcrypt password hashing
- **Encryption**: AES-256-GCM with PBKDF2 key derivation

## License

MIT
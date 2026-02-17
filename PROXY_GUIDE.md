# OnHyper Proxy API Guide

## Overview

OnHyper provides a **secure proxy** that lets published apps call external APIs without exposing API keys in browser code. Never embed API keys in client-side JavaScript - always use the proxy.

## Endpoint Pattern

All proxy requests go through `/proxy/{provider}/{path}`:

```
https://onhyper.io/proxy/{provider}/{path}
```

## Authentication

Published apps authenticate using the `X-App-Slug` header:

```javascript
fetch('/proxy/scoutos/v2/collections/...', {
  headers: { 'X-App-Slug': window.ONHYPER.appSlug }
})
```

The `window.ONHYPER` object is automatically injected into all published apps with:
- `proxyBase`: '/proxy'
- `appSlug`: 'my-app-abc123'  
- `appId`: 'uuid'

## Available Endpoints

### ScoutOS (unified)
**Path**: `/proxy/scoutos/*`  
**Target**: `https://api.scoutos.com`  
**Auth**: Bearer token (handled by proxy)

| Service | Path Example |
|---------|--------------|
| Agents | `/proxy/scoutos/world/{agent_id}/_interact` |
| Tables | `/proxy/scoutos/v2/collections/{id}/rows` |
| Drive | `/proxy/scoutos/drive/download/{file_id}` |
| Workflows | `/proxy/scoutos/workflows/{id}/run` |
| Collections | `/proxy/scoutos/collections` |

### Other Providers

| Endpoint | Target |
|----------|--------|
| `/proxy/openai/*` | OpenAI API |
| `/proxy/anthropic/*` | Anthropic API |
| `/proxy/openrouter/*` | OpenRouter API |

## Self-API (OnHyper API)

The `/proxy/onhyper` endpoint allows your apps to call OnHyper's own API. This enables "builder apps" that can create and manage other apps programmatically.

### Enabling Self-API

1. Go to Settings in your OnHyper dashboard
2. Check "Enable OnHyper API access for my apps"
3. Your published apps can now call `/proxy/onhyper/api/...`

### Example: Create an App Programmatically

```javascript
const response = await fetch('/proxy/onhyper/api/apps', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Slug': window.ONHYPER.appSlug
  },
  body: JSON.stringify({
    name: 'My Generated App',
    html: '<h1>Hello World</h1>',
    css: 'body { font-family: sans-serif; }',
    js: 'console.log("Hello from generated app");'
  })
});
const app = await response.json();
```

### Use Case: AI App Builder

Combine with OpenRouter to build an AI-powered app builder:

```javascript
// 1. Ask AI to generate code
const aiResponse = await fetch('/proxy/openrouter/v1/chat/completions', {
  method: 'POST',
  headers: {
    'X-App-Slug': window.ONHYPER.appSlug,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4',
    messages: [{
      role: 'user',
      content: 'Create an HTML app that shows a countdown timer. Return JSON with html, css, js fields.'
    }]
  })
});

// 2. Parse AI response and create app
const aiResult = await aiResponse.json();
const code = JSON.parse(aiResult.choices[0].message.content);

const createResponse = await fetch('/proxy/onhyper/api/apps', {
  method: 'POST',
  headers: {
    'X-App-Slug': window.ONHYPER.appSlug,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Countdown Timer',
    ...code
  })
});
```

## Common Patterns

### ScoutOS Agent Chat (Streaming)

```javascript
const response = await fetch('/proxy/scoutos/world/AGENT_ID/_interact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'X-App-Slug': window.ONHYPER.appSlug
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: true
  })
});

// Read SSE stream
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process chunk...
}
```

### ScoutOS Tables Query

```javascript
const response = await fetch('/proxy/scoutos/v2/collections/COLLECTION_ID/rows', {
  headers: { 'X-App-Slug': window.ONHYPER.appSlug }
});
const rows = await response.json();
```

### OpenAI Chat

```javascript
const response = await fetch('/proxy/openai/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Slug': window.ONHYPER.appSlug
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});
```

## Security Requirements

**NEVER do this:**
```javascript
// ❌ WRONG - API key exposed in browser!
const client = new SomeClient({ apiKey: import.meta.env.VITE_API_KEY })
```

**ALWAYS do this:**
```javascript
// ✅ RIGHT - Proxy handles auth server-side
fetch('/proxy/provider/endpoint', {
  headers: { 'X-App-Slug': window.ONHYPER.appSlug }
})
```

Vite's `import.meta.env.*` values are baked into the client bundle at build time. Anyone can read them in DevTools.

## Adding Secrets

Users add their API keys in the OnHyper dashboard:
1. Go to Settings → Secrets
2. Add secret with name matching the provider (e.g., `SCOUT_API_KEY`)
3. The proxy automatically injects the key when calling that provider

## Error Responses

| Status | Meaning |
|--------|---------|
| 401 | No secret configured for this provider |
| 404 | Unknown proxy endpoint |
| 502 | Upstream API error |
| 504 | Request timeout (30s) |

## Questions?

For more details, see:
- OnHyper README: `/onhyper/README.md`
- Proxy source: `/onhyper/src/routes/proxy.ts`
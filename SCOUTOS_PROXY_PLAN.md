# ScoutOS Proxy Integration Plan

## Context

The pcrm.onhyper.io app exposed a ScoutOS API key because:
1. The app was built with Vite and `import.meta.env.VITE_SCOUT_KEY` got baked into the client bundle
2. OnHyper only proxies `scout-atoms` (Agents API) but not Scout Tables

## ScoutOS API Overview (from docs)

Based on the API docs, ScoutOS has multiple APIs:

| Endpoint Pattern | Purpose | Auth |
|-----------------|---------|------|
| `/world/{agent_id}/_interact` | Agent chat (streaming) | Bearer |
| `/world/{agent_id}/_interact_sync` | Agent chat (sync) | Bearer |
| `/agents` | CRUD for agents | Bearer |
| `/workflows` | CRUD for workflows | Bearer |
| `/workflows/{id}/run` | Execute workflow | Bearer |
| `/collections` | CRUD for collections | Bearer |
| `/tables` | CRUD for tables | Bearer |
| `/documents` | CRUD for documents | Bearer |
| `/v2/collections/{id}/rows` | Scout Tables row operations | Bearer |
| `/drive/upload` | Upload files | Bearer |
| `/drive/download/{id}` | Download files | Bearer |

**All use the same API key** - a single `secret_...` key authenticates all endpoints.

## Current OnHyper Config

```typescript
// config.ts
'scout-atoms': {
  target: 'https://api.scoutos.com',
  secretKey: 'SCOUT_API_KEY',
  description: 'Scout OS Agents API',
}
```

This only covers the root API. Apps using `/v2/collections/...` go direct.

## Proposal: Single ScoutOS Proxy Endpoint

Since all ScoutOS APIs share the same auth key, use a **single wildcard proxy**:

```typescript
'scoutos': {
  target: 'https://api.scoutos.com',
  secretKey: 'SCOUT_API_KEY',
  description: 'ScoutOS Platform API - Agents, Workflows, Tables, Drive',
}
```

This works because:
- The proxy passes through the full path: `/proxy/scoutos/v2/collections/...` → `https://api.scoutos.com/v2/collections/...`
- Same key works for all endpoints
- Stream support already built for SSE

### Migration Path

1. **Add `scoutos` endpoint** (new, catches all ScoutOS traffic)
2. **Keep `scout-atoms` for backwards compatibility** (deprecated but working)
3. **Update apps to use `/proxy/scoutos/...`** for any ScoutOS API call

## App Builder Security Guidelines

For apps published on OnHyper:

### ❌ WRONG - Never Do This

```javascript
// Vite/Vue/React env vars get BAKED INTO the client bundle!
const key = import.meta.env.VITE_SCOUT_KEY  // Anyone can read this in DevTools

// SDKs that take API keys expose them in browser
const client = new ScoutTablesClient({ apiKey: key })
```

### ✅ RIGHT - Proxy Pattern

```javascript
// Use OnHyper proxy with X-App-Slug header
const response = await fetch('/proxy/scoutos/v2/collections/col_xxx/rows', {
  method: 'GET',
  headers: {
    'X-App-Slug': window.ONHYPER.appSlug
  }
})

// Or for agent interactions
const response = await fetch('/proxy/scoutos/world/agent_id/_interact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Slug': window.ONHYPER.appSlug,
    'Accept': 'text/event-stream'  // For SSE streaming
  },
  body: JSON.stringify({ messages: [...] })
})
```

## Implementation Plan

### Phase 1: Add scoutos endpoint (5 min)
- Update `PROXY_ENDPOINTS` in `config.ts`
- Deploy to production

### Phase 2: Fix pcrm app
- Remove hardcoded key from source
- Update to use `/proxy/scoutos/...`
- Rebuild and redeploy

### Phase 3: Documentation
- Add proxy usage guide to agent-browser skill
- Document ScoutOS authentication pattern
- Create "Secure App Building" guide for dashboard

## Files to Change

```
onhyper/src/config.ts          - Add 'scoutos' endpoint
onhyper/src/routes/proxy.ts    - No changes needed (wildcard already works)
memory/2026-02-17.md           - Document lesson learned
```

## Testing

```bash
# Test scoutos endpoint
curl https://onhyper.io/proxy/scoutos/v2/collections \
  -H "X-App-Slug: pcrm"

# Test agent interaction with streaming
curl https://onhyper.io/proxy/scoutos/world/{agent_id}/_interact \
  -H "X-App-Slug: pcrm" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

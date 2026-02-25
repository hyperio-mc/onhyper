---
title: "hyper-micro: Deploy a Self-Serve Backend for Your Data to Any Service"
date: 2026-02-25
author: MC
tags: [hyper-micro, backend, deployment, data]
featured: false
---

Every app needs somewhere to put data. But setting up a database, configuring storage, managing auth — that's all friction before you write your first feature.

hyper-micro is a self-serve backend you can deploy anywhere in under a minute. It gives you a data API, file storage, and auth — no config, no schema, no DevOps required.

## One Backend, Any Cloud

The beauty of hyper-micro is where it runs: **everywhere.**

```bash
# Railway
railway up

# Render
render deploy

# Fly.io
fly launch

# Your own server
npm start
```

Same code. Same API. Different infrastructure. Your data backend isn't tied to a vendor — it's a Docker container you control.

## What You Get

### Data API (LMDB)

A key-value document store backed by LMDB — fast, ACID-compliant, zero configuration.

```bash
# Create a database
curl -X POST https://your-server/api/dbs/my-app

# Write a document
curl -X POST https://your-server/api/dbs/my-app/docs \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"key": "user-1", "value": {"name": "Ada", "email": "ada@example.com"}}'

# Read it back
curl https://your-server/api/dbs/my-app/docs/user-1 \
  -H "Authorization: Bearer YOUR_KEY"
```

No migrations. No schema definitions. Just store and retrieve JSON documents.

### Storage API (S3-Compatible)

Upload and serve files through a standard S3-compatible interface.

```bash
# Upload a file
curl -X PUT https://your-server/api/storage/avatars/user-1.png \
  -H "Authorization: Bearer YOUR_KEY" \
  --data-binary @avatar.png

# Serve it
curl https://your-server/api/storage/avatars/user-1.png
```

Images, videos, PDFs, JSON — whatever your app needs to store.

### Auth API

Manage API keys for your backend. Create, revoke, and rotate keys without redeploying.

```bash
# Create a new key
curl -X POST https://your-server/api/keys \
  -H "Authorization: Bearer ADMIN_KEY" \
  -d '{"name": "production", "permissions": ["read", "write"]}'
```

## Why Self-Serve?

Backend-as-a-Service platforms (Firebase, Supabase) are great until they're not:

- **Pricing cliffs** — free tier ends, bill spikes
- **Vendor lock-in** — your data lives in their proprietary format
- **Limited regions** — your users are far from their data centers
- **Opaque infrastructure** — when something breaks, you wait

hyper-micro is different because you own it:

- **Your infrastructure** — deploy to Railway, Render, Fly, DigitalOcean, or bare metal
- **Your data** — JSON documents in LMDB, files on your disk
- **Your pricing** — whatever your host charges, nothing more
- **Your control** — full visibility into logs, metrics, internals

## The 60-Second Deploy

```bash
# Clone
git clone https://github.com/hyperio-mc/hyper-micro
cd hyper-micro

# Configure
echo "API_KEY=your-secret-key" > .env

# Deploy (pick one)
railway up          # Railway
fly launch          # Fly.io
render deploy       # Render

# Or run locally
npm install && npm start
```

Add a persistent volume to survive restarts, and you have a production-ready data backend.

## Use Cases

### Multi-Tenant SaaS

Each customer gets their own database bucket. Isolation without managing separate database instances.

```bash
# Customer A's data
POST /api/dbs/customer-a/docs

# Customer B's data
POST /api/dbs/customer-b/docs
```

### AI Agent Memory

Agents need persistent storage for conversation history, learned patterns, and intermediate results. hyper-micro gives them a place to remember.

```javascript
// Store agent memory
await fetch('/api/dbs/agent-memory/docs', {
  method: 'POST',
  body: JSON.stringify({
    key: 'session-123',
    value: { history: [...], context: {...} }
  })
});
```

### Mobile App Backend

Ship iOS and Android apps without writing backend code. The API is simple enough to call directly from mobile clients.

### Rapid Prototyping

Spin up a backend in 60 seconds, iterate on your frontend, ship fast. When you need something more complex, migrate to Postgres or your preferred stack.

### Edge Deployments

Because hyper-micro is just Node.js and a data directory, it runs anywhere — including edge environments that support persistent storage.

## What About Postgres?

Postgres is the right answer for complex data. Joins, aggregations, full-text search, extensions — Postgres has it all.

But most apps don't need it. A todo list, a blog, a chat app, an agent memory store — these fit naturally in key-value documents. You can always migrate later when complexity demands it.

Start simple. Add complexity when you need it. hyper-micro is the simple starting point.

## Pricing Is Your Host's Pricing

We don't host hyper-micro. You do.

- Railway free tier: 512MB RAM, 1GB disk — runs hyper-micro fine
- Render free tier: similar specs
- Fly.io free tier: 3 shared-cpu VMs

For hobby projects, you're paying nothing. For production, you're paying for the infrastructure you choose, at the prices that provider sets. No markup. No surprise bill.

## Getting Started

1. **Clone the repo**: `git clone https://github.com/hyperio-mc/hyper-micro`
2. **Set your API key**: `echo "API_KEY=your-secret" > .env`
3. **Deploy**: `railway up` (or your preferred host)
4. **Add a volume**: Attach persistent storage for data survival
5. **Start building**: Call the API from your app

That's it. No signup. No credit card. No platform lock-in.

Your data. Your backend. Your cloud.

---

**Ready to deploy your own data backend?**

Fork [hyper-micro on GitHub](https://github.com/hyperio-mc/hyper-micro) and ship it to your preferred infrastructure in under a minute.

Questions? Find us [@hyperio_mc](https://x.com/hyperio_mc)
---
title: "hyper-micro: Your Own Personal Backend"
date: 2026-02-21
author: MC
tags: [hyper-micro, backend, tutorial]
featured: false
---

Building an app usually means spinning up a database, configuring storage, setting up authentication, and wiring it all together. That's before you write a single line of your actual application code.

hyper-micro flips that. It's a self-serve backend that gives you LMDB for data and S3-compatible storage in under 60 seconds.

## The Problem

Every app needs three things: somewhere to store data, somewhere to store files, and a way to secure it all. But setting up databases, configuring object storage, and building auth systems is boilerplate that has nothing to do with your product.

You have two options today:
1. Use a BaaS (Firebase, Supabase, Appwrite) — great until you hit pricing limits or need full control
2. Roll your own — powerful but now you're a DevOps engineer

We wanted a third option: a minimal, self-hosted backend that just works.

## What is hyper-micro?

hyper-micro is a tiny Node.js server that exposes three APIs:

- **Data API** — LMDB-backed key-value document store with full CRUD
- **Storage API** — S3-compatible file storage for images, videos, PDFs
- **Auth API** — API key management

That's it. No migrations, no schema definitions, no configuration files.

```bash
# Create a database
curl -X POST https://your-server/api/dbs/todos

# Add a document
curl -X POST https://your-server/api/dbs/todos/docs \
  -H "Authorization: Bearer your-key" \
  -d '{"key": "todo-1", "value": {"title": "Ship blog post"}}'

# Upload a file
curl -X PUT https://your-server/api/storage/avatars/user-123.png \
  -H "Authorization: Bearer your-key" \
  --data-binary @avatar.png
```

Everything persists to local disk. Deploy with a persistent volume and your data survives restarts.

## Why LMDB?

LMDB is a memory-mapped key-value database. It's fast (reads are memory-mapped, no cache layer), ACID-compliant, and requires zero tuning. No connection pools, no query planning, no configuration.

For most apps, LMDB is everything PostgreSQL is — but simpler. If you need joins, aggregations, or complex queries, add Postgres later. For the 80% of data that doesn't need it, LMDB is perfect.

## The OnHyper Connection

Here's where it gets interesting. When you build an app on OnHyper, you can use hyper-micro as your backend:

1. **Deploy hyper-micro** on Railway, Render, or Fly.io (or self-host)
2. **Connect your app** to your hyper-micro endpoints
3. **Your users get** a real backend without you building one

Your app is the interface. hyper-micro is the engine. Users can bring their own hyper-micro instance, or you can provision one for them.

Think of it as "BYODB" — Bring Your Own Database.

## Use Cases

- **Multi-tenant SaaS** — Each tenant gets their own database bucket
- **Mobile apps** — Backend for iOS/Android apps without managing servers
- **AI agents** — Persistent memory and file storage for autonomous systems
- **Prototyping** — Spin up a backend in seconds, iterate fast
- **Edge deployments** — Runs anywhere Node.js runs

## Getting Started

```bash
# Clone and deploy
git clone https://github.com/hyperio-mc/hyper-micro
cd hyper-micro
railway up

# Or run locally
npm install
npm run dev
```

Set your API key, add a persistent volume, and you're live.

## What's Next

We're building adapters to make hyper-micro work with popular tools. Next up: a Retool connector so you can build internal tools on top of hyper-micro data.

Ship your own backend at [hyper-micro on GitHub](https://github.com/hyperio-mc/hyper-micro)

Questions? Reach out @hyperio_mc

# OnHyper Adapter Ecosystem Proposal

## Executive Summary

**Opportunity**: OnHyper can leverage the hyper63 Service Framework's ports-and-adapters architecture to create a unified, vendor-agnostic backend services API for Railway deployments. This would allow developers to write application code once and swap underlying services (databases, caches, storage, queues, search) without code changes—aligning perfectly with Railway's multi-service ecosystem.

**Key Insight**: Hyper63's "Clean Cloud Architecture" pattern solves a critical pain point: vendor lock-in and infrastructure complexity. By implementing the Hyper API pattern on Railway, OnHyper can offer Railway users the same benefits while creating a differentiated, valuable service.

---

## Hyper API Overview

### What is hyper63/hyper?

hyper63/hyper is an open-source service framework that implements the **Ports and Adapters** (Hexagonal Architecture) pattern to provide a unified, consistent API for common cloud services:

| Service Port | Purpose | API Pattern |
|-------------|---------|-------------|
| **Data** | Document/document database operations | CRUD + queries on JSON documents |
| **Cache** | Key-value caching | GET/SET/DELETE with TTL |
| **Storage** | File/object storage | Upload/download/delete objects |
| **Search** | Full-text search | Index documents + search queries |
| **Queue** | Message queuing | Enqueue/dequeue messages |

### Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DRIVING ADAPTERS (Apps)                     │
│          REST API • GraphQL • CLI • Future: gRPC                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                         HYPER CORE                               │
│          Business Logic + Port Enforcement (Zod Validation)     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                           PORTS                                  │
│      Data Port • Cache Port • Storage Port • Search Port        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      DRIVEN ADAPTERS                             │
│   MongoDB • CouchDB • Redis • S3/Minio • Elasticsearch • Etc.   │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Ports** define the interface specification (what methods exist, what they accept, what they return)
2. **Adapters** implement the port for a specific backend service
3. **Core** validates adapter compliance using Zod schemas
4. **Apps** expose the unified API (REST, GraphQL, etc.)

### Example Configuration

```javascript
import express from '@hyper63/app-express'
import couchdb from '@hyper63/adapter-couchdb'
import redis from '@hyper63/adapter-redis'
import minio from '@hyper63/adapter-minio'
import es from '@hyper63/adapter-elasticsearch'

export default {
  app: express,
  adapters: [
    { port: 'data', plugins: [couchdb({ url: COUCHDB_URL })] },
    { port: 'cache', plugins: [redis({ url: REDIS_URL })] },
    { port: 'storage', plugins: [minio({ url: MINIO_URL })] },
    { port: 'search', plugins: [es({ url: ELASTICSEARCH_URL })] },
  ],
}
```

### Existing Adapters in the Ecosystem

**Data Port Adapters:**
- MongoDB (`hyper-adapter-mongodb`)
- CouchDB (`hyper-adapter-couchdb`)
- PouchDB (`hyper-adapter-pouchdb`)
- DnDB (in-memory)

**Cache Port Adapters:**
- Redis (`hyper-adapter-redis`)
- SQLite (`hyper-adapter-sqlite`)

**Storage Port Adapters:**
- AWS S3 (`hyper-adapter-s3`, `hyper-adapter-namespaced-s3`)
- MinIO (`hyper-adapter-minio`)
- File System (`hyper-adapter-fs`)

**Search Port Adapters:**
- Elasticsearch (`hyper-adapter-elasticsearch`)
- Minisearch (`hyper-adapter-minisearch`)

**Queue Port Adapters:**
- BullMQ (`hyper-adapter-bullmq`)
- AWS SQS (`hyper-adapter-sqs`)
- In-memory SQLite queue (`hyper-adapter-queue`)

---

## Railway Capability Assessment

### Storage Options on Railway

| Storage Type | Railway Offering | Hyper Port Alignment |
|-------------|------------------|---------------------|
| **Databases** | PostgreSQL, MySQL, MongoDB, Redis (templates) + any Docker image | Data Port, Cache Port |
| **Volumes** | Persistent block storage (attached to services) | File-based Storage Port |
| **Storage Buckets** | S3-compatible object storage (via Tigris) | Storage Port |

### Key Railway Database Features

1. **Templates**: Pre-configured PostgreSQL, MySQL, Redis, MongoDB
2. **Custom Builds**: Deploy any database via Docker
3. **Volumes**: Persistent storage that survives restarts
4. **Private Networking**: Secure inter-service communication
5. **TCP Proxy**: External database access
6. **Backups**: Point-in-time recovery (for volumes)

### Railway Storage Buckets Details

- **S3-compatible API** (works with any S3 client)
- **Private by default** (presigned URLs for public access)
- **Pricing**: $0.015/GB-month (competitive with R2, cheaper than S3)
- **Free egress and API operations**
- **Automatic environment isolation** (each env gets its own bucket)

### Constraints

1. **No native adapter/plugin system** - Railway doesn't have a built-in abstraction layer for databases
2. **Unmanaged databases** - Users handle backups, tuning, security
3. **No built-in message queues** - Would need Redis or external service
4. **No built-in search service** - Would need Elasticsearch, Meilisearch, etc.

### Gap Analysis

| Need | Railway Native? | Hyper Solution |
|------|----------------|----------------|
| Database abstraction | ❌ | Data Port adapters |
| Cache abstraction | ❌ | Cache Port adapters |
| Object storage abstraction | ❌ | Storage Port adapters |
| Search abstraction | ❌ | Search Port adapters |
| Queue abstraction | ❌ | Queue Port adapters |
| Unified API | ❌ | Hyper Core + REST/GraphQL |

---

## Render Comparison

Render offers similar infrastructure capabilities to Railway:

### Render Storage Options

| Storage Type | Render Offering | Hyper Port Alignment |
|-------------|------------------|---------------------|
| **Databases** | PostgreSQL, Redis, MongoDB (marketplace) | Data Port, Cache Port |
| **Persistent Disks** | NFS-style persistent storage | File-based Storage Port |
| **Object Storage** | Not native (use S3/R2) | Storage Port |
| **Key-Value** | Redis (managed) | Cache Port |

### Key Differences

| Feature | Railway | Render |
|---------|---------|--------|
| **PostgreSQL** | ✅ | ✅ |
| **Redis** | ✅ | ✅ |
| **Persistent Disks** | ✅ | ✅ |
| **S3 Storage** | ✅ (Tigris) | ❌ (use R2/S3) |
| **Docker** | ✅ | ✅ |
| **Free Tier** | 1GB disk, $5 credit | Limited |
| **Volumes** | Native | Disk-based |
| **DX** | Simpler | More opinionated |

### Recommendation

**Railway is preferred** for the initial implementation due to:
- Better volume/disk support
- S3-compatible storage (Tigris) built-in
- More generous free tier
- Simpler DX for Docker deployments

Render could be added as a second adapter target in Q2-Q3.

---

## Simpler Approach: hyper-nano

Instead of deploying the full Hyper service framework, consider deploying **hyper-nano** - the lightweight local-first version of hyper63 designed for development and edge cases.

### What is hyper-nano?

hyper-nano is a minimal implementation of the Hyper ports pattern:
- Single binary (~20MB)
- Embedded SQLite for data/cache
- File-based storage
- Perfect for development and prototyping

### Implementation Options

1. **Deploy hyper-nano as a Railway service**
   - Use SQLite volume for persistence
   - Zero config deployment
   - Works offline

2. **OnHyper + hyper-nano combo**
   - OnHyper handles app hosting + proxy
   - hyper-nano handles data/cache needs
   - Great for simple apps

3. **Full Hyper deployment (later)**
   - When needing PostgreSQL, Redis, etc.
   - Swap adapters without code changes

### hyper-nano on Railway

```yaml
# railway.json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfile": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

```dockerfile
# Dockerfile
FROM ghcr.io/hyper63/hyper-nano:latest
PORT 8080
```

### Value Proposition

This approach is simpler to start:
- ✅ Zero infrastructure setup
- ✅ Works immediately
- ✅ Can upgrade to full Hyper later
- ✅ Perfect for prototyping

---

## Product Proposal

### Concept: OnHyper Adapter Service

**OnHyper** would act as a unified API gateway that implements the Hyper service pattern, sitting between Railway services and user applications.

```
┌──────────────┐      ┌──────────────┐      ┌──────────────────┐
│    Your      │─────▶│   OnHyper    │─────▶│ Railway Services │
│     App      │      │   Gateway    │      │  (PG, Redis, S3) │
└──────────────┘      └──────────────┘      └──────────────────┘
     Code once           Swap adapters          Scale independently
```

### Value Proposition

**For Developers:**
- **Write once, swap anytime**: Change from PostgreSQL to MongoDB without code changes
- **Unified API**: Learn one API for data, cache, storage, search, queue
- **Local development**: Use hyper-nano locally, swap to real services in production
- **Reduced lock-in**: Not tied to any specific service provider

**For Teams:**
- **Clean Architecture enforcement**: Separates business logic from infrastructure
- **Easier testing**: Mock adapters for unit tests
- **Gradual scaling**: Start simple (SQLite), scale to production (Redis cluster)
- **Environment parity**: Same API across dev/staging/prod

**For Railway Users:**
- **Simplified service composition**: One API instead of 5 different SDKs
- **Easy A/B testing**: Compare database performance by swapping adapters
- **Migration path**: Move between services without refactoring

### Implementation Approach

#### Phase 1: Core Gateway Service

Deploy a Hyper service instance on Railway with Railway-native adapters:

```javascript
// OnHyper Railway Configuration
import express from '@hyper63/app-express'
import { postgresAdapter } from './adapters/postgres-railway'
import { redisAdapter } from './adapters/redis-railway'
import { railwayBucketAdapter } from './adapters/railway-bucket'

export default {
  app: express,
  adapters: [
    { port: 'data', plugins: [postgresAdapter()] },
    { port: 'cache', plugins: [redisAdapter()] },
    { port: 'storage', plugins: [railwayBucketAdapter()] },
  ],
}
```

#### Phase 2: Railway-Specific Adapters

Create first-class adapters for Railway's offerings:

| Adapter | Backend | Value |
|---------|---------|-------|
| `hyper-adapter-railway-pg` | Railway PostgreSQL | Data Port |
| `hyper-adapter-railway-mongodb` | Railway MongoDB | Data Port |
| `hyper-adapter-railway-redis` | Railway Redis | Cache Port |
| `hyper-adapter-railway-bucket` | Railway Storage Buckets | Storage Port |

#### Phase 3: Multi-Cloud Adapters

Extend to other popular services Railway users might connect to:

- Supabase adapters
- PlanetScale adapters
- Upstash adapters
- External S3/Cloudflare R2 adapters

### Revenue Model

1. **Hosted OnHyper Gateway**
   - Free tier: 1M requests/month
   - Pro tier: $29/month + usage
   - Enterprise: Custom SLA

2. **Adapter Marketplace**
   - Community adapters: Free
   - Premium adapters (enterprise backends): Paid

3. **Developer Tools**
   - CLI for local development (hyper-nano wrapper)
   - VS Code extension
   - Dashboard for adapter management

---

## Potential Roadmap

### Phase 0: hyper-nano (Quick Win)
- [ ] Deploy hyper-nano to Railway with SQLite volume
- [ ] Document as "OnHyper Data" add-on
- [ ] Test with simple app use cases

### Q1 2026: Foundation
- [ ] Deploy baseline Hyper service on Railway
- [ ] Implement Railway PostgreSQL adapter (Data Port)
- [ ] Implement Railway Redis adapter (Cache Port)
- [ ] Implement Railway Storage Bucket adapter (Storage Port)
- [ ] Basic documentation and quickstart guide

### Q2 2026: Expansion
- [ ] Implement Railway MongoDB adapter (Data Port)
- [ ] Implement Search Port (Meilisearch template adapter)
- [ ] Implement Queue Port (BullMQ/Redis adapter)
- [ ] Client SDKs (Node.js, Python)
- [ ] Dashboard MVP

### Q3 2026: Marketplace
- [ ] Adapter marketplace UI
- [ ] Community adapter submission process
- [ ] Premium adapter offerings
- [ ] Multi-region support

### Q4 2026: Enterprise
- [ ] SSO/SAML integration
- [ ] Audit logging
- [ ] Advanced routing (read replicas, sharding)
- [ ] SLA guarantees
- [ ] On-premise option

### Future Considerations
- [ ] GraphQL App support
- [ ] Realtime/WebSocket subscriptions
- [ ] Edge deployment (Cloudflare Workers)
- [ ] AI-assisted adapter configuration

---

## Technical Architecture

### Service Components

```
┌────────────────────────────────────────────────────────────────┐
│                        OnHyper Service                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  REST API   │  │ GraphQL API │  │ Management Dashboard    │ │
│  │  (Express)  │  │  (Future)   │  │     (Web UI)            │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
│         │                │                      │              │
│         └────────────────┼──────────────────────┘              │
│                          │                                     │
│                   ┌──────▼──────┐                              │
│                   │  Hyper Core │                              │
│                   │  + Ports    │                              │
│                   └──────┬──────┘                              │
│                          │                                     │
│  ┌───────────────────────┼───────────────────────┐             │
│  │                       │                       │             │
│  ▼                       ▼                       ▼             │
│ ┌────────┐         ┌──────────┐           ┌──────────┐         │
│ │  Data  │         │  Cache   │           │ Storage  │         │
│ │  Port  │         │  Port    │           │  Port    │         │
│ └───┬────┘         └────┬─────┘           └────┬─────┘         │
│     │                   │                      │               │
└─────┼───────────────────┼──────────────────────┼───────────────┘
      │                   │                      │
      ▼                   ▼                      ▼
┌──────────┐       ┌──────────┐          ┌──────────────┐
│PostgreSQL│       │  Redis   │          │Railway Bucket│
│(Railway) │       │(Railway) │          │   (S3 API)   │
└──────────┘       └──────────┘          └──────────────┘
```

### Environment Variable Convention

```bash
# OnHyper Configuration
ONHYPER_DOMAIN=myapp.onhyper.io
ONHYPER_SECRET=xxx

# Data Port (PostgreSQL)
DATA_ADAPTER=postgres
POSTGRES_URL=${{Postgres.DATABASE_URL}}

# Cache Port (Redis)
CACHE_ADAPTER=redis
REDIS_URL=${{Redis.REDIS_URL}}

# Storage Port (Railway Bucket)
STORAGE_ADAPTER=railway-bucket
S3_ENDPOINT=${{Bucket.ENDPOINT}}
S3_ACCESS_KEY=${{Bucket.ACCESS_KEY_ID}}
S3_SECRET_KEY=${{Bucket.SECRET_ACCESS_KEY}}
S3_BUCKET=${{Bucket.BUCKET}}
```

---

## Competitive Landscape

| Solution | Vendor Lock-in | Unified API | Swappable Backends | Open Source |
|----------|---------------|-------------|-------------------|-------------|
| **OnHyper** | ✅ No | ✅ Yes | ✅ Yes | ✅ Core + Adapters |
| Firebase | ❌ Yes | ✅ Yes | ❌ No | ❌ No |
| Supabase | ⚠️ Partial | ✅ Yes | ❌ Limited | ✅ Yes |
| Appwrite | ⚠️ Partial | ✅ Yes | ❌ No | ✅ Yes |
| Direct SDKs | ✅ No | ❌ No | ❌ No | Varies |

### OnHyper Differentiation

1. **True abstraction**: Not tied to any backend
2. **Railway-native**: First-class Railway integration
3. **Extensible**: Community can build adapters
4. **Clean Architecture**: Enforced separation of concerns
5. **Local-first**: hyper-nano for development

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hyper63 project abandonment | Medium | High | Fork and maintain; build internal expertise |
| Performance overhead | Low | Medium | Optimize adapter implementations; caching |
| API compatibility issues | Low | Medium | Semantic versioning; adapter versioning |
| Competition from Railway native | Low | High | Focus on cross-cloud value; ecosystem |
| Developer adoption friction | Medium | Medium | Excellent docs; Quickstarts; SDKs |

---

## Conclusion

The hyper63 Service Framework's ports-and-adapters architecture is a perfect match for Railway's infrastructure-as-a-service model. By implementing OnHyper as a unified API gateway with Railway-specific adapters, we can:

1. **Reduce developer friction** - One API instead of five different SDKs
2. **Enable service flexibility** - Swap databases without refactoring
3. **Create a defensible business** - Adapter ecosystem + network effects
4. **Add value to Railway** - Make Railway more attractive for Clean Architecture teams

The core technology is proven (hyper63 has been in development since 2021), the market timing is right (Railway is growing rapidly), and the differentiation is clear (no other BaaS offers true swappable backends).

**Recommendation**: Proceed with Phase 1 implementation, starting with the Data, Cache, and Storage ports with Railway-native adapters.
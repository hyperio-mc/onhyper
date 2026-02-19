# Research: Can Hyper-Nano Be Made Multi-Tenant?

**Date**: 2026-02-19  
**Question**: Can we run a single hyper-nano instance that provides isolated "sandboxes" for each app/user?

## Executive Summary

**Yes, technically feasible** — but with important caveats. Hyper-nano's domain-based architecture provides natural isolation points, but the current implementation is designed for single-domain use. Making it multi-tenant would require modifications to the core routing layer or running multiple instances per tenant.

**Recommendation**: For OnHyper's use case, **run one hyper-nano instance per app/customer** rather than building multi-tenant support into a single instance. This provides better isolation, simpler operations, and aligns with hyper's intended design patterns.

---

## 1. Hyper-Nano Architecture Overview

### How Hyper Stores Data

Hyper-nano uses a **Ports and Adapters** architecture (hexagonal/clean architecture):

| Service | Port | Adapter | Storage Location |
|---------|------|---------|------------------|
| **data** | Data Port | In-Memory MongoDB / PouchDB | `__hyper__/data/{domain}/` |
| **cache** | Cache Port | SQLite | `__hyper__/cache/{domain}/` |
| **storage** | Storage Port | File System | `__hyper__/storage/{domain}/` |
| **search** | Search Port | SQLite + Minisearch | `__hyper__/search/{domain}/` |
| **queue** | Queue Port | SQLite + in-memory | `__hyper__/queue/{domain}/` |

All data lives in a `__hyper__` directory created in the current working directory.

### Domain Concept (Key to Isolation)

Hyper uses **domains** as the primary isolation unit:

```javascript
// Connection string always includes a domain
const hyper = connect(`http://127.0.0.1:6363/test`);  // "test" domain
const hyper = connect(`http://127.0.0.1:6363/foo-app`);  // "foo-app" domain
```

From the docs:
> "A Domain is simply a logical grouping of hyper Services hosted on a hyper Server. hyper Domains are commonly used to distinguish a set of hyper Services leveraged by an application."

This is already a multi-tenant pattern at the application level!

---

## 2. Can We Add Namespace/Tenant Isolation?

### Current State: Single-Domain Focus

Hyper-nano's current CLI and bootstrap mechanisms:

```bash
# One domain at a time
./nano --experimental --data --cache --domain=foo-app
./nano --experimental --data --cache --domain=bar-app  # Would need separate instance
```

The `--domain` flag creates services under ONE domain. No built-in support for multiple domains in a single instance.

### The Routing Layer Challenge

In Hyper Cloud (the hosted version), the core router:
1. Extracts the domain from the connection string
2. Routes requests to the appropriate service instance
3. Each domain gets isolated storage/compute

In hyper-nano, this routing is simplified — it's designed for single-domain development workflows.

### What Would Multi-Tenant Hyper-Nano Look Like?

**Option A: Modify Core Router**
- Fork hyper-nano to support multiple domains in one instance
- Add domain-based routing middleware
- Modify adapters to namespace storage per domain

```javascript
// Hypothetical multi-domain config
await main({
  domains: ["app1", "app2", "app3"],
  experimental: true,
  services: { data: true, cache: true, storage: true }
});
```

**Option B: Virtual Domain Layer**
- Add a middleware layer that maps `X-Tenant-ID` headers to domains
- Automatically create domains on first request
- More complex, introduces auth concerns

---

## 3. Multi-Tenant Architecture Patterns (Industry Standard)

### Three Isolation Models

| Model | Isolation Level | Cost | Complexity | Best For |
|-------|----------------|------|------------|----------|
| **Pool (Row-level)** | Low | $ | Low | SaaS with many small tenants |
| **Bridge (Schema-per-tenant)** | Medium | $$ | Medium | Enterprise SaaS with customization |
| **Silo (DB-per-tenant)** | High | $$$ | High | Regulated industries, enterprise |

### Where Hyper-Nano Fits

Hyper-nano naturally aligns with the **Silo model**:
- Each domain = separate storage namespace
- Strong isolation (no cross-tenant queries possible)
- Simple mental model

This is **good for OnHyper** because each customer gets complete isolation.

---

## 4. Alternative: Rebuild with Modern Tech

### Why Consider This?

| Factor | Hyper-Nano | Modern Alternative |
|--------|------------|-------------------|
| Runtime | Deno (compiled binary) | Bun (faster startup) or Deno 2.0 |
| Architecture | Clean (Ports/Adapters) | Clean or simpler layers |
| Multi-tenant | Not designed for it | Built-in from day one |
| Maintenance | Relies on hyper63 team | Full control |

### What This Would Look Like

```typescript
// Hypothetical Bun-based multi-tenant service
import { serve } from "bun";

const tenants = new Map<string, TenantServices>();

serve({
  port: 6363,
  async fetch(req) {
    const tenantId = req.headers.get("X-Tenant-ID");
    const tenant = tenants.get(tenantId) ?? createTenant(tenantId);
    return routeToService(tenant, req);
  }
});

function createTenant(id: string) {
  return {
    data: new SQLite(`./tenants/${id}/data.db`),
    cache: new SQLite(`./tenants/${id}/cache.db`),
    storage: new FileSystem(`./tenants/${id}/storage/`),
    search: new MiniSearch()
  };
}
```

**Pros**: Full control, custom multi-tenant support, potentially faster  
**Cons**: Significant development effort, lose hyper ecosystem benefits

---

## 5. Tradeoffs: One Instance vs Per-App Instances

### Single Instance (Multi-Tenant)

| Aspect | Assessment |
|--------|------------|
| **Resource Efficiency** | ✅ Better - shared process, memory pooling |
| **Operational Simplicity** | ❌ Worse - one process to manage, but complex config |
| **Isolation** | ⚠️ Moderate - depends on implementation quality |
| **Scalability** | ❌ Vertical only (single process limit) |
| **Blast Radius** | ❌ Higher - one crash affects all tenants |
| **Development Effort** | ❌ High - need to modify hyper-nano or build custom |

### Per-App Instances

| Aspect | Assessment |
|--------|------------|
| **Resource Efficiency** | ⚠️ Moderate - each instance has overhead |
| **Operational Simplicity** | ✅ Simple - standard hyper-nano deployment |
| **Isolation** | ✅ Strong - complete separation |
| **Scalability** | ✅ Horizontal - can spread across machines |
| **Blast Radius** | ✅ Low - one tenant failure doesn't affect others |
| **Development Effort** | ✅ None - use hyper-nano as-is |

---

## 6. Recommendation

### For OnHyper: **Per-App Instances**

**Why:**

1. **Matches hyper's design intent** - Domains are meant for application-level isolation, running separate instances is the expected pattern

2. **Strong isolation** - Each customer gets completely separate data/cache/storage/search with zero risk of cross-tenant issues

3. **Simpler operations** - Use hyper-nano as documented, no custom code to maintain

4. **Horizontal scalability** - Can spread customer instances across machines as needed

5. **Lower risk** - No need to modify core hyper-nano, which could break when hyper63 releases updates

### Implementation Pattern

```
OnHyper Platform
├── Customer A
│   └── hyper-nano instance (port 6363, domain: "customer-a")
├── Customer B
│   └── hyper-nano instance (port 6364, domain: "customer-b")
└── Customer C
    └── hyper-nano instance (port 6365, domain: "customer-c")
```

Each instance is:
- Isolated at the process level
- Using its own `__hyper__` directory
- Managing its own ports/connection strings
- Independently restartable

### When to Consider Multi-Tenant Alternative

Consider building a custom multi-tenant solution if:
- You have **100+ customers** and resource overhead becomes significant
- You need **real-time cross-tenant analytics**
- You're willing to **maintain a fork** of hyper-nano
- You have **strict cost constraints** that justify the development investment

---

## 7. Research Sources

- [Hyper Nano Documentation](https://docs.hyper.io/docs/build/hyper-nano.html)
- [Introducing Hyper Nano - Blog](https://blog.hyper.io/introducing-hyper-nano-hyper-cloud-in-a-bottle/)
- [Clean Cloud Architecture - Hyper](https://docs.hyper.io/docs/concepts/clean-cloud-architecture.html)
- [AWS Multi-Tenant Architecture Guidance](https://aws.amazon.com/solutions/guidance/multi-tenant-architectures-on-aws/)
- [Data Isolation and Sharding Architectures for Multi-Tenant Systems](https://medium.com/@justhamade/data-isolation-and-sharding-architectures-for-multi-tenant-systems-20584ae2bc31)
- [Hyper63 GitHub Repository](https://github.com/hyper63/hyper)

---

## Appendix: Quick Start for Per-App Pattern

```bash
# For each customer, run:
curl https://hyperland.s3.amazonaws.com/hyper -o nano-customer-{id}
chmod +x nano-customer-{id}
PORT={base_port + customer_index} ./nano-customer-{id} \
  --experimental \
  --data --cache --storage \
  --domain={customer-id}
```

Each customer's app connects to their dedicated instance:
```javascript
const hyper = connect(`http://127.0.0.1:${customerPort}/${customerId}`);
```

This pattern scales horizontally and requires zero modifications to hyper-nano.
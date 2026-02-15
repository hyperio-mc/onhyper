# OnHyper Auth Storage Evaluation: SQLite vs ScoutOS/hyper.io

**Date**: 2026-02-15  
**Status**: Decision Required  
**Decision Maker**: Rakis

---

## Executive Summary

**Recommendation: DO NOT MIGRATE**

After thorough research, I recommend **keeping SQLite with better-sqlite3** for OnHyper's user management, sessions, and API key storage. The proposed migration to "ScoutOS Atoms" is based on a misunderstanding—ScoutOS (scoutos.com) is an AI workflow platform, not a key-value storage service. 

The relevant option would be hyper.io (Tom Wilson's service framework), which does offer data storage—but the tradeoffs don't favor migration for OnHyper's use case.

---

## Clarification: What is "ScoutOS Atoms"?

After research, there are **two separate services** involved:

### 1. ScoutOS (scoutos.com) - AI Workflow Platform
- **Purpose**: Building AI workflows, agents, and RAG applications
- **Core primitives**: Workflows, Agents, Databases (vector-enabled)
- **Use case**: AI inference, document search, chatbots
- **NOT designed for**: User auth, session storage, API key management
- **Pricing**: Free tier (50 invocations/month, 1GB), Scale (custom)

The `/atoms` endpoint in OnHyper's PRD (`api.scoutos.com/atoms`) appears to be an **AI inference endpoint**, not a data storage service.

### 2. hyper.io - Service Framework
- **Founder**: Tom Wilson (same person as ScoutOS)
- **Purpose**: Backend services for applications
- **Services**:
  - Data Service: JSON document storage (MongoDB-style queries)
  - Cache Service: Key-value with TTL
  - Storage Service: File/object storage
  - Queue Service: Job queues
  - Search Service: Full-text search
- **Pricing**:
  - Starter: Free (3 apps, basic limits)
  - Pro: $99/mo (10 apps, 5 users)
  - Business: $949/mo (20 apps, 15 users)
  - Enterprise: Custom

---

## Decision Criteria Analysis

### 1. Simplicity vs Complexity

| Aspect | Current (SQLite) | hyper.io |
|--------|------------------|----------|
| **Setup** | Single file, no external deps | API key, network config |
| **Debugging** | Local file inspection | Remote API calls, logs |
| **Migrations** | Direct SQL migrations | Schemaless (flexible but requires app logic) |
| **Offline dev** | Works offline | Requires network |
| **Dependencies** | `better-sqlite3` (native) | `hyper-connect` SDK |

**Winner: SQLite** - Simpler architecture, fewer moving parts, better DX for auth flows.

---

### 2. Cost

| Plan | SQLite (Railway) | hyper.io |
|------|------------------|----------|
| **Free/MVP** | $0-5/mo (Railway free tier) | $0 (3 apps, basic limits) |
| **Production** | ~$5/mo (1GB disk) | $99/mo (Pro) |
| **Scale** | ~$20/mo (5GB disk) | $949/mo (Business) |

**Notes**:
- SQLite storage cost: ~$0.20/GB/month on Railway
- hyper.io's "Starter" tier has unadvertised limits
- For 1000 users with 10KB each: ~10MB storage (negligible for both)

**Winner: SQLite** - Significantly cheaper at scale. hyper.io pricing is optimized for agencies/enterprises, not individual SaaS products.

---

### 3. Reliability and Latency

| Metric | SQLite | hyper.io |
|--------|--------|----------|
| **Latency (read)** | <1ms (local) | 50-200ms (API) |
| **Latency (write)** | <1ms (local) | 50-200ms (API) |
| **Uptime SLA** | Platform-dependent | 99.9% (Business tier) |
| **Failure modes** | Disk full, file corruption | Network, API outages, rate limits |
| **Recovery** | Backup/restore file | Service-dependent |

**Latency Impact**:
- Auth check on every API request: +50-200ms per request
- Login flow: +100-400ms (multiple round trips)
- This is significant for a high-throughput proxy service

**Winner: SQLite** - Lower latency is critical for auth flows that happen on every request.

---

### 4. Dogfooding Narrative Value

**Argument for hyper.io**:
- Tom Wilson (founder) is a collaborator/contact
- Using it demonstrates confidence in the service
- "Built on hyper.io" could be marketing value

**Counterarguments**:
- OnHyper's value prop is **secure API proxy**, not backend services
- Dogfooding should align with core value, not peripheral needs
- hyper.io targets agencies/enterprises, not the same market as OnHyper
- Risk: Service dependency on a friend's product could create awkward dynamics

**Winner: Neutral/Better with SQLite** - Dogfooding hyper.io doesn't strengthen OnHyper's value proposition. It adds a dependency without marketing benefit.

---

### 5. Data Portability and Ownership

| Aspect | SQLite | hyper.io |
|--------|--------|----------|
| **Export** | Copy .db file | API query + export |
| **Migration** | Standard SQL tools | Custom scripts |
| **Vendor lock-in** | None (standard format) | Moderate (API-dependent) |
| **Data residency** | Your infrastructure | hyper.io infrastructure |
| **Disaster recovery** | File backup | Service-dependent |

**Security considerations**:
- SQLite: Secrets encrypted with AES-256-GCM, stored locally
- hyper.io: Data sent over network to third-party

**Winner: SQLite** - Better data sovereignty, simpler backup story, no network exposure of auth data.

---

## When Would hyper.io Make Sense?

hyper.io could be valuable for OnHyper if:

1. **Multi-region deployment** needed - hyper handles infrastructure
2. **Team collaboration features** - hyper has built-in user management for its services
3. **Search over user data** - hyper's search service could enable features
4. **Avoiding ops complexity** - team without DevOps experience

For OnHyper's current stage (MVP, single developer, Railway deployment), these don't apply.

---

## Migration Plan (If Proceeding)

*Not recommended, but if the decision is to proceed:*

### Phase 1: Evaluate hyper.io Starter (1 week)
```javascript
// Test hyper-connect for auth patterns
import { connect } from 'hyper-connect';
const hyper = connect(process.env.HYPER);

// Create data service for users
await hyper.data.create();

// Test user doc pattern
await hyper.data.add({
  _id: 'user-abc123',
  email: 'test@example.com',
  passwordHash: '...',
  type: 'user'
});
```

### Phase 2: Parallel Run (2 weeks)
- Keep SQLite as source of truth
- Write to both SQLite and hyper.io
- Compare latency, reliability
- Test failure scenarios

### Phase 3: Migration (1 week)
- Migrate existing data via bulk API
- Switch reads to hyper.io
- Monitor for issues

### Phase 4: Cleanup (1 week)
- Remove SQLite code
- Update docs
- Add hyper.io monitoring

**Total estimated effort**: 4-6 weeks  
**Risk level**: Medium-High (auth system rewrite)

---

## Alternative: Hybrid Approach

Keep SQLite for auth, use hyper.io or ScoutOS for other features:

| Service | Storage | Reason |
|---------|---------|--------|
| Users/Sessions/Secrets | SQLite | Low latency, security, simplicity |
| App content | LMDB (current) | Fast key-value, local |
| Analytics/logs | hyper.io Queue + Data | Future: scalable logging |
| RAG/knowledge bases | ScoutOS Databases | Future: AI features |

This preserves SQLite benefits while enabling future integrations.

---

## Final Recommendation

**Keep SQLite for auth storage.**

**Rationale**:
1. **Latency matters** - Auth happens on every request; 50-200ms overhead per request from API calls is unacceptable
2. **Cost efficiency** - SQLite is essentially free at OnHyper's scale; hyper.io Pro is $99/mo
3. **Simplicity** - Fewer dependencies, easier debugging, works offline
4. **Security** - Secrets stay local; no network exposure
5. **Dogfooding doesn't align** - OnHyper's value is secure proxy, not backend services

**When to reconsider**:
- OnHyper reaches scale requiring multi-region deployment
- Team grows and wants managed services
- Adding features that benefit from hyper.io's search/queue capabilities
- Tom Wilson's team offers a custom/partner pricing arrangement

---

## Open Questions for Rakis

1. **Tom's email** - Did Tom specifically suggest using hyper.io or ScoutOS for auth storage? The request mentions "Tom's email" but I found no specific details about what was proposed.

2. **"Scout Atoms"** - The PRD references `api.scoutos.com/atoms` as a proxy target. Is this an existing service Tom provides, or a planned feature? This appears to be for AI inference, not storage.

3. **Relationship with Tom/hyper** - What's the business relationship? Partner pricing could change the cost equation significantly.

4. **Scale expectations** - When does OnHyper expect to exceed Railway's SQLite capacity? (Typically millions of rows before issues arise.)

---

## References

- OnHyper PRD: `/onhyper/PRD.md`
- hyper.io docs: https://docs.hyper.io/
- hyper.io pricing: https://hyper.io/pricing
- ScoutOS docs: https://docs.scoutos.com/
- hyper-connect SDK: https://github.com/hyper63/hyper-connect
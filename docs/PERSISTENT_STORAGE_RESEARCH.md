# Persistent Storage Research for OnHyper on Railway

**Date:** February 15, 2026  
**Problem:** SQLite/LMDB databases stored in container filesystem are wiped on each deployment, causing data loss.

---

## Summary of Options

| Option | Pros | Cons | Est. Cost |
|--------|------|------|-----------|
| **Railway Volume** | Simple setup, persists data, works with SQLite | One volume per service max, no replicas, brief downtime on deploy | ~$0.15/GB/month |
| **Railway PostgreSQL** | Managed, automatic persistence, TCP access | Migration effort, additional service cost, relational schema change | $5-20/month depending on usage |
| **Litestream + S3** | Keeps SQLite, real-time backup, point-in-time recovery | Extra complexity, need S3 bucket, restore time on deploy | ~$0.02/GB S3 storage + minimal transfer |
| **External Managed DB** | Fully managed, backups included, high availability | Vendor lock-in, network latency, ongoing costs | $10-50+/month |

---

## Option 1: Railway Persistent Volumes ✅ RECOMMENDED FOR SQLITE

### What It Is
Railway provides persistent volumes that are attached to your service container at runtime. Data written to the volume persists across deployments and restarts.

### Configuration

1. **Create a volume** via Railway dashboard:
   - Click `⌘K` (Command Palette) or right-click project canvas
   - Select "Create Volume"
   - Choose the service to connect to (OnHyper)

2. **Set the mount path**:
   - If your SQLite database is at `/app/data/database.db` in the container
   - Mount the volume to `/app/data` (the parent directory)
   - Environment variables auto-provided:
     - `RAILWAY_VOLUME_NAME`
     - `RAILWAY_VOLUME_MOUNT_PATH`

### Size Limits by Plan

| Plan | Volume Limit | Notes |
|------|--------------|-------|
| Free | 0.5 GB | Not suitable for production |
| Trial | 0.5 GB | Evaluation only |
| Hobby | 5 GB | Good for small apps (~$5/month subscription) |
| Pro | 50 GB (up to 250 GB) | Production workloads (~$20/month) |

### Pricing

- **$0.15 per GB per month** ($0.000003472222222 per GB per minute)
- You're only charged for storage **used**, not allocated
- Metadata overhead: ~2-3% of total storage

### Example: 1GB Database
- Hobby plan: $5/month subscription (includes $5 usage credit)
- Volume cost: ~$0.15/month (likely covered by credit)
- **Total: ~$5/month**

### Important Caveats ⚠️

1. **One volume per service** - You cannot attach multiple volumes to one service
2. **No replicas** - Services with volumes cannot use Railway's replica feature
3. **Deployment downtime** - Brief downtime during redeployments (volume must unmount/remount)
4. **Cannot downsize** - Volume can only grow, not shrink
5. **No file browser** - Must access files via the attached service
6. **Build-time data won't persist** - Volume is mounted at runtime, not during build
7. **Root user required for some images** - Set `RAILWAY_RUN_UID=0` if your container runs as non-root

### I/O Performance

- **3,000 read IOPS**
- **3,000 write IOPS**
- Suitable for most application workloads

---

## Option 2: Railway PostgreSQL Database

### What It Is
Railway offers one-click PostgreSQL deployment with automatic volume persistence built-in. This is an unmanaged database template with sensible defaults.

### Setup

1. Deploy from template: `railway.com/deploy/postgresql`
2. Connect to OnHyper service via private networking
3. Update OnHyper to use PostgreSQL connection string

### Pros
- Automatic persistence (built-in volume)
- TCP Proxy for external access
- Private networking between services
- Backup support
- Battle-tested, production-ready

### Cons
- Requires code changes (SQLite → PostgreSQL)
- Additional service running 24/7
- Higher resource usage
- Schema migration complexity

### Pricing
PostgreSQL runs as a service with its own resource usage:
- RAM: ~$10/GB/month
- CPU: ~$20/vCPU/month
- Built-in volume included

**Estimated cost for small instance:** ~$5-15/month additional

---

## Option 3: Litestream for SQLite Replication

### What It Is
Litestream is a standalone tool that continuously replicates SQLite changes to cloud storage (S3, GCS, Azure, etc.). On deployment failure, you can restore from backup.

### How It Works
1. Litestream hooks into SQLite's Write-Ahead Log (WAL)
2. Streams changes to S3-compatible storage in real-time
3. On container restart, restores latest state from S3

### Setup for Railway

```yaml
# litestream.yml
dbs:
  - path: /app/data/database.db
    replicas:
      - type: s3
        bucket: your-backup-bucket
        path: onhyper/database.db
        region: us-east-1
```

### Restore on Startup
Add to your start command:
```bash
litestream restore /app/data/database.db && ./onhyper start
```

### Pros
- Keep using SQLite (no migration)
- Real-time backup
- Point-in-time recovery
- Works with any S3-compatible storage (Cloudflare R2, Backblaze, etc.)

### Cons
- Adds complexity
- Need external S3 bucket
- Brief restore time on each deployment
- Doesn't prevent data loss between backups (short window)

### Cost
- Litestream: Free & open source
- S3 Storage: ~$0.02/GB/month
- Data transfer: Minimal for database replication

**Estimated: <$1/month for small database**

---

## LMDB Specific Considerations ⚠️

### The Problem
**LMDB is NOT suitable for network filesystems.**

From LMDB documentation:
> "LMDB should not be used on network filesystems due to lack of advisory locking."

### Technical Issues
1. **No advisory locking** - NFS and similar filesystems don't support the POSIX locking LMDB requires
2. **Memory-mapped I/O** - LMDB relies on `mmap()` which behaves poorly on network filesystems
3. **Corruption risk** - Concurrent access on network FS can corrupt the database
4. **Performance degradation** - 2-5x slower cold reads on NFS vs local disk

### Options for LMDB/Key-Value Storage

| Approach | Feasibility | Notes |
|----------|-------------|-------|
| **Railway Volume** | ✅ Works | Volume is local disk, not NFS |
| **Redis (Railway)** | ✅ Recommended | Managed, persistent, network-native |
| **BadgerDB** | ✅ Works | Embedded KV store, works on volumes |
| **PostgreSQL JSONB** | ✅ Works | Relational + document storage in one |

**Recommendation:** If using Railway Volume, LMDB should work since the volume appears as local disk to the container. However, for scalability and reliability, consider **Redis** for key-value storage.

---

## Recommended Approach

### For SQLite Database

**Primary Recommendation: Railway Persistent Volume**

This is the simplest solution with minimal code changes.

**Implementation Steps:**

1. **Create the volume:**
   ```
   Railway Dashboard → Command Palette (⌘K) → "Create Volume"
   ```

2. **Connect to OnHyper service**

3. **Set mount path:**
   - If database currently at `./data/database.db` (resolves to `/app/data/database.db`)
   - Set mount path to: `/app/data`

4. **Update code if needed:**
   - Ensure database path is configurable via environment variable
   - Use `RAILWAY_VOLUME_MOUNT_PATH` or set your own `DATABASE_PATH`

5. **Set environment variable:**
   ```
   DATABASE_PATH=/app/data/database.db
   ```
   or rely on auto-provided `RAILWAY_VOLUME_MOUNT_PATH`

6. **Redeploy:**
   - Future deployments will persist data in the volume

### For LMDB/Key-Value Storage

**Recommendation: Railway Redis or migrate to SQLite**

1. **Option A - Keep LMDB on Volume:**
   - Mount volume to LMDB directory path
   - Should work since volume is local disk
   - Test thoroughly before production

2. **Option B - Migrate to Redis:**
   - Deploy Railway Redis template
   - Update code to use Redis client
   - Automatic persistence built-in

---

## Cost Estimate Summary

### Minimum Viable Setup (Hobby Plan)

| Item | Monthly Cost |
|------|--------------|
| Hobby Subscription | $5.00 |
| Volume (1GB used) | ~$0.15 |
| **Total** | **~$5.00** |

Note: Hobby includes $5 usage credit, so volume cost is likely covered.

### Production Setup (Pro Plan)

| Item | Monthly Cost |
|------|--------------|
| Pro Subscription | $20.00 |
| Volume (5GB used) | ~$0.75 |
| Usage allowance | $20 included |
| **Total** | **$20/month** |

### With PostgreSQL Database

| Item | Monthly Cost |
|------|--------------|
| Hobby Subscription | $5.00 |
| PostgreSQL Service | ~$5-10.00 |
| **Total** | **$10-15/month** |

---

## Implementation Checklist

- [ ] Determine exact database file paths in current container
- [ ] Choose storage plan based on data size estimate
- [ ] Create Railway volume in project
- [ ] Connect volume to OnHyper service
- [ ] Configure mount path for database directory
- [ ] Test with small dataset first
- [ ] Configure backups (Railway supports manual and automated backups for volumes)
- [ ] Update documentation to note volume dependency
- [ ] Consider adding Litestream as backup for additional safety

---

## Gotchas & Limitations

1. **Volume only mounts at runtime** - Don't write data during build phase
2. **No replicas** with volumes - Single instance only
3. **Brief deploy downtime** - Volume unmount/remount causes brief pause
4. **One volume per service** - Plan storage layout accordingly
5. **Can't shrink volumes** - Plan for growth, not reduction
6. **Free tier deleted after 30 days** - Don't use Free plan for production
7. **LMDB on network FS** - Not directly applicable since Railway volumes are local disk, but worth monitoring

---

## Additional Resources

- [Railway Volumes Documentation](https://docs.railway.com/volumes)
- [Railway Volume Reference](https://docs.railway.com/reference/volumes)
- [Railway Databases](https://docs.railway.com/databases)
- [Litestream Documentation](https://litestream.io/)
- [LMDB Documentation](http://www.lmdb.tech/doc/)
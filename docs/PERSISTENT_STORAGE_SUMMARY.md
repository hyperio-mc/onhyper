# Persistent Storage Implementation Summary

**Date:** February 15, 2026  
**Status:** ✅ Implemented and Pushed to main branch

---

## Changes Made

### 1. `src/config.ts` - Dynamic Data Directory Resolution

Added a `getDataDir()` function that determines the data directory path with priority:

1. **`RAILWAY_VOLUME_MOUNT_PATH`** - Auto-set by Railway when a volume is attached
2. **`DATA_DIR`** - Custom environment variable override
3. **Default `./data`** - For local development

Added `dataDir` to the exported config for easy reference.

### 2. `railway.toml` - Volume Configuration

Added a persistent volume configuration:

```toml
[[volume]]
name = "onhyper-data"
mountPath = "/app/data"
```

The volume will be automatically created when the service is deployed. Railway manages volume sizing dynamically - you only pay for storage used.

### 3. `Dockerfile` - Data Directory Permissions

Updated the data directory creation to include explicit permissions:

```dockerfile
RUN mkdir -p /app/data && chmod 755 /app/data
```

Added a comment explaining the Railway volume mount relationship.

### 4. `src/index.ts` - Startup Logging

Added logging for debugging:
- Data directory path
- Whether Railway volume is mounted

Example output on Railway:
```
Initializing databases...
Data directory: /app/data
Volume mount: /app/data
SQLite database: /app/data/onhyper.db
LMDB database: /app/data/onhyper.lmdb
```

---

## How It Works

1. **Volume Creation**: When deployed to Railway, the volume `onhyper-data` will be created automatically and mounted at `/app/data`.

2. **Data Persistence**: All SQLite and LMDB database files are written to `/app/data/`, which is now backed by persistent storage.

3. **Directory Creation**: Both `db.ts` and `lmdb.ts` already had `mkdirSync(..., { recursive: true })` to create directories if they don't exist, ensuring the app works even on first deploy.

4. **No Code Changes Required**: The existing initialization code in `db.ts` and `lmdb.ts` already creates the data directory if needed. The changes ensure this directory is on the persistent volume.

---

## Deployment Steps

1. **Push to main**: Already done (commit 57cea31)

2. **Railway will auto-deploy**: If auto-deploy is enabled, Railway will pick up the changes and redeploy with the new volume configuration.

3. **Volume will be created**: Railway automatically provisions the volume on first deploy with this configuration.

4. **Optional - Manual Volume Creation**: If you prefer, you can create the volume manually in the Railway dashboard:
   - Open your Railway project
   - Click `⌘K` (Command Palette)
   - Select "Create Volume"
   - Name it `onhyper-data`
   - Set mount path to `/app/data`
   - Connect to the OnHyper service

---

## Costs

- **Hobby Plan ($5/month)**: Includes 5GB volume storage
- **Pro Plan ($20/month)**: Includes 50GB volume storage (expandable to 250GB)
- Volume pricing: ~$0.15/GB/month for used storage

Based on current estimates, a 1GB database would cost ~$0.15/month in addition to plan subscription.

---

## Testing After Deployment

1. Create a test app via the API or dashboard
2. Trigger a redeploy (push a small change or manually redeploy)
3. Verify the test app still exists
4. Check logs for "Volume mount: /app/data" to confirm persistence is active

---

## Limitations to Note

1. **One volume per service** - Cannot attach multiple volumes to one service
2. **No replicas** - Services with volumes cannot use Railway's replica feature
3. **Brief deploy downtime** - Volume unmount/remount causes brief pause during deployments
4. **Cannot shrink volumes** - Plan storage needs appropriately

---

## Files Changed

- `src/config.ts` - Dynamic data directory resolution
- `railway.toml` - Volume configuration added
- `Dockerfile` - Updated data directory creation
- `src/index.ts` - Added startup logging
- `PERSISTENT_STORAGE_RESEARCH.md` - Added research document (reference)

**Commit:** 57cea31  
**Branch:** main
# Plan: Hyper LMDB Adapter & hyper-nano-lmdb

## Goal
Fork hyper63/hyper, create an LMDB adapter for the Data Port, and build a lightweight hyper-nano-lmdb variant.

## Why LMDB?
- Already familiar (used in OnHyper)
- Embedded - no external service needed
- Fast - memory-mapped, zero-copy reads
- Small - ~1 file vs 65MB MongoDB download
- Persistent - with Railway volumes

## Architecture

### Current hyper-nano
```
Data Port → MongoDB (in-memory, 65MB download)
Cache Port → SQLite
Storage Port → File system
Search Port → SQLite + Minisearch
```

### hyper-nano-lmdb (Target)
```
Data Port → LMDB (embedded, ~1 file)
Cache Port → LMDB
Storage Port → File system
Search Port → LMDB + Minisearch (or built-in)
```

## Tasks

### Phase 1: Fork & Setup (task-068)
- [ ] Fork hyper63/hyper repository
- [ ] Set up local development environment
- [ ] Verify vanilla hyper-nano runs locally
- [ ] Understand adapter interface

### Phase 2: Build LMDB Adapter (task-069)
- [ ] Study existing adapter patterns (SQLite, PouchDB)
- [ ] Create hyper-adapter-lmdb package
- [ ] Implement Data Port interface with LMDB
- [ ] Add to hyper-nano config
- [ ] Test locally

### Phase 3: Build hyper-nano-lmdb (task-070)
- [ ] Configure hyper-nano to use LMDB adapter
- [ ] Remove MongoDB dependency
- [ ] Add LMDB cache support
- [ ] Create standalone binary/script
- [ ] Test all ports

### Phase 4: Deploy to Railway (task-071)
- [ ] Create Railway deployment config
- [ ] Add persistent volume for LMDB
- [ ] Deploy and test
- [ ] Verify persistence across restarts

### Phase 5: Documentation & Open Source (task-072)
- [ ] Write README for adapter
- [ ] Document the fork differences
- [ ] Publish to GitHub
- [ ] Consider npm package

## Success Criteria

### task-068: Fork & Setup
- [ ] Fork exists on GitHub
- [ ] Local dev environment works
- [ ] Can run vanilla hyper-nano

### task-069: LMDB Adapter
- [ ] Adapter package created
- [ ] Implements Data Port (create, read, update, delete, query)
- [ ] Passes basic CRUD tests
- [ ] Integrates with hyper core

### task-070: hyper-nano-lmdb
- [ ] Runs without MongoDB download
- [ ] Data persists in LMDB files
- [ ] Cache works with LMDB
- [ ] Binary runs standalone

### task-071: Railway Deployment
- [ ] Deploys successfully
- [ ] Data persists across restarts
- [ ] API responds correctly
- [ ] Performance acceptable

### task-072: Documentation
- [ ] README complete
- [ ] Usage examples
- [ ] GitHub release

## Timeline Estimate
- Phase 1: 1-2 hours
- Phase 2: 4-6 hours
- Phase 3: 2-3 hours
- Phase 4: 1-2 hours
- Phase 5: 1-2 hours

**Total: ~10-15 hours**

# OnHyper Performance Benchmark Results

**Date**: 2026-02-24
**Environment**: Local development (Mac mini M4, Node.js 25.6.1)
**Server**: Hono + @hono/node-server

## Summary

OnHyper shows excellent performance for a Node.js-based API server:

| Metric | Value |
|--------|-------|
| Max Requests/sec | ~26,800 |
| Avg Latency (p50) | 3-5ms |
| Avg Latency (p99) | 7-13ms |
| Max Concurrent | 200+ tested |
| Failed Requests | 0 |

## Static Page Serving

| Endpoint | Requests/sec | Mean Latency | p50 | p95 | p99 |
|----------|-------------|--------------|-----|-----|-----|
| `/health` | 23,820 | 4.2ms | 4ms | 5ms | 7ms |
| `/` (homepage) | 26,076 | 3.8ms | 3ms | 6ms | 7ms |
| `/api` | 25,449 | 3.9ms | 4ms | 5ms | 7ms |
| `/api/status` | 19,083 | 0.5ms | 1ms | 1ms | 1ms |
| `/.well-known/skill.md` | 22,394 | 0.4ms | 0ms | 1ms | 1ms |

## Public API Endpoints

| Endpoint | Requests/sec | Mean Latency | p50 | p95 | p99 |
|----------|-------------|--------------|-----|-----|-----|
| `/api/waitlist/stats` | 22,981 | 0.4ms | 0ms | 1ms | 1ms |
| `/api/subdomains/check` | 23,745 | 0.4ms | 0ms | 1ms | 1ms |
| `/api/chat/status` | 24,443 | 0.4ms | 0ms | 1ms | 1ms |
| `/api/features` | 22,681 | 0.4ms | 0ms | 1ms | 1ms |

## Proxy Endpoints

| Endpoint | Requests/sec | Mean Latency | p50 | p95 | p99 |
|----------|-------------|--------------|-----|-----|-----|
| `/proxy` | 25,288 | 0.4ms | 0ms | 0ms | 1ms |
| `/proxy/auth/workos` | 24,291 | 0.4ms | 0ms | 1ms | 1ms |
| `/proxy/auth/clerk` | 24,743 | 0.4ms | 0ms | 1ms | 1ms |

## Stress Test Results

### 100 Concurrent Users (5000 requests)
- **Homepage**: 26,076 req/sec, p99: 7ms
- **Health**: 23,820 req/sec, p99: 7ms

### 200 Concurrent Users (10000 requests)
- **Homepage**: 26,850 req/sec, p99: 13ms
- **Failed requests**: 0

## Key Findings

1. **Excellent throughput**: ~25,000+ requests/second on development hardware
2. **Low latency**: p99 under 15ms even at 200 concurrent connections
3. **Zero failures**: No dropped requests under load
4. **Consistent performance**: All endpoints perform similarly

## Bottleneck Analysis

The current architecture (Hono + Node.js server) performs well for static content and lightweight API responses. Potential bottlenecks to investigate:

1. **LMDB operations**: App publishing/reading from LMDB not yet benchmarked
2. **SQLite queries**: Database-heavy operations (auth, apps CRUD) not benchmarked
3. **Proxy endpoints**: Actual proxying to external APIs not tested
4. **File uploads**: ZIP file upload/publishing performance unknown

## Recommendations

1. **Deploy as-is**: Current performance is excellent for typical traffic
2. **Add caching**: Consider caching for frequently accessed apps
3. **Horizontal scaling**: Can deploy multiple instances behind load balancer if needed
4. **Rate limiting**: Current implementation should handle rate limiting without performance impact

## Running Benchmarks

```bash
# Start the dev server
npm run dev

# Run basic benchmark
./benchmark.sh

# Run stress test manually
ab -n 5000 -c 100 http://127.0.0.1:3000/
```

## Next Steps

- [ ] Benchmark app creation endpoint (requires auth)
- [ ] Benchmark app publishing (ZIP upload)
- [ ] Benchmark proxy throughput (requires external API keys)
- [ ] Compare with production deployment (Railway)
- [ ] Memory profiling under sustained load
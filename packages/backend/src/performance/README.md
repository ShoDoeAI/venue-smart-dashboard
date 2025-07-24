# Performance Testing Suite

This directory contains performance tests for the VenueSync platform, covering API endpoints, data processing, and system behavior under load.

## Test Categories

### 1. API Endpoint Performance (`api-endpoints.perf.ts`)
- Response time benchmarks for critical endpoints
- Concurrent request handling
- Memory usage under load
- Database query performance

### 2. Data Processing Performance (`data-processing.perf.ts`)
- Connector data transformation speed
- KPI calculation performance
- Large dataset handling
- Aggregation efficiency

### 3. Real-time Operations (`realtime.perf.ts`)
- WebSocket message throughput
- Concurrent user simulations
- Real-time update latency
- Memory usage over time

### 4. Database Performance (`database.perf.ts`)
- Query execution time
- Index effectiveness
- Connection pool behavior
- Transaction throughput

## Running Performance Tests

```bash
# Run all performance tests
pnpm test:perf

# Run specific test file
pnpm test:perf api-endpoints.perf.ts

# Run with detailed output
pnpm test:perf --reporter=verbose

# Generate performance report
pnpm test:perf --reporter=json > perf-report.json
```

## Performance Benchmarks

### API Response Times (Target)
- Dashboard endpoint: < 200ms (p95)
- Data fetch endpoints: < 500ms (p95)
- AI chat endpoint: < 3s (p95)
- Simple queries: < 50ms (p95)

### Data Processing (Target)
- 1000 transactions: < 100ms
- KPI calculation: < 50ms per venue
- Data aggregation: < 200ms

### Memory Usage (Target)
- API server baseline: < 200MB
- Under load (100 concurrent): < 500MB
- No memory leaks over 1 hour

## Monitoring Production Performance

These tests establish baselines for production monitoring:
- Set up alerts when p95 exceeds targets
- Monitor memory usage trends
- Track database query performance
- Watch for performance regression in CI/CD
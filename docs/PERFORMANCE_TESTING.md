# VenueSync Performance Testing Guide

## Overview

This guide covers the performance testing infrastructure for VenueSync, including test suites, benchmarks, and production monitoring recommendations.

## Performance Test Suites

### 1. API Endpoint Performance (`api-endpoints.perf.ts`)
Tests the response times and throughput of critical API endpoints:
- Dashboard data aggregation
- Multi-venue processing
- AI chat responses
- Database query performance
- Memory leak detection

**Key Metrics:**
- Response time (p50, p95, p99)
- Throughput (requests/second)
- Memory usage
- Concurrent request handling

### 2. Data Processing Performance (`data-processing.perf.ts`)
Benchmarks data transformation and aggregation operations:
- Transaction processing (1k-50k records)
- KPI calculations
- Multi-source data aggregation
- Zod validation performance
- Batch and concurrent processing

**Key Metrics:**
- Records processed per second
- Memory efficiency
- Linear scaling verification
- CPU utilization

### 3. Real-time Operations (`realtime.perf.ts`)
Tests WebSocket and real-time update performance:
- Message throughput
- Burst traffic handling
- Concurrent user simulations
- Connection resilience
- Memory stability under load

**Key Metrics:**
- Messages per second
- Latency percentiles
- Connection recovery time
- Memory growth rate

### 4. Database Performance (`database.perf.ts`)
Evaluates database query and transaction performance:
- Simple and complex queries
- Bulk operations
- Index effectiveness
- Connection pooling
- Transaction overhead

**Key Metrics:**
- Query execution time
- Rows per second
- Index usage percentage
- Connection pool efficiency

## Running Performance Tests

### Individual Test Suites
```bash
# Run all performance tests
pnpm test:perf

# Run specific test suite
pnpm test:perf:api      # API endpoint tests
pnpm test:perf:data     # Data processing tests
pnpm test:perf:realtime # Real-time operation tests
pnpm test:perf:db       # Database performance tests

# Generate comprehensive report
pnpm perf:report
```

### Performance Benchmarks

#### Target Metrics (Production)

**API Response Times:**
- Dashboard endpoint: < 200ms (p95)
- Data fetch endpoints: < 500ms (p95)
- AI chat endpoint: < 3s (p95)
- Simple queries: < 50ms (p95)

**Data Processing:**
- 1000 transactions: < 100ms
- 10k records/second throughput
- KPI calculation: < 50ms per venue
- Data aggregation: < 200ms

**Real-time Operations:**
- WebSocket latency: < 20ms (p95)
- 100+ messages/second throughput
- Connection recovery: < 150ms
- Stable memory under load

**Database Performance:**
- Simple queries: < 50ms
- Complex joins: < 200ms
- Bulk inserts: 2000+ records/second
- Index usage: > 80%

## Load Testing Scenarios

### 1. Normal Load
- 10 concurrent venues
- 100 transactions/minute per venue
- 5 concurrent users per venue
- 3-minute data refresh cycle

### 2. Peak Load
- 50 concurrent venues
- 500 transactions/minute per venue
- 20 concurrent users per venue
- Real-time updates enabled

### 3. Stress Test
- 100 concurrent venues
- 1000 transactions/minute per venue
- 50 concurrent users per venue
- Continuous data sync

## Performance Optimization Checklist

### Backend Optimizations
- [ ] Database query optimization
- [ ] Index strategy review
- [ ] Connection pooling configuration
- [ ] Caching implementation
- [ ] Query batching
- [ ] Async processing for heavy operations

### Frontend Optimizations
- [ ] Component memoization
- [ ] Virtual scrolling for large lists
- [ ] Debounced API calls
- [ ] Optimistic UI updates
- [ ] Bundle size optimization
- [ ] Image lazy loading

### Infrastructure Optimizations
- [ ] CDN configuration
- [ ] API response compression
- [ ] Database read replicas
- [ ] Auto-scaling policies
- [ ] Rate limiting
- [ ] Circuit breaker tuning

## Monitoring Production Performance

### Key Metrics to Monitor

1. **API Performance**
   - Request duration by endpoint
   - Error rates
   - Throughput
   - Response size

2. **Database Performance**
   - Query execution time
   - Connection pool usage
   - Lock contention
   - Index hit rate

3. **Real-time Operations**
   - WebSocket connection count
   - Message latency
   - Reconnection frequency
   - Memory usage

4. **System Resources**
   - CPU utilization
   - Memory usage
   - Network I/O
   - Disk I/O

### Recommended Monitoring Tools

1. **Application Performance Monitoring (APM)**
   - New Relic
   - DataDog
   - AppDynamics
   - Sentry Performance

2. **Infrastructure Monitoring**
   - Prometheus + Grafana
   - CloudWatch (AWS)
   - Stackdriver (GCP)

3. **Real User Monitoring (RUM)**
   - Google Analytics
   - Mixpanel
   - Amplitude

4. **Database Monitoring**
   - pgAdmin
   - Supabase Dashboard
   - Custom Grafana dashboards

## Performance Regression Prevention

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: Performance Tests
on: [pull_request]
jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:perf
      - name: Compare with baseline
        run: |
          # Compare results with baseline
          # Fail if regression > 10%
```

### Performance Budgets
- Dashboard load: < 2s
- Time to interactive: < 3s
- API response budget: < 500ms
- Memory budget: < 200MB baseline
- Bundle size: < 500KB gzipped

## Troubleshooting Performance Issues

### Common Issues and Solutions

1. **Slow Dashboard Load**
   - Check database indexes
   - Review aggregation queries
   - Implement caching
   - Consider pagination

2. **High Memory Usage**
   - Check for memory leaks
   - Review data retention
   - Implement streaming for large datasets
   - Optimize object pooling

3. **WebSocket Latency**
   - Check network conditions
   - Review message size
   - Implement compression
   - Consider regional deployments

4. **Database Bottlenecks**
   - Analyze slow query log
   - Review connection pool size
   - Consider read replicas
   - Implement query caching

## Best Practices

1. **Regular Performance Testing**
   - Run tests before major releases
   - Establish performance baselines
   - Track trends over time
   - Set up alerts for regressions

2. **Production-like Testing**
   - Use realistic data volumes
   - Simulate actual user patterns
   - Test with production constraints
   - Include network latency

3. **Continuous Monitoring**
   - Real-time dashboards
   - Automated alerts
   - Regular performance reviews
   - User experience tracking

4. **Performance Culture**
   - Include performance in code reviews
   - Set performance SLAs
   - Regular performance retrospectives
   - Share performance wins and learnings
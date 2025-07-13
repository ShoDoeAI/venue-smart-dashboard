# VenueSync Architecture Documentation

## Overview

VenueSync is a smart venue management platform that aggregates data from multiple APIs to provide real-time insights and AI-powered recommendations. This document outlines the key architectural decisions and patterns used in the platform.

## Architecture Decisions

### 1. Monorepo Structure

**Decision**: Use a monorepo with pnpm workspaces
**Rationale**:
- Shared code between frontend and backend via `@venuesync/shared` package
- Atomic commits across multiple packages
- Consistent tooling and dependencies
- Simplified CI/CD pipeline

**Structure**:
```
packages/
  ├── shared/      # Shared types, connectors, utilities
  ├── backend/     # Vercel Functions and API logic
  └── frontend/    # React dashboard
```

### 2. Snapshot-Based Data Architecture

**Decision**: Store API data as immutable snapshots with timestamps
**Rationale**:
- Preserves historical data for trend analysis
- Enables data recovery and auditing
- Simplifies concurrent API fetching
- Allows for partial failures without data loss

**Implementation**:
- `venue_snapshots` table tracks each fetch operation
- Individual API tables (e.g., `toast_transactions`) reference snapshots
- Daily summaries aggregate snapshot data

### 3. Abstract Connector Pattern

**Decision**: Create abstract `BaseConnector` class for all API integrations
**Rationale**:
- Consistent error handling across all APIs
- Shared retry logic with exponential backoff
- Unified metrics and logging
- Circuit breaker pattern for fault tolerance

**Key Features**:
- Configurable retry strategies (exponential, linear, fixed)
- Rate limit detection and handling
- Correlation IDs for request tracking
- Performance metrics collection

### 4. Circuit Breaker Pattern

**Decision**: Implement circuit breaker for API calls
**Rationale**:
- Prevents cascading failures
- Reduces load on failing services
- Provides graceful degradation
- Improves overall system resilience

**States**:
- CLOSED: Normal operation
- OPEN: Failures exceeded threshold, rejecting calls
- HALF_OPEN: Testing if service recovered

### 5. Data Orchestration Layer

**Decision**: Centralized orchestrator for coordinating multi-API fetches
**Rationale**:
- Parallel API calls with individual error handling
- Consistent snapshot management
- Aggregated metrics calculation
- Simplified cron job implementation

### 6. Type Safety Throughout

**Decision**: Strict TypeScript with Zod validation
**Rationale**:
- Catch errors at compile time
- Runtime validation for API responses
- Auto-generated types from Supabase schema
- Better IDE support and refactoring

### 7. Serverless Architecture

**Decision**: Vercel Functions for API endpoints
**Rationale**:
- Auto-scaling based on demand
- No server management
- Pay-per-use pricing
- Built-in edge caching
- Easy deployment

### 8. Real-time Updates

**Decision**: Auto-refresh UI with Supabase real-time (planned)
**Rationale**:
- Live dashboard updates
- Reduced API polling
- Better user experience
- Efficient resource usage

## Data Flow

1. **Scheduled Fetch** (every 3 hours):
   - Cron job triggers `/api/cron/fetch-data`
   - Orchestrator checks which venues need updates
   - Creates snapshot record

2. **API Data Collection**:
   - Parallel fetches from enabled APIs
   - Individual error handling per API
   - Data transformation and validation
   - Storage in API-specific tables

3. **Aggregation**:
   - Calculate metrics from raw data
   - Update snapshot with results
   - Generate daily summaries

4. **Presentation**:
   - Frontend fetches latest data
   - Real-time updates via polling (WebSocket planned)
   - Visual KPIs and trends

## Security Considerations

1. **API Key Management**:
   - Service role key only on backend
   - Row Level Security on all tables
   - Encrypted credential storage

2. **Authentication**:
   - API endpoints protected with bearer tokens
   - Cron jobs use separate secret
   - Supabase handles user auth (planned)

3. **Data Isolation**:
   - Venue-based data separation
   - RLS policies enforce access control
   - Audit trail via action_log table

## Performance Optimizations

1. **Batch Processing**:
   - Pagination for large datasets
   - Chunk processing to avoid memory issues
   - Concurrent API calls where possible

2. **Caching Strategy**:
   - 3-hour minimum between fetches
   - Snapshot-based data reuse
   - Frontend caches via React Query (planned)

3. **Database Indexes**:
   - Timestamp-based for time queries
   - Composite indexes for common filters
   - Venue ID indexing for multi-tenant queries

## Monitoring and Observability

1. **Metrics Collection**:
   - Request counts and response times
   - Success/failure rates per API
   - Circuit breaker state tracking

2. **Logging**:
   - Structured logs with correlation IDs
   - Error context preservation
   - Performance timing logs

3. **Alerting** (planned):
   - Failed snapshot alerts
   - API degradation warnings
   - Rate limit notifications

## Future Enhancements

1. **Additional API Integrations**:
   - Eventbrite for event management
   - WISK for inventory tracking
   - Resy/OpenTable for reservations
   - Meta Business Suite for social metrics

2. **AI-Powered Insights**:
   - Claude integration for natural language queries
   - Predictive analytics
   - Automated action recommendations

3. **Advanced Features**:
   - Multi-venue support
   - Custom alert rules
   - API webhook support
   - Mobile app

## Development Workflow

1. **Local Development**:
   ```bash
   pnpm install
   pnpm dev  # Runs all packages in dev mode
   ```

2. **Testing**:
   ```bash
   pnpm test  # Runs all tests
   pnpm test:square-flow  # Test Square integration
   ```

3. **Deployment**:
   - Push to main branch
   - Vercel auto-deploys
   - Database migrations via Supabase

## Lessons Learned

1. **Snapshot Architecture**: Provides excellent data integrity and historical tracking
2. **Circuit Breakers**: Essential for API reliability
3. **Type Safety**: Catches many errors before runtime
4. **Monorepo**: Greatly simplifies shared code management
5. **Performance Tests**: Critical for validating connector scalability

---

Last Updated: January 2025
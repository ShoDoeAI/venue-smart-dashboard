# VenueSync - Complete Product Development Document

## Executive Summary

VenueSync is a unified venue operations platform that aggregates data from 7 different service APIs, provides AI-powered insights through Claude, and enables action execution back to those services. Built with TypeScript throughout, deployed entirely on Vercel, and using Supabase for data storage.

## Project Overview

### Core Objectives
1. Aggregate real-time data from 7 venue service APIs
2. Store complete historical data for trend analysis
3. Provide natural language insights via Claude AI
4. Execute recommended actions across platforms
5. Display everything in an intuitive dashboard

### Key Design Decisions
- **Single venue focus**: Optimized for one venue (not multi-tenant)
- **3-minute update cycle**: Balances freshness with simplicity
- **Backend-first development**: Ensure data layer is solid before UI
- **TypeScript everywhere**: Type safety across the entire stack
- **All-Vercel deployment**: Simplifies operations and scaling

## Technology Stack

### Core Technologies
- **Language**: TypeScript (strict mode)
- **Backend**: Vercel Functions
- **Frontend**: React + Vite
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API (Anthropic)
- **Scheduling**: Vercel Cron Jobs
- **Testing**: Vitest + React Testing Library

### External APIs
1. **Eventbrite** - Event ticketing and attendance
2. **Toast POS** - Point of sale and payments
3. **WISK** - Inventory management
4. **Resy** - Restaurant reservations
5. **Audience Republic** - Marketing automation
6. **Meta Business Suite** - Social media marketing
7. **OpenTable** - Additional reservations

### Key Libraries
- **Zod** - Runtime validation for API responses
- **Axios** - HTTP client with interceptors
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **date-fns** - Date manipulation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        VenueSync Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │   Vercel Cron Jobs      │  │   Vercel Functions      │  │
│  │  (Every 3 minutes)      │  │  - /api/chat           │  │
│  │  - Fetch all APIs       │  │  - /api/execute        │  │
│  │  - Store snapshots      │  │  - /api/dashboard      │  │
│  └───────────┬─────────────┘  └────────────┬────────────┘  │
│              │                              │                │
│              └──────────┬───────────────────┘                │
│                        │                                     │
│  ┌─────────────────────┴─────────────────────────────────┐  │
│  │                  Supabase Database                     │  │
│  │  - Complete historical snapshots                       │  │
│  │  - Calculated KPIs and alerts                         │  │
│  │  - Row Level Security                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ↑                               │
│  ┌───────────────────────────┴───────────────────────────┐  │
│  │              React + Vite Frontend                     │  │
│  │  - Real-time data display (3-min updates)             │  │
│  │  - Chat interface for Claude                          │  │
│  │  - Action execution with confirmation                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
venuesync/
├── packages/
│   ├── shared/                 # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── api/       # External API types
│   │   │   │   │   ├── eventbrite.ts
│   │   │   │   │   ├── square.ts
│   │   │   │   │   ├── wisk.ts
│   │   │   │   │   ├── resy.ts
│   │   │   │   │   ├── audience-republic.ts
│   │   │   │   │   ├── meta.ts
│   │   │   │   │   └── opentable.ts
│   │   │   │   ├── database.ts    # Supabase schema types
│   │   │   │   ├── kpis.ts        # KPI definitions
│   │   │   │   └── actions.ts     # Action types
│   │   │   ├── schemas/           # Zod validation schemas
│   │   │   └── utils/             # Shared utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backend/                # Vercel Functions
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   └── fetch-data.ts
│   │   │   ├── chat.ts
│   │   │   ├── execute.ts
│   │   │   └── dashboard.ts
│   │   ├── lib/
│   │   │   ├── connectors/    # API connectors
│   │   │   │   ├── base.ts
│   │   │   │   ├── eventbrite.ts
│   │   │   │   ├── square.ts
│   │   │   │   ├── wisk.ts
│   │   │   │   ├── resy.ts
│   │   │   │   ├── audience-republic.ts
│   │   │   │   ├── meta.ts
│   │   │   │   └── opentable.ts
│   │   │   ├── ai/
│   │   │   │   └── claude.ts
│   │   │   ├── db/
│   │   │   │   └── supabase.ts
│   │   │   └── metrics/
│   │   │       ├── calculator.ts
│   │   │       └── alerts.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/               # React + Vite
│       ├── src/
│       │   ├── components/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── MetricCard.tsx
│       │   │   ├── AlertBanner.tsx
│       │   │   ├── ChatInterface.tsx
│       │   │   ├── ActionButton.tsx
│       │   │   └── Charts/
│       │   ├── hooks/
│       │   │   ├── useVenueData.ts
│       │   │   ├── useChat.ts
│       │   │   └── useActions.ts
│       │   ├── lib/
│       │   │   └── supabase.ts
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── tests/
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── .env.example
├── vercel.json
├── pnpm-workspace.yaml
└── README.md
```

## Core Features

### 1. Data Aggregation (Every 3 Minutes)

**Vercel Cron Function** fetches from all 7 APIs:
- Handles API failures gracefully
- Validates responses with Zod schemas
- Calculates KPIs and generates alerts
- Stores complete snapshot in Supabase
- Maintains full history for trend analysis

### 2. Natural Language Intelligence

**Claude Integration** provides:
- Answers questions about venue operations
- Analyzes trends across historical data
- Provides actionable recommendations
- Formats actions for easy execution

Example interactions:
- "Why are bar sales low tonight?"
- "What should I order for next week?"
- "How do Friday sales compare to last month?"

### 3. Action Execution

**Confirmation-based system** that can:
- Update prices in Toast POS
- Adjust event capacity in Eventbrite
- Send marketing campaigns via Audience Republic
- Create purchase orders in WISK
- All with rollback information stored

### 4. Real-time Dashboard

**React frontend** displays:
- Current KPIs with 3-minute updates
- Historical trends and comparisons
- Active alerts requiring attention
- Chat interface for questions
- One-click action execution

## Data Models

### Core Types (Reference Full Schema Document)

The complete database schema is defined in a separate document. Key tables include:
- `venue_snapshots` - Master snapshot coordination
- `eventbrite_events` - Event and ticketing data
- `toast_transactions` - POS and payment data
- `wisk_inventory` - Inventory levels and variance
- `resy_reservations` - Reservation details
- `audience_republic_campaigns` - Marketing performance
- `meta_insights` - Social media metrics
- `opentable_reservations` - Additional reservations
- `daily_summaries` - Pre-aggregated metrics
- `chat_history` - Claude conversation history
- `action_log` - Executed actions audit trail

### TypeScript Type System

```typescript
// Example shared types structure
// packages/shared/src/types/kpis.ts
export interface VenueKPIs {
  // Ticketing & Attendance
  ticketSellThrough: number;      // Percentage
  ticketsAvailable: number;       // Count
  averageTicketPrice: number;     // Currency
  grossTicketRevenue: number;     // Currency
  noShowRate: number;             // Percentage
  advanceVsDoorSales: {
    advance: number;
    door: number;
  };
  
  // Revenue & Profitability
  grossBarRevenue: number;        // Currency
  netProfitMargin: number;        // Percentage
  revenuePerCap: number;          // Currency
  barEfficiencyRatio: number;     // Ratio
  
  // Bar & Concession
  averageSpendPerCustomer: number; // Currency
  topSellingItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  inventoryVariance: number;       // Percentage
  
  // Marketing & Engagement
  emailOpenRate: number;          // Percentage
  emailClickRate: number;         // Percentage
  conversionRate: number;         // Percentage
  socialEngagementRate: number;   // Percentage
  marketingROI: number;           // Ratio
  
  // Operational Efficiency
  payrollPercentOfRevenue: number; // Percentage
  laborCostPerShow: number;        // Currency
  breakEvenPoint: number;          // Currency
}
```

## API Integration Patterns

### Base Connector Pattern

All API connectors follow a consistent pattern with:
- Type-safe responses using Zod validation
- Comprehensive error handling
- Rate limit management
- Retry logic with exponential backoff

```typescript
// Example structure (not full implementation)
abstract class BaseConnector<TConfig, TData> {
  protected abstract validateConfig(config: unknown): TConfig;
  protected abstract fetchData(venueId: string): Promise<unknown>;
  protected abstract validateResponse(data: unknown): TData;
  
  async getData(venueId: string): Promise<Result<TData, ApiError>> {
    try {
      const rawData = await this.fetchData(venueId);
      const validatedData = this.validateResponse(rawData);
      return { success: true, data: validatedData };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }
}
```

### Error Handling

Consistent error types across all connectors:
- `AuthenticationError` - Invalid credentials
- `RateLimitError` - API rate limit exceeded
- `ValidationError` - Response doesn't match schema
- `NetworkError` - Connection issues
- `UnknownError` - Unexpected failures

## Development Approach

### Phase 1: Backend Infrastructure (Week 1)

**Day 1-2: Project Setup**
- Initialize monorepo with pnpm workspaces
- Configure TypeScript with strict settings
- Set up Supabase project and schema
- Configure environment variables
- Set up Vitest testing framework

**Day 3-4: First API Connectors**
- Implement BaseConnector abstract class
- Build Eventbrite connector with full testing
- Build Toast connector with full testing
- Ensure type safety and error handling

**Day 5: Remaining Connectors**
- WISK, Resy, OpenTable connectors
- Audience Republic, Meta connectors
- Integration tests for all connectors

### Phase 2: Data Layer (Week 2)

**Day 1-2: Supabase Integration**
- Generate TypeScript types from schema
- Implement snapshot storage logic
- Create KPI calculation functions
- Build alert generation system

**Day 3-4: Cron Job Implementation**
- Set up Vercel Cron configuration
- Implement batch fetching logic
- Add comprehensive error logging
- Test with multiple API scenarios

**Day 5: Data Validation**
- Implement Zod schemas for all APIs
- Add runtime validation
- Create data quality metrics
- Performance optimization

### Phase 3: Intelligence Layer (Week 3)

**Day 1-2: Claude Integration**
- Set up Anthropic client
- Design prompt templates
- Implement context building
- Parse recommendations from responses

**Day 3-4: Action System**
- Define action types for each platform
- Implement confirmation flow
- Add execution logic
- Store rollback information

**Day 5: Testing & Polish**
- End-to-end integration tests
- Performance benchmarking
- Security audit
- Documentation

### Phase 4: Frontend Development (Week 4)

**Day 1-2: Foundation**
- Set up React + Vite + TypeScript
- Configure Tailwind CSS
- Implement Supabase client
- Create base layout

**Day 3-4: Core Components**
- Build MetricCard components
- Implement AlertBanner system
- Create chart components
- Add loading and error states

**Day 5: Integration**
- Connect to backend APIs
- Implement real-time updates
- Add error boundaries
- Performance optimization

### Phase 5: Interactive Features (Week 5)

**Day 1-2: Chat Interface**
- Build chat UI component
- Integrate with Claude endpoint
- Display recommendations
- Add action buttons

**Day 3-4: Action Execution**
- Implement confirmation dialogs
- Connect to execution endpoint
- Add success/error feedback
- Update data after actions

**Day 5: Production Ready**
- Final testing
- Performance audit
- Deploy to Vercel
- Set up monitoring

## Testing Strategy

### Test Pyramid
1. **Unit Tests** (70%)
   - Individual functions and utilities
   - API response validation
   - KPI calculations

2. **Integration Tests** (20%)
   - API connector behavior
   - Database operations
   - Claude response parsing

3. **E2E Tests** (10%)
   - Critical user flows
   - Data fetch → Display → Action

### Test Data Strategy
- Mock API responses for all platforms
- Fixture data for different scenarios
- Test database with seed data

## Security Considerations

### API Credentials
- Stored encrypted in Supabase using pgcrypto
- Never exposed to frontend
- Accessed only via server functions

### Authentication
- Supabase Auth for user management
- Row Level Security on all tables
- API endpoints require authentication

### Data Protection
- All API calls over HTTPS
- Sensitive data encrypted at rest
- Audit trail for all actions

## Performance Targets

### Backend
- API response time: < 500ms (cached)
- Data fetch cycle: < 30 seconds (all APIs)
- Claude response: < 3 seconds

### Frontend
- Initial load: < 2 seconds
- Update render: < 100ms
- Time to interactive: < 3 seconds

### Database
- Snapshot query: < 100ms
- Historical aggregation: < 500ms
- Real-time subscription: instant

## Deployment Configuration

### Vercel Settings

```json
{
  "functions": {
    "api/cron/fetch-data.ts": {
      "maxDuration": 60
    },
    "api/chat.ts": {
      "maxDuration": 30
    },
    "api/execute.ts": {
      "maxDuration": 30
    }
  },
  "crons": [{
    "path": "/api/cron/fetch-data",
    "schedule": "*/3 * * * *"
  }]
}
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude AI
ANTHROPIC_API_KEY=

# API Credentials (stored in Supabase, but needed for initial setup)
EVENTBRITE_API_KEY=
TOAST_ACCESS_TOKEN=
WISK_API_KEY=
RESY_API_KEY=
RESY_AUTH_TOKEN=
AUDIENCE_REPUBLIC_API_KEY=
META_APP_ID=
META_APP_SECRET=
OPENTABLE_CLIENT_ID=
OPENTABLE_CLIENT_SECRET=
```

## Monitoring & Observability

### Metrics to Track
- API success rates
- Response times
- Error frequencies
- Data freshness
- User interactions

### Alerting
- API failures
- High error rates
- Slow performance
- Failed cron jobs

## Success Criteria

### Launch (Week 5)
- All 7 APIs integrated successfully
- Data updating every 3 minutes
- Claude answering questions accurately
- Actions executing with confirmation
- Dashboard displaying real-time data

### 30 Days Post-Launch
- 99.9% uptime achieved
- Average response time < 500ms
- 90% of questions answered satisfactorily
- 50% reduction in time to make decisions

### 90 Days Post-Launch
- 10% increase in operational efficiency
- 20% reduction in inventory waste
- 15% improvement in marketing ROI
- Full historical data for analysis

## React Development Guidelines

### Component Philosophy
- UI as thin layer over data
- Minimal useState usage
- Prefer derived data over useEffect
- Create new components for complex conditionals

### Code Quality Rules
- No unnecessary comments
- Only comment race conditions or complex logic
- TypeScript strict mode always
- No `any` types allowed

### Example Component Pattern

```tsx
// Good: Derives state from props
function MetricCard({ metric, threshold }: MetricCardProps) {
  const status = deriveStatus(metric.value, threshold);
  const trend = deriveTrend(metric.history);
  
  return (
    <div className={`metric-card ${status}`}>
      <h3>{metric.name}</h3>
      <div className="value">{formatValue(metric.value)}</div>
      <TrendIndicator trend={trend} />
    </div>
  );
}

// Avoid: Unnecessary state
function BadMetricCard({ metric }: MetricCardProps) {
  const [status, setStatus] = useState('normal'); // Don't do this!
  
  useEffect(() => {
    setStatus(metric.value > 100 ? 'high' : 'normal');
  }, [metric.value]); // Unnecessary effect
  
  return <div className={status}>...</div>;
}
```

## Next Steps for Development

1. **Set up Supabase project** with provided schema
2. **Initialize monorepo** with TypeScript configuration
3. **Start with Eventbrite connector** using TDD
4. **Build incrementally** following the phases
5. **Deploy early** to Vercel for continuous testing

This document, combined with the database schema document, provides everything needed to build VenueSync from scratch.
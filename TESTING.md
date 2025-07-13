# VenueSync Testing Guide

This guide walks you through testing the complete end-to-end data flow with real API keys.

## Prerequisites

1. **Node.js** v18+ and **pnpm** installed
2. **Supabase** project created and configured
3. API credentials for:
   - Toast POS
   - Eventbrite
   - OpenDate.io
   - Anthropic (Claude AI)

## Step 1: Environment Configuration

### Backend Environment (.env)

Create `/packages/backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Toast API
TOAST_CLIENT_ID=your_toast_client_id
TOAST_CLIENT_SECRET=your_toast_client_secret
TOAST_RESTAURANT_GUID=your_restaurant_guid

# Eventbrite API
EVENTBRITE_PRIVATE_TOKEN=your_eventbrite_private_token
EVENTBRITE_ORGANIZATION_ID=your_organization_id

# OpenDate.io API
OPENDATE_CLIENT_ID=your_opendate_client_id
OPENDATE_CLIENT_SECRET=your_opendate_client_secret
OPENDATE_REDIRECT_URI=http://localhost:3000/api/auth/opendate/callback

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: WISK API (if available)
WISK_API_KEY=your_wisk_api_key
WISK_VENUE_ID=your_venue_id
```

### Frontend Environment (.env)

Create `/packages/frontend/.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 2: Database Setup

1. Run the Supabase migrations:

```bash
# From the root directory
cd packages/backend
pnpm supabase db push
```

2. Verify tables are created:
   - `venue_config`
   - `api_credentials`
   - `toast_transactions`
   - `eventbrite_events`
   - `opendate_reservations`
   - `venue_snapshots`
   - `daily_summaries`
   - `ai_conversations`
   - `pending_actions`

## Step 3: Initial Configuration

1. Start the backend server:

```bash
cd packages/backend
pnpm dev
```

2. Create venue configuration:

```bash
curl -X POST http://localhost:3000/api/venues/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Venue Name",
    "timezone": "America/New_York"
  }'
```

3. Add API credentials for each service:

```bash
# Toast
curl -X POST http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "service": "toast",
    "credentials": {
      "clientId": "your_toast_client_id",
      "clientSecret": "your_toast_client_secret",
      "restaurantGuid": "your_restaurant_guid"
    }
  }'

# Eventbrite
curl -X POST http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "service": "eventbrite",
    "credentials": {
      "privateToken": "your_eventbrite_token",
      "organizationId": "your_org_id"
    }
  }'

# OpenDate.io (requires OAuth flow)
# Visit: http://localhost:3000/api/auth/opendate
```

## Step 4: Test Data Fetching

### Manual Data Fetch

Trigger a manual data fetch from all sources:

```bash
curl -X POST http://localhost:3000/api/data/fetch \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "results": {
    "toast": {
      "transactions": 150,
      "revenue": 12543.50,
      "customers": 89
    },
    "eventbrite": {
      "events": 5,
      "ticketsSold": 245,
      "revenue": 8750.00
    },
    "opendate": {
      "reservations": 32,
      "covers": 128,
      "upcomingToday": 8
    }
  }
}
```

### Verify Data Storage

Check that data was stored in Supabase:

```bash
# Check Toast transactions
curl http://localhost:3000/api/data/toast/transactions?limit=5

# Check Eventbrite events
curl http://localhost:3000/api/data/eventbrite/events

# Check OpenDate reservations
curl http://localhost:3000/api/data/opendate/reservations?date=today
```

## Step 5: Test KPI Calculations

Trigger KPI calculation:

```bash
curl -X POST http://localhost:3000/api/kpi/calculate \
  -H "Content-Type: application/json"
```

Verify daily summary was created:

```bash
curl http://localhost:3000/api/kpi/summary/today
```

## Step 6: Test AI Integration

### Basic Query

```bash
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How is my venue performing today?"
  }'
```

### Analysis Request

```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "analysisType": "revenue",
    "timeframe": "today"
  }'
```

## Step 7: Test Frontend

1. Start the frontend:

```bash
cd packages/frontend
pnpm dev
```

2. Open http://localhost:5173 in your browser

3. Verify:
   - Dashboard loads with real data
   - Metrics display correctly
   - Charts render with actual values
   - Real-time updates work (wait 1 minute)

## Step 8: Test Scheduled Jobs

### Local Testing with Cron

1. Test the cron endpoint manually:

```bash
# Hourly data fetch
curl -X POST http://localhost:3000/api/cron/hourly \
  -H "Authorization: Bearer your_cron_secret"

# Daily KPI calculation
curl -X POST http://localhost:3000/api/cron/daily \
  -H "Authorization: Bearer your_cron_secret"
```

### Vercel Deployment

1. Deploy to Vercel:

```bash
vercel --prod
```

2. Set environment variables in Vercel dashboard

3. Verify cron jobs are running:
   - Check Vercel Functions logs
   - Monitor Supabase for new data

## Step 9: Test Action Execution

### Create a Test Action

```bash
curl -X POST http://localhost:3000/api/actions/create \
  -H "Content-Type: application/json" \
  -d '{
    "service": "eventbrite",
    "actionType": "update_event_capacity",
    "parameters": {
      "eventId": "123456789",
      "capacity": 150
    },
    "reason": "Increased demand based on AI recommendation"
  }'
```

### Confirm Action

```bash
curl -X POST http://localhost:3000/api/actions/{actionId}/confirm \
  -H "Content-Type: application/json"
```

## Step 10: End-to-End Verification

1. **Data Flow**:
   - ✅ APIs → Supabase
   - ✅ Supabase → Frontend
   - ✅ Scheduled updates working

2. **AI Integration**:
   - ✅ Context aggregation from all sources
   - ✅ Intelligent analysis and recommendations
   - ✅ Conversation history stored

3. **Actions**:
   - ✅ AI can suggest actions
   - ✅ Actions require confirmation
   - ✅ Actions execute against real APIs

## Troubleshooting

### Common Issues

1. **API Authentication Failures**
   - Verify API keys are correct
   - Check API rate limits
   - Ensure OAuth tokens are fresh

2. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Review Supabase logs

3. **Frontend Not Showing Data**
   - Check browser console for errors
   - Verify environment variables
   - Ensure backend is running

### Debug Mode

Enable detailed logging:

```bash
DEBUG=venuesync:* pnpm dev
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "toast": "ready",
    "eventbrite": "ready",
    "opendate": "ready",
    "ai": "ready"
  }
}
```

## Performance Testing

### Load Test Data Fetching

```bash
# Install autocannon
npm i -g autocannon

# Run load test
autocannon -c 10 -d 30 http://localhost:3000/api/data/fetch
```

### Monitor Resources

- Database connections
- API rate limits
- Memory usage
- Response times

## Security Checklist

- [ ] All API keys are in environment variables
- [ ] Supabase RLS policies are enabled
- [ ] CORS is properly configured
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] Audit logs enabled

## Next Steps

After successful testing:

1. Deploy to production
2. Set up monitoring (Vercel Analytics, Supabase Monitoring)
3. Configure alerts for failures
4. Document API credentials securely
5. Train venue staff on dashboard usage

---

For support or questions, please refer to the [main README](README.md) or open an issue on GitHub.
# Historical Data Guide

## Overview

VenueSync now supports 2 years of historical data from Toast POS, enabling comprehensive revenue analysis and trend identification. The AI assistant can answer questions about any specific date, week, month, or custom time period.

## Features

### 1. Historical Data Sync

- **2-Year Backfill**: Automatically fetch and store 2 years of Toast POS transaction data
- **Monthly Chunking**: Data is fetched in monthly chunks to avoid API rate limits
- **Duplicate Prevention**: Intelligent upsert logic prevents duplicate transactions
- **Historical Flag**: All historical data is marked with `is_historical = true` for easy identification

### 2. Date-Based Queries

The AI assistant now understands natural language date queries:

- **"What was last week's revenue?"**
- **"Show me yesterday's performance"**
- **"How did we do in December?"**
- **"Compare this month to last month"**
- **"What was our revenue on 2024-12-25?"**
- **"Show me the last 30 days"**

### 3. Pre-Aggregated Views

For optimal performance, we've created database views that pre-aggregate data:

- **`daily_revenue_summary`**: Daily aggregated metrics
- **`weekly_revenue_summary`**: Weekly aggregated metrics  
- **`monthly_revenue_summary`**: Monthly aggregated metrics
- **`toast_transactions_with_period`**: Enhanced view with date breakdown

### 4. API Endpoints

#### Historical Dashboard API
```bash
GET /api/dashboard/historical?startDate=2024-01-01&endDate=2024-01-31&granularity=daily
```

Parameters:
- `startDate`: Start of the period (YYYY-MM-DD)
- `endDate`: End of the period (YYYY-MM-DD)
- `granularity`: `daily`, `weekly`, or `monthly`
- `metrics`: Comma-separated list (`revenue,transactions,customers`)

Response includes:
- Period summary with totals
- Time series data
- Period-over-period comparison
- Best/worst performing days

#### Enhanced Chat API

The chat API automatically detects date-based queries and provides historical context:

```json
POST /api/chat
{
  "message": "What was last week's revenue?",
  "conversationId": "optional-id"
}
```

Response includes:
- `historicalQuery`: true/false
- `timeRange`: Detected time period
- Enhanced insights based on historical data

## Running Historical Sync

### Initial Backfill

To sync 2 years of historical data:

```bash
curl -X POST 'https://venue-smart-dashboard.vercel.app/api/cron/sync-historical-data' \
  -H 'Authorization: Bearer YOUR_ADMIN_SECRET'
```

This process:
1. Fetches data in monthly chunks going back 2 years
2. Stores transactions with `is_historical = true` flag
3. Updates all aggregated views
4. Takes approximately 5-10 minutes depending on data volume

### Regular Updates

The regular cron job (`/api/cron/fetch-data`) continues to run every 3 hours for real-time data.

## Database Schema Updates

### New Columns
- `toast_payments.is_historical`: Boolean flag for historical data
- `toast_checks.is_historical`: Boolean flag for historical data
- `toast_orders.is_historical`: Boolean flag for historical data

### New Indexes
- Historical data queries: `idx_toast_payments_historical`
- Date-based queries: `idx_toast_payments_snapshot`
- Performance optimization for aggregations

### New Views
- `toast_transactions_with_period`: Enhanced transaction view
- `daily_revenue_summary`: Pre-aggregated daily metrics
- `weekly_revenue_summary`: Pre-aggregated weekly metrics
- `monthly_revenue_summary`: Pre-aggregated monthly metrics

## Usage Examples

### AI Assistant Queries

1. **Revenue Analysis**
   - "What was our total revenue last month?"
   - "Show me daily revenue for the past week"
   - "How much did we make on New Year's Eve?"

2. **Trend Analysis**
   - "Is our revenue growing compared to last year?"
   - "What's our busiest day of the week?"
   - "Show me seasonal trends"

3. **Performance Comparison**
   - "Compare this week to last week"
   - "How does this December compare to last December?"
   - "What was our best month this year?"

### Dashboard Integration

The frontend dashboard can now:
- Display historical charts with date range selection
- Show year-over-year comparisons
- Highlight trends and patterns
- Provide drill-down capabilities

## Performance Considerations

1. **Pre-aggregated Views**: Use the summary views for dashboard queries
2. **Date Indexes**: All date-based queries are optimized with indexes
3. **Chunk Processing**: Historical sync processes data in manageable chunks
4. **Caching**: Consider implementing Redis caching for frequently accessed periods

## Troubleshooting

### Common Issues

1. **Historical sync timeout**
   - Solution: The sync is designed to handle timeouts gracefully. Re-run if needed.

2. **Duplicate data**
   - Solution: The upsert logic prevents duplicates. Check `is_historical` flag.

3. **Missing date ranges**
   - Solution: Check Toast API limits and ensure credentials have sufficient history access.

### Monitoring

Check sync status:
```sql
SELECT * FROM cron_logs 
WHERE job_name = 'sync-historical-data' 
ORDER BY executed_at DESC;
```

## Future Enhancements

1. **Additional Data Sources**: Extend historical sync to Eventbrite and OpenDate.io
2. **Predictive Analytics**: Use historical data for ML-based forecasting
3. **Custom Reports**: Build report templates based on historical patterns
4. **Automated Insights**: Daily/weekly AI-generated insights based on historical comparison
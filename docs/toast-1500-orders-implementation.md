# Toast 1500 Orders Sync Implementation Guide

## Overview

This document outlines the complete implementation plan for fetching the most recent 1500 orders from Toast POS using their paginated API (100 orders per page).

## Endpoints to Create

### 1. Primary Bulk Sync Endpoint

**File:** `/api/sync-toast-1500.js`

- Fetches 1500 orders using pagination (15 pages × 100 orders)
- Processes each page immediately to avoid memory issues
- Implements retry logic with exponential backoff
- Returns detailed progress report

### 2. Sync Status Check Endpoint (Optional)

**File:** `/api/toast-sync-status.js`

- Returns current sync progress if implementing async processing
- Checks `api_credentials` table for last sync status

## Files to Reference

### Core Implementation References

#### 1. Working Sync Logic

**File:** `/api/sync-toast-correct.js`

- **Purpose:** Contains the correct database insertion logic
- **Key Functions:**
  - `getToastToken()` - Authentication pattern
  - Order → Check → Payment → Selection insertion flow
  - Upsert with conflict resolution pattern
  - Error handling for individual records

#### 2. Pagination Example

**File:** `/api/check-toast-recent.js` (lines 76-83)

```javascript
const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
  headers,
  params: {
    startDate: range.start,
    endDate: range.end,
    pageSize: 100, // Max allowed by Toast
  },
});
```

#### 3. Database Schema

**File:** `/supabase/migrations/20250728225439_remote_schema.sql`

- **Tables:**
  - `toast_orders` - Main order data
  - `toast_checks` - Individual checks/bills
  - `toast_payments` - Payment records
  - `toast_selections` - Line items
- **Key Constraints:**
  - Composite unique keys: `(order_guid, snapshot_timestamp)`

#### 4. Environment Variables

**File:** `.env.local` (example)

```
TOAST_CLIENT_ID=<from Vercel env>
TOAST_CLIENT_SECRET=<from Vercel env>
TOAST_LOCATION_ID=<from Vercel env>
SUPABASE_URL=<from Vercel env>
SUPABASE_SERVICE_KEY=<from Vercel env>
```

#### 5. API Credentials Update Pattern

**File:** `/api/sync-toast-week.js` (lines 221-228)

```javascript
await supabase
  .from('api_credentials')
  .update({
    last_successful_fetch: new Date().toISOString(),
    last_error: null,
  })
  .eq('service', 'toast');
```

## Implementation Details

### Pagination Algorithm

```javascript
async function fetchAllOrders(headers, targetCount = 1500) {
  const orders = [];
  const pageSize = 100;
  const maxPages = Math.ceil(targetCount / pageSize);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // Look back 90 days

  for (let page = 1; page <= maxPages; page++) {
    try {
      // Add delay to respect rate limits
      if (page > 1) await sleep(500);

      const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
        headers,
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pageSize,
          page,
        },
      });

      const pageOrders = response.data || [];
      orders.push(...pageOrders);

      // Stop if we've hit the target or no more data
      if (orders.length >= targetCount || pageOrders.length < pageSize) {
        break;
      }
    } catch (error) {
      console.error(`Failed to fetch page ${page}:`, error.message);
      // Continue to next page on error
    }
  }

  return orders.slice(0, targetCount); // Ensure we don't exceed target
}
```

### Error Recovery Strategy

1. **Individual Page Failures:** Log error, continue to next page
2. **Authentication Failures:** Retry once, then fail entire operation
3. **Database Insert Failures:** Log and continue (upsert prevents data loss)
4. **Timeout Protection:** Check elapsed time, gracefully stop at 50 seconds

### Progress Tracking

```javascript
const progressData = {
  totalRequested: 1500,
  totalFetched: 0,
  pagesProcessed: 0,
  failedPages: [],
  pageDetails: [],
  startTime: Date.now(),
};

// After each page
progressData.pageDetails.push({
  page: currentPage,
  orders: pageOrders.length,
  revenue: calculatePageRevenue(pageOrders),
  duration: Date.now() - pageStartTime,
});
```

### Memory Management

- Process each page immediately after fetching
- Don't store all 1500 orders in memory at once
- Clear page data after database insertion
- Use streaming for large JSON responses if needed

## Vercel Configuration

### Function Timeout

**File:** `vercel.json`

```json
{
  "functions": {
    "api/sync-toast-1500.js": {
      "maxDuration": 60
    }
  }
}
```

## Testing Approach

### 1. Unit Tests

- Mock Toast API responses
- Test pagination logic with various page counts
- Test error handling scenarios

### 2. Integration Tests

- Use test database
- Verify data integrity after sync
- Check for duplicate handling

### 3. Load Testing

- Monitor memory usage during 1500 order processing
- Measure total execution time
- Check database connection pooling

## Monitoring & Logging

### Key Metrics to Track

1. **API Performance**
   - Response time per page
   - Failed page requests
   - Total API calls made

2. **Database Performance**
   - Insert time per batch
   - Failed inserts
   - Duplicate conflicts handled

3. **Business Metrics**
   - Total revenue synced
   - Orders by date range
   - Average order value

### Logging Strategy

```javascript
console.log({
  event: 'toast_sync_1500',
  phase: 'pagination',
  page: currentPage,
  ordersRetrieved: pageOrders.length,
  elapsedTime: Date.now() - startTime,
  memoryUsage: process.memoryUsage().heapUsed,
});
```

## Deployment Checklist

1. **Environment Variables**
   - [ ] Verify all Toast credentials in Vercel
   - [ ] Confirm Supabase connection details
   - [ ] Set appropriate Node.js version

2. **Database Preparation**
   - [ ] Ensure tables exist with correct schema
   - [ ] Verify indexes for performance
   - [ ] Check connection pool settings

3. **API Configuration**
   - [ ] Confirm Toast API endpoint URLs
   - [ ] Verify authentication flow
   - [ ] Test with small page count first

4. **Monitoring Setup**
   - [ ] Configure error alerting
   - [ ] Set up performance tracking
   - [ ] Create dashboard for sync status

## Rollback Strategy

1. **Data Rollback**
   - Use `snapshot_timestamp` to identify bulk import
   - Query to remove all records from failed sync:

   ```sql
   DELETE FROM toast_orders WHERE snapshot_timestamp = '<failed_sync_timestamp>';
   -- Cascade deletes will handle related tables
   ```

2. **Code Rollback**
   - Revert to previous deployment in Vercel
   - Disable endpoint if causing issues

## Future Enhancements

1. **Incremental Sync**
   - Track last synced order timestamp
   - Only fetch new orders in subsequent runs

2. **Parallel Processing**
   - Fetch multiple pages concurrently (with rate limit consideration)
   - Use worker threads for database inserts

3. **Real-time Progress**
   - Implement WebSocket for live progress updates
   - Store progress in Redis for status checks

4. **Data Validation**
   - Compare Toast totals with synced data
   - Alert on significant discrepancies

## Security Considerations

1. **API Key Protection**
   - Never log full API credentials
   - Use environment variables only
   - Rotate keys regularly

2. **Rate Limiting**
   - Implement client-side rate limiting
   - Track API usage to avoid quota issues

3. **Data Privacy**
   - Ensure PII is handled appropriately
   - Follow data retention policies
   - Implement access controls

## Support & Troubleshooting

### Common Issues

1. **"Page must be 1 or greater"**
   - Ensure page parameter starts at 1, not 0

2. **Timeout Errors**
   - Reduce number of orders per sync
   - Increase delay between pages

3. **Memory Errors**
   - Process smaller batches
   - Clear variables after use

### Debug Commands

```bash
# Check sync status
curl https://venue-smart-dashboard.vercel.app/api/toast-sync-status

# Test with small batch
curl -X POST https://venue-smart-dashboard.vercel.app/api/sync-toast-1500 \
  -H "Content-Type: application/json" \
  -d '{"limit": 200}'
```

## Success Criteria

1. Successfully fetch 1500 orders (or all available if less)
2. Process all orders without data loss
3. Complete within 60-second timeout
4. Provide detailed success/error reporting
5. Handle failures gracefully without corrupting data

---

_Document Version: 1.0_  
_Last Updated: January 2025_  
_Implementation Priority: High_

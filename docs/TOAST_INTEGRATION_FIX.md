# Toast Integration Fix Documentation

## Issues Identified and Fixed

### 1. **Hardcoded Venue ID**
- **Problem**: Backend was using `'default-venue-id'` instead of the actual venue ID
- **Fixed in**: 
  - `/api/dashboard.ts` - Now uses Jack's location ID: `bfb355cb-55e4-4f57-af16-d0d18c11ad3c`
  - `/api/chat.ts` - Now accepts venue ID from request params with Jack's as default

### 2. **Mock Data in Dashboard**
- **Problem**: Hourly performance chart was using `Math.random()` to generate fake data
- **Fixed in**: `/src/pages/dashboard.tsx`
  - Now fetches real hourly data from the dashboard API
  - Falls back to industry-standard distribution if no real data available

### 3. **No Historical Data Access**
- **Problem**: Dashboard API didn't support date range queries
- **Fixed in**: `/api/dashboard.ts`
  - Added support for `startDate` and `endDate` query parameters
  - Added hourly breakdown calculation from real Toast transactions

### 4. **No Manual Data Fetch**
- **Created**: `/api/manual-fetch.ts`
  - Allows fetching historical Toast data on demand
  - Automatically calculates daily KPIs after fetching

### 5. **No Data Visibility**
- **Created**: `/src/pages/toast-data-viewer.tsx`
  - New page to view raw Toast transaction data
  - Shows daily summaries vs actual transaction totals
  - Includes manual fetch UI for historical data

## How to Use

### 1. Setup the Venue
```bash
# Run the setup script to configure Jack's on Water Street
cd packages/backend && npx tsx ../../scripts/setup-venue.ts
```

### 2. Fetch Historical Data
```bash
# Using the API endpoint
curl -X POST http://localhost:3000/api/manual-fetch \
  -H "Content-Type: application/json" \
  -d '{
    "venueId": "bfb355cb-55e4-4f57-af16-d0d18c11ad3c",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

Or use the UI at http://localhost:5173/toast-data

### 3. View Real Data
- **Dashboard**: http://localhost:5173/ - Now shows real revenue metrics
- **Toast Data Viewer**: http://localhost:5173/toast-data - Raw transaction data
- **AI Assistant**: http://localhost:5173/ai - Can now answer questions with real data

## API Changes

### Dashboard API
```typescript
// GET /api/dashboard
// Now supports:
?venueId=bfb355cb-55e4-4f57-af16-d0d18c11ad3c
?startDate=2024-01-01
?endDate=2024-01-31

// Returns additional fields:
{
  kpis: {
    hourlyBreakdown: [
      { hour: 0, revenue: 15000, transactions: 5, customers: 3 },
      // ... for each hour
    ]
  },
  historicalData: [...] // When date range provided
}
```

### Chat API
```typescript
// POST /api/chat
// Now accepts:
{
  "message": "What was our revenue last week?",
  "venueId": "bfb355cb-55e4-4f57-af16-d0d18c11ad3c" // Optional
}
```

### Manual Fetch API
```typescript
// POST /api/manual-fetch
{
  "venueId": "bfb355cb-55e4-4f57-af16-d0d18c11ad3c",
  "startDate": "2024-01-01", // Optional, defaults to 30 days ago
  "endDate": "2024-01-31",   // Optional, defaults to today
  "apis": ["toast"]          // Optional, defaults to ["toast"]
}
```

## Database Changes

The system now properly uses these tables:
- `venues` - Stores venue configuration
- `api_credentials` - Stores Toast API credentials
- `toast_transactions` - Raw transaction data from Toast
- `daily_summaries` - Aggregated daily metrics
- `daily_kpis` - Detailed KPI calculations

## Verification Steps

1. **Check Toast Data is Flowing**:
   - Visit http://localhost:5173/toast-data
   - You should see real transactions (not mock data)

2. **Verify AI Has Access**:
   - Go to http://localhost:5173/ai
   - Ask: "What was our total revenue yesterday?"
   - The response should include actual dollar amounts

3. **Confirm Hourly Chart**:
   - Check the dashboard at http://localhost:5173/
   - The hourly performance chart should show realistic patterns (not random data)

## Troubleshooting

### No Data Showing?
1. Run manual fetch: `curl -X POST http://localhost:3000/api/manual-fetch ...`
2. Check Toast credentials in `api_credentials` table
3. Verify venue exists with ID `bfb355cb-55e4-4f57-af16-d0d18c11ad3c`

### AI Not Using Real Data?
1. Check that venue ID is being passed correctly
2. Verify `toast_transactions` table has data
3. Check `daily_summaries` are being calculated

### Date Range Not Working?
1. Ensure dates are in ISO format: `YYYY-MM-DD`
2. Check that transactions exist for the requested dates
3. Verify KPIs have been calculated for those dates
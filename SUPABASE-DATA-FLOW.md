# 📊 Supabase Data Flow for Jack's on Water Street

## Current Architecture: Toast → Supabase → Dashboard

### 1. **Data Flow**
```
Toast POS API → Sync Function → Supabase → Dashboard/AI
```

### 2. **New Endpoints Created**

#### A. **Sync Toast to Supabase** (`/api/sync-toast-to-supabase`)
- Fetches data from Toast API
- Stores in `toast_transactions` table
- Handles voided/deleted checks
- Processes in batches of 500

#### B. **Dashboard from Supabase** (`/api/dashboard-supabase`)
- Reads from Supabase (not Toast directly)
- Calculates metrics from stored data
- Returns KPIs and alerts
- Much faster than API calls

#### C. **Cron Job** (`/api/cron/sync-all-data`)
- Runs every 3 minutes
- Syncs last 24 hours of data
- Calculates KPIs
- Updates daily summaries

#### D. **Manual Sync** (`/api/manual-sync`)
- Sync any date range on demand
- Useful for historical data import

### 3. **Setup Instructions**

1. **Run the setup script**:
   ```bash
   node setup-jacks-venue.js
   ```

2. **Deploy everything**:
   ```bash
   git add -A
   git commit -m "Add Supabase data flow for Toast integration"
   git push
   vercel --prod
   ```

3. **Test the new flow**:
   - Dashboard: https://venue-smart-dashboard.vercel.app/api/dashboard-supabase
   - Manual sync: POST to /api/manual-sync

### 4. **Benefits**

✅ **Faster Performance**: Dashboard loads from database, not API
✅ **Historical Data**: All transactions stored permanently
✅ **Offline Access**: Works even if Toast API is down
✅ **Better Analytics**: Can run complex queries on stored data
✅ **Audit Trail**: Complete history of all transactions

### 5. **Database Schema**

**toast_transactions table**:
- `transaction_id`: Unique identifier
- `total_amount`: Total including tax/tips (in cents)
- `tax_amount`: Tax amount (in cents)
- `tip_amount`: Tip amount (in cents)
- `created_at`: When transaction occurred
- `itemizations`: JSON array of items sold
- `payment_details`: JSON array of payment methods

### 6. **Automatic Sync**

The cron job runs every 3 minutes and:
1. Fetches new Toast transactions
2. Stores them in Supabase
3. Calculates current KPIs
4. Updates daily summaries

### 7. **Manual Historical Import**

To import historical data (e.g., all of 2024):
```bash
curl -X POST https://venue-smart-dashboard.vercel.app/api/manual-sync \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "service": "toast"
  }'
```

### 8. **Verify Revenue Accuracy**

The system now:
- Uses `check.totalAmount` (includes tax + tips)
- Skips voided/deleted checks
- Stores amounts in cents, converts to dollars
- Maintains complete audit trail

Your AI will now query Supabase for accurate historical data!
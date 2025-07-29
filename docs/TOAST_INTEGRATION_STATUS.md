# Toast Integration Status and Next Steps

## Current Status (2025-07-28)

### What We Discovered

1. **Two Different Data Models Exist**:
   - **sync-toast-1500.js**: Populates normalized tables (toast_orders, toast_checks, toast_payments, toast_selections)
   - **ToastConnector.ts**: Populates flattened table (toast_transactions)
   - The revenue endpoints query toast_transactions, which is why they show $0

2. **Toast API is Working**:
   - Successfully tested with sync-toast-1500.js
   - Retrieved 200 orders with $2,550 in revenue
   - Data is being stored correctly in toast_orders, toast_checks, and toast_payments tables

3. **Database Schema**:
   - Migration was applied to store dollar amounts (not cents)
   - Both table structures exist in the database
   - toast_transactions has 209 records (from earlier testing)
   - toast_payments now has 202 records (from sync script)

## Files That Need Updates

### Option 1: Update ToastConnector to Use Normalized Tables (Recommended)

**Files to modify**:
1. `/packages/shared/src/connectors/toast/toast-connector.ts`
   - Update `saveTransactions()` to save to toast_orders, toast_checks, toast_payments
   - Remove the transaction transformation logic
   - Match the sync-toast-1500.js structure

2. `/packages/backend/src/services/kpi-calculator.ts`
   - Update queries to read from toast_checks/toast_payments instead of toast_transactions

3. `/packages/backend/api/revenue-by-date.js`
   - Update to query toast_checks table for revenue data

### Option 2: Update Sync Script to Use Flattened Structure

**Files to modify**:
1. `/api/sync-toast-1500.js`
   - Transform the hierarchical data into flat transactions
   - Save to toast_transactions table instead

2. Update cron job to use the same logic

## Next Steps

1. **Decide on data model**:
   - Normalized (toast_orders → toast_checks → toast_payments) - Better for detailed reporting
   - Flattened (toast_transactions) - Simpler but less flexible

2. **Update the chosen approach**:
   - If normalized: Update ToastConnector to match sync-toast-1500.js
   - If flattened: Update sync-toast-1500.js to match ToastConnector

3. **Update all endpoints**:
   - Revenue endpoints
   - Dashboard endpoints
   - KPI calculations

4. **Test end-to-end**:
   - Run sync
   - Check revenue endpoints
   - Verify dashboard displays data

## Current Table Usage

| Table | Used By | Contains |
|-------|---------|----------|
| toast_transactions | ToastConnector.ts, revenue endpoints | 209 records (old data) |
| toast_orders | sync-toast-1500.js | 200 records |
| toast_checks | sync-toast-1500.js | 200 records |
| toast_payments | sync-toast-1500.js | 202 records |

## Commands for Testing

```bash
# Run Toast sync (populates normalized tables)
node run-toast-sync.js

# Check revenue endpoint (queries toast_transactions)
curl -X GET "https://venue-smart-dashboard.vercel.app/api/revenue-by-date?date=2025-07-28" -H "Authorization: Bearer $CRON_SECRET"

# Run TypeScript connector (populates toast_transactions)
# Currently runs via cron job or data orchestrator
```
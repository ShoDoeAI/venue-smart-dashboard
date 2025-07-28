# Toast Sync Issue - Solution Summary

## What We Discovered

1. **The Problem**: Toast sync was failing with "cannot insert into view 'toast_transactions'"
2. **Root Cause**: `toast_transactions` is a PostgreSQL VIEW (read-only), not a TABLE
3. **The Fix**: Insert into the base tables that the view aggregates from

## How We Fixed It

### 1. Used Supabase CLI to Pull Schema

```bash
npx supabase db pull --db-url "postgresql://postgres.bmhplnojfuznflbyqqze:NbKLyY5VYcZb1u9Z@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
```

### 2. Discovered the Database Structure

The `toast_transactions` VIEW aggregates data from:

- `toast_orders` - Order information
- `toast_checks` - Check/bill details
- `toast_payments` - Payment records
- `toast_selections` - Individual items

### 3. Created Correct Sync Endpoint

Created `/api/sync-toast-correct.js` that:

- Inserts orders into `toast_orders`
- Inserts checks into `toast_checks`
- Inserts payments into `toast_payments`
- Inserts items into `toast_selections`

## Test the Fix

```bash
# Test the corrected sync endpoint
curl -X POST https://venue-smart-dashboard.vercel.app/api/sync-toast-correct \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Clean Up Required

### Remove These Unnecessary Files

```bash
# Diagnostic endpoints created during debugging
rm api/toast-raw-data.js
rm api/test-minimal-insert.js
rm api/test-supabase-connection.js
rm api/create-table-direct.js
rm api/test-simple-insert.ts
rm api/check-simple-table.ts
rm api/create-simple-tables.ts

# Failed sync attempts
rm api/sync-toast-simple.ts
rm api/sync-toast-v2.ts
rm api/sync-toast-direct.ts
rm api/sync-toast-bypass-rls.ts
rm api/sync-toast-sql.ts
```

### Update These Files

1. Update `/api/cron/fetch-data.ts` to use the correct sync logic
2. Update type definitions in `/packages/shared/src/types/database.generated.ts`
3. Remove references to `simple_transactions` table

## Lessons Learned

1. **Always use Supabase CLI** for database operations (as now documented in CLAUDE.md)
2. **Check actual schema** before assuming table structures
3. **Views are read-only** - insert into base tables instead
4. **Don't create workarounds** - fix the root cause

## Next Steps

1. Test the sync with production data
2. Clean up unnecessary files
3. Update all Toast sync references to use the correct approach
4. Monitor for successful syncs

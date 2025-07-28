# Toast POS Data Sync Issue - Complete Analysis

## Current Situation

### The Problem

1. **Toast sync is failing** with error: `cannot insert into view "toast_transactions"`
2. **Root cause**: `toast_transactions` is a VIEW (read-only), not a TABLE
3. **Attempted solution**: Use `simple_transactions` table instead
4. **New problem**: `simple_transactions` table doesn't exist in the database

### Evidence

```json
// From /api/test-supabase-connection response:
{
  "testQueryResult": {
    "error": {
      "code": "42P01",
      "message": "relation \"public.simple_transactions\" does not exist"
    }
  }
}
```

## What We're Trying to Accomplish

### 1. Understand Current Database Schema

We need to pull the actual database schema to see:

- What tables actually exist
- Why `toast_transactions` is a view
- What table the view is based on
- Whether we should use an existing table or create `simple_transactions`

### 2. Fix the Toast Sync

Once we understand the schema, we need to:

- Update sync endpoints to use the correct table
- Ensure the table has the right columns
- Handle the data transformation properly

## Relevant Files

### Sync Endpoints (All trying to insert into wrong table)

- `/api/sync-toast-to-supabase.js` - Original sync, inserts to `toast_transactions`
- `/api/sync-toast-simple.ts` - Simplified sync, inserts to `toast_transactions`
- `/api/sync-toast-v2.ts` - Attempts to use `simple_transactions`
- `/api/sync-toast-direct.ts` - Direct SQL approach
- `/api/sync-toast-bypass-rls.ts` - Bypass RLS attempt

### Table Creation Attempts

- `/api/create-simple-tables.ts` - Tries to create `simple_transactions` via RPC
- `/api/create-table-direct.js` - Direct SQL table creation

### Type Definitions

- `/packages/shared/src/types/database.generated.ts` - Shows `toast_transactions` as a table (outdated)

## Using Supabase CLI

### Step 1: Configure Connection

First, we need to set up the Supabase project connection:

```bash
# Initialize Supabase project (if not already done)
npx supabase init

# Link to your remote project
npx supabase link --project-ref <your-project-ref>
```

### Step 2: Pull Current Schema

```bash
# This will show us what tables/views actually exist
npx supabase db pull
```

This creates local migration files showing the current database state.

### Step 3: Analyze the Schema

After pulling, check:

- `/supabase/migrations/` - Will contain the current schema
- Look for `toast_transactions` view definition
- Find what table(s) the view references

### Step 4: Create Proper Migration

Based on what we find, either:

**Option A: If there's an existing transactions table**

```sql
-- Update sync to use the correct table name
```

**Option B: If we need to create simple_transactions**

```bash
npx supabase migration new create_simple_transactions
```

Then add:

```sql
CREATE TABLE IF NOT EXISTS public.simple_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, transaction_id)
);

CREATE INDEX idx_simple_transactions_date ON simple_transactions(transaction_date);
CREATE INDEX idx_simple_transactions_source ON simple_transactions(source);
```

### Step 5: Push Migration

```bash
npx supabase db push
```

## Connection Issues

The current error suggests incorrect database credentials. You need:

1. **Get connection string from Supabase Dashboard**:
   - Go to Settings > Database
   - Copy the connection string
   - Make sure to use the correct password

2. **Set environment variable**:

   ```bash
   export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
   ```

3. **Or use Supabase CLI login**:
   ```bash
   npx supabase login
   ```

## Clean Up Plan

Once we fix the schema:

1. Remove all diagnostic endpoints created during debugging
2. Update the sync endpoints to use the correct table
3. Update type definitions to match actual schema
4. Test the sync with real Toast data

## Next Steps

1. Fix the Supabase CLI connection (see Connection Issues above)
2. Run `npx supabase db pull` to see actual schema
3. Make decision on which table to use
4. Create proper migration if needed
5. Update all sync endpoints
6. Clean up unnecessary files

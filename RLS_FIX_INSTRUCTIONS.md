# Fix Row Level Security (RLS) Issue

The data isn't saving because Row Level Security is blocking inserts. Here's how to fix it:

## Option 1: Disable RLS in Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to **Table Editor** in the left sidebar
4. Click on the `simple_transactions` table
5. Look for the **RLS** toggle (usually in the top right of the table view)
6. Toggle it to **OFF** (disabled)
7. Repeat for these tables if they exist:
   - `daily_summaries`
   - `toast_transactions`
   - `venues`
   - `api_sync_status`

## Option 2: Use SQL Editor

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Paste this SQL:

```sql
-- Disable RLS on all relevant tables
ALTER TABLE simple_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE venues DISABLE ROW LEVEL SECURITY;
ALTER TABLE toast_transactions DISABLE ROW LEVEL SECURITY;
```

5. Click **Run**

## Option 3: Get the Service Role Key

If you want to keep RLS enabled:

1. Go to your Supabase dashboard
2. Click **Settings** → **API**
3. Find the **service_role** key (NOT the anon key)
4. In Vercel, go to your project settings
5. Update `SUPABASE_SERVICE_KEY` with the actual service_role key

## After Fixing RLS

Once RLS is disabled, run:

```bash
curl -X GET https://venue-smart-dashboard.vercel.app/api/sync-toast-v2
```

This should successfully sync your Toast data, and the AI chat will be able to see revenue information.

## Why This Happened

- Supabase enables RLS by default for security
- The Vercel integration might have provided the anon key instead of service_role key
- Since this is a single-venue app, you don't need RLS
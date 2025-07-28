# Supabase CLI Setup Instructions

## Get Your Database Password

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/bmhplnojfuznflbyqqze/settings/database
   - Sign in to your account

2. **Get Database Password**
   - Go to Settings → Database
   - Find "Connection string" section
   - Click "Reveal password"
   - Copy the password (it's the part after `postgres:` and before `@`)

3. **Set Environment Variable**
   ```bash
   export SUPABASE_DB_PASSWORD="your-database-password-here"
   ```

## Link Supabase Project

```bash
# Link to your project
npx supabase link --project-ref bmhplnojfuznflbyqqze

# When prompted for database password, paste the password from step 2
```

## Pull Database Schema

Once linked, pull the current schema:

```bash
npx supabase db pull
```

This will:

- Connect to your remote database
- Generate migration files in `/supabase/migrations/`
- Show you the actual database structure

## Alternative: Use Supabase CLI Login

If you have access to the Supabase account:

```bash
# Login to Supabase (opens browser)
npx supabase login

# Then link project
npx supabase link --project-ref bmhplnojfuznflbyqqze
```

## Check What Was Pulled

After successful pull:

```bash
# List migration files
ls -la supabase/migrations/

# Check for toast_transactions view
grep -r "toast_transactions" supabase/migrations/

# Check what tables exist
grep -r "CREATE TABLE" supabase/migrations/
```

## Troubleshooting

If you get "Wrong password" error:

1. Make sure you're using the database password, not your Supabase account password
2. Check that you're copying the password from the correct project
3. Try using the connection string directly:
   ```bash
   npx supabase db pull --db-url "postgresql://postgres:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
   ```

## Next Steps

Once we have the schema:

1. We'll see if `toast_transactions` is indeed a view
2. Find what table(s) it references
3. Decide whether to use existing tables or create new ones
4. Update all sync endpoints accordingly

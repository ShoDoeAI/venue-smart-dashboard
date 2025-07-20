# Setup Guide for venuesmartdash

## Important Project Names
- **Supabase Project**: `venuesmartdash`
- **Vercel Project**: `venue-smart-dashboard` (if using template, it might create its own)
- **GitHub Repo**: `venue-smart-dashboard`

## Step 1: Get Supabase Credentials

1. Go to: https://app.supabase.com/project/venuesmartdash/settings/api
2. Copy these values:
   - **Project URL**: `https://[something].supabase.co`
   - **Anon/Public Key**: `eyJ...` (long string)
   - **Service Role Key**: `eyJ...` (different long string) - KEEP SECRET!

## Step 2: Set Up Environment Variables

### For Vercel Deployment:
Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Replace [...] with your actual values from Supabase
SUPABASE_URL=https://[...].supabase.co
SUPABASE_SERVICE_KEY=eyJ[...]
SUPABASE_ANON_KEY=eyJ[...]

# IMPORTANT: Frontend variables need VITE_ prefix
VITE_SUPABASE_URL=https://[...].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ[...]

# Other required keys
ANTHROPIC_API_KEY=sk-ant-[...]
CRON_SECRET=any-random-string-you-generate

# At least one API integration (example: Toast)
TOAST_ACCESS_TOKEN=your-token
TOAST_LOCATION_ID=your-location-id
```

### For Local Development:
Create `.env.local` in the root directory:

```bash
# Copy the example file
cp .env.example.venuesmartdash .env.local

# Edit with your actual values
# Make sure to fill in all the values from Supabase
```

## Step 3: Database Setup

Since you're using the Vercel + Supabase template, the database might already be set up. Check if tables exist:

1. Go to: https://app.supabase.com/project/venuesmartdash/editor
2. Look for these tables:
   - venue_config
   - api_credentials
   - venue_snapshots
   - daily_summaries
   - alerts

If tables are missing, run our migrations:
```bash
# From project root
npx supabase db push --db-url "postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
```

## Step 4: Update Your Code

Since Supabase project is `venuesmartdash`, the URL format will be:
- Pattern: `https://[project-ref].supabase.co`
- Example: `https://abcdefghijk.supabase.co`

Make sure your environment variables match this pattern!

## Common Issues

### "Invalid API Key"
- Make sure you're using the Service Role key for backend
- Make sure you're using the Anon key for frontend (VITE_ prefixed)

### "Project not found"
- The Supabase URL must match your project
- Don't use `venuesmartdash.supabase.co` - use the generated ID

### "CORS Error"
- Add your Vercel domain to Supabase allowed origins
- Go to: Authentication → URL Configuration

## Verification Checklist

- [ ] Supabase project `venuesmartdash` is active
- [ ] Copied all keys from Supabase dashboard
- [ ] Added all environment variables to Vercel
- [ ] VITE_ prefixed variables for frontend
- [ ] Database tables exist
- [ ] No hardcoded URLs in the code

## Remember
Your Supabase project name is `venuesmartdash` but:
- The actual URL will have a random ID, not "venuesmartdash"
- Example: `https://xkcdghjklmno.supabase.co` ✅
- NOT: `https://venuesmartdash.supabase.co` ❌
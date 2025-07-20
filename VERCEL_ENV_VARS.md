# Vercel Environment Variables Configuration

## Required Environment Variables for Vercel Deployment

Copy and paste these into your Vercel project settings:
https://vercel.com/[your-username]/[your-project]/settings/environment-variables

### 1. Supabase Configuration (REQUIRED)

```env
# Backend Variables
SUPABASE_URL=https://bmhplnojfuznflbyqqze.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho

# Frontend Variables (MUST have VITE_ prefix)
VITE_SUPABASE_URL=https://bmhplnojfuznflbyqqze.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho
```

### 2. AI Integration (REQUIRED)

```env
ANTHROPIC_API_KEY=sk-ant-your_actual_key_here
```

### 3. Security (REQUIRED)

```env
CRON_SECRET=generate_a_long_random_string_here
```

### 4. API Integrations (At least ONE required for testing)

#### Toast POS:
```env
TOAST_ACCESS_TOKEN=your_toast_token
TOAST_LOCATION_ID=your_location_id
```

#### Eventbrite:
```env
EVENTBRITE_OAUTH_TOKEN=your_eventbrite_token
```

#### OpenDate.io:
```env
OPENDATE_CLIENT_ID=your_client_id
OPENDATE_CLIENT_SECRET=your_client_secret
OPENDATE_REFRESH_TOKEN=your_refresh_token
```

### 5. Optional APIs (Add when ready)

```env
WISK_API_KEY=your_wisk_key
AUDIENCE_REPUBLIC_API_KEY=your_audience_key
META_ACCESS_TOKEN=your_meta_token
OPENTABLE_API_KEY=your_opentable_key
```

## How to Add Variables in Vercel:

1. Go to your Vercel project dashboard
2. Click "Settings" in the top navigation
3. Click "Environment Variables" in the left sidebar
4. For EACH variable above:
   - Enter the variable name (e.g., `SUPABASE_URL`)
   - Enter the value
   - Select all environments: ✓ Production ✓ Preview ✓ Development
   - Click "Save"

## Important Notes:

1. **VITE_ Prefix**: All frontend variables MUST start with `VITE_`
2. **No Quotes**: Don't wrap values in quotes in Vercel
3. **Service Key Security**: The `SUPABASE_SERVICE_KEY` should only be in backend, never exposed to frontend
4. **All Environments**: Make sure to check all three environment boxes

## Verification After Adding:

1. Trigger a new deployment:
   ```bash
   vercel --force
   ```

2. Check function logs:
   ```bash
   vercel logs
   ```

3. Visit your deployment and check:
   - `/api/health` - Should return OK
   - Browser console - No Supabase errors
   - Network tab - API calls using correct URLs

## Common Issues:

- **"Missing Supabase URL"**: You forgot the VITE_ prefix for frontend
- **"Invalid API Key"**: Double-check you copied the full key including `eyJ...`
- **"CORS Error"**: Add your Vercel domain to Supabase allowed URLs
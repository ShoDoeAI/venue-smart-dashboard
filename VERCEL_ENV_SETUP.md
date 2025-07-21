# Vercel Environment Variables Setup

To make the Toast API work on Vercel, you need to add these environment variables in your Vercel project settings:

## Steps:

1. Go to https://vercel.com/dashboard
2. Click on your `venue-smart-dashboard` project
3. Go to "Settings" tab
4. Click on "Environment Variables" in the left sidebar
5. Add these variables:

### Required Variables:

| Variable Name | Value |
|--------------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key (see below) |
| `TOAST_CLIENT_ID` | Your Toast client ID |
| `TOAST_CLIENT_SECRET` | Your Toast client secret |
| `TOAST_LOCATION_ID` | Your Toast location ID |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

### To get your Supabase Anon Key:
1. Go to https://supabase.com/dashboard
2. Select your `venuesmartdash` project
3. Go to Settings > API
4. Copy the `anon public` key

## After Adding Variables:
1. Click "Save" for each variable
2. Go to the "Deployments" tab
3. Click the three dots on the latest deployment
4. Select "Redeploy"
5. Wait for the deployment to complete

Your API should now return real Toast data!
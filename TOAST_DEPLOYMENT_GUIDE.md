# Toast API Full Deployment Guide

## Prerequisites Checklist ✅
You already have:
- ✅ Supabase tables created (venues, toast_*, api_credentials, etc.)
- ✅ Environment variables set in Vercel
- ✅ Toast credentials configured

## Step 1: Deploy Latest Code
```bash
# Commit the new endpoints
git add .
git commit -m "Add Toast setup and test endpoints"
git push origin main

# Deploy to Vercel
vercel --prod
```

## Step 2: Set Up Toast Credentials in Database
After deployment, run this command (replace YOUR_URL and YOUR_CRON_SECRET):

```bash
curl -X POST https://YOUR_URL.vercel.app/api/setup-toast \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Toast credentials configured successfully",
  "venue_id": "...",
  "venue_name": "VenueSync Demo"
}
```

## Step 3: Test Toast Connection
Test if Toast API is working:

```bash
curl -X GET https://YOUR_URL.vercel.app/api/test-toast \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Toast connection test successful",
  "summary": {
    "data_fetched": {
      "orders": 10,
      "payments": 15,
      ...
    }
  }
}
```

## Step 4: Trigger Manual Data Fetch
Force the cron job to run immediately:

```bash
curl -X POST https://YOUR_URL.vercel.app/api/cron/fetch-data \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Step 5: Verify in Supabase
Check these tables in Supabase:
1. `cron_logs` - Should show execution history
2. `toast_orders` - Should contain order data
3. `toast_payments` - Should contain payment data
4. `api_sync_status` - Should show last sync time

## Troubleshooting

### If setup-toast fails:
- Check that venues table exists
- Verify TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, TOAST_LOCATION_ID are in Vercel env

### If test-toast fails:
- Run setup-toast first
- Check error details in response
- Verify Toast credentials are correct

### If no data appears:
- You're using sandbox credentials (demo data)
- Check if there's recent activity in the time range
- Look at cron_logs table for errors

### Common Issues:
1. **"No active venue found"** - Run setup-toast first
2. **"401 Unauthorized"** - Wrong CRON_SECRET
3. **"Toast credentials not found"** - Run setup-toast endpoint
4. **No data returned** - Normal for sandbox during off hours

## Automatic Operation
Once everything is working:
- Cron job runs every 3 minutes automatically
- Data flows into Toast tables
- Frontend can query aggregated data

## Environment Variables Required in Vercel:
```
SUPABASE_URL=https://bmhplnojfuznflbyqqze.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
SUPABASE_ANON_KEY=eyJhbG...
TOAST_CLIENT_ID=mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7
TOAST_CLIENT_SECRET=-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4
TOAST_LOCATION_ID=bfb355cb-55e4-4f57-af16-d0d18c11ad3c
TOAST_ENVIRONMENT=sandbox
CRON_SECRET=<your-secret>
```
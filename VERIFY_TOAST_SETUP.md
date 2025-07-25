# Toast Production Setup Verification

## Current Status
Your app is currently showing **SANDBOX** data (Jack's on Water Street).

## Why This Is Happening

1. **The app reads Toast credentials from the Supabase database**, not directly from Vercel environment variables
2. **The database still contains sandbox credentials**
3. **The TypeScript API endpoints that would update the database are not deployed** (only JavaScript files in `/api` directory are deployed)

## Quick Solution

Since the update endpoints aren't deployed, you have two options:

### Option 1: Update via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (bmhplnojfuznflbyqqze)
3. Go to Table Editor → `api_credentials` table
4. Find the row with `api_name` or `service` = 'toast'
5. Edit the `credentials` JSON field to include your production values:
   ```json
   {
     "clientId": "YOUR_PRODUCTION_CLIENT_ID",
     "clientSecret": "YOUR_PRODUCTION_CLIENT_SECRET",
     "locationGuid": "YOUR_PRODUCTION_LOCATION_ID",
     "environment": "production"
   }
   ```
6. Save the changes
7. The app will use the new credentials on the next data fetch (within 3 minutes)

### Option 2: Deploy the TypeScript Endpoints

The TypeScript files in `packages/backend/api/` need to be compiled to JavaScript and placed in the root `/api` directory for Vercel to use them.

1. Build the backend: `cd packages/backend && pnpm build`
2. Copy compiled files to `/api` directory
3. Deploy to Vercel: `vercel --prod`

## Verifying the Change

After updating the credentials, check:
```bash
curl -s https://venue-smart-dashboard.vercel.app/api/dashboard | grep "Jack"
```

If you still see "Jack's on Water Street", the app is using sandbox data.
If you see your actual venue name, you're using production data!

## Important Notes

- The Toast Location ID you're using (bfb355cb-55e4-4f57-af16-d0d18c11ad3c) appears to be a sandbox ID
- Make sure you have your actual production Location ID from Toast
- Production credentials can be found in Toast Portal: https://pos.toasttab.com → Account Settings → API Access
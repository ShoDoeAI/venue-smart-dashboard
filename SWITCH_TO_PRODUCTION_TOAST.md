# Switching Toast from Sandbox to Production Data

## Current Status

The app is currently using **Toast sandbox data** (demo venue: Jack's on Water Street). To switch to your real production Toast data, follow these steps:

## Method 1: Update via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your `venue-smart-dashboard` project

2. **Update Environment Variables**
   - Go to Settings → Environment Variables
   - Update or add these variables:

   ```
   TOAST_ENVIRONMENT=production
   TOAST_CLIENT_ID=<your-production-client-id>
   TOAST_CLIENT_SECRET=<your-production-client-secret>
   TOAST_LOCATION_ID=<your-production-location-guid>
   ```

3. **Trigger the Update**
   - After setting the variables, visit:

   ```
   https://venue-smart-dashboard.vercel.app/api/update-toast-production
   ```

   - Add header: `Authorization: Bearer <your-CRON_SECRET>`
   - This will update the database to use production credentials

4. **Fetch Fresh Data**
   - Visit: `https://venue-smart-dashboard.vercel.app/api/cron/fetch-data`
   - This will start fetching real production data

## Method 2: Update Locally

1. **Update your `.env` file**

   ```env
   # Toast Production Credentials
   TOAST_ENVIRONMENT=production
   TOAST_CLIENT_ID=your_production_client_id
   TOAST_CLIENT_SECRET=your_production_client_secret
   TOAST_LOCATION_ID=your_production_location_guid
   ```

2. **Run the update script**

   ```bash
   # Start the backend
   cd packages/backend
   pnpm dev

   # In another terminal, run the update
   curl -X POST http://localhost:3000/api/update-toast-production \
     -H "Authorization: Bearer test-secret" \
     -H "Content-Type: application/json"
   ```

3. **Fetch new data**
   ```bash
   curl http://localhost:3000/api/cron/fetch-data \
     -H "Authorization: Bearer test-secret"
   ```

## Verifying the Switch

1. **Check current status**

   ```bash
   curl http://localhost:3000/api/verify-toast-data \
     -H "Authorization: Bearer test-secret"
   ```

2. **Look for**:
   - `environment: "production"` (not "sandbox")
   - Your actual location name (not "Jack's on Water Street")
   - Real transaction data from your venue

## Important Notes

- **Data will update every 3 minutes** via the cron job
- **Historical data**: The system will start fetching data from the moment you switch
- **No data loss**: Switching environments won't delete any existing data
- **API limits**: Toast has rate limits, so initial data population may take time

## Troubleshooting

If you don't see production data after switching:

1. **Check credentials**: Ensure all Toast credentials are correct
2. **Check logs**: Look at Vercel Function logs for any errors
3. **Manual test**: Try `/api/test-toast` to debug connection issues
4. **Rate limits**: Toast may rate limit initial bulk fetches

## Getting Toast Production Credentials

1. Log into Toast Portal: https://pos.toasttab.com
2. Go to Account Settings → API Access
3. Create a new API client with these permissions:
   - Orders: Read
   - Payments: Read
   - Customers: Read
   - Configuration: Read
4. Copy the Client ID, Client Secret, and your Location GUID

## Security Note

Never commit production credentials to Git. Always use environment variables!
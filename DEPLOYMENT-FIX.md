# 🚀 VenueSync Deployment Fix Guide

## Current Issues
1. **404 Errors on Production** - API routes not resolving correctly
2. **Toast Data Accuracy** - Not showing real restaurant data

## Immediate Actions Required

### 1. Deploy Latest Changes
```bash
# Commit and push all changes
git add -A
git commit -m "Fix API routes and Toast verification"
git push

# Deploy to Vercel
vercel --prod
```

### 2. Set Environment Variables
Run this command in your terminal:
```bash
# Set Toast credentials
vercel env add TOAST_CLIENT_ID production
# Enter: mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7

vercel env add TOAST_CLIENT_SECRET production
# Enter: -PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4

vercel env add TOAST_LOCATION_ID production
# Enter: bfb355cb-55e4-4f57-af16-d0d18c11ad3c

# You also need to add:
vercel env add ANTHROPIC_API_KEY production
# Enter your Anthropic API key

# If using Supabase:
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
```

### 3. Test Your Deployment

#### A. Open Diagnostic Tool
Open in your browser:
```
file:///Users/sho/Code/venue-smart-dashboard/deploy-diagnostic.html
```

#### B. Test These Endpoints
1. **Verify Toast**: https://venue-smart-dashboard.vercel.app/api/verify-toast
2. **Dashboard**: https://venue-smart-dashboard.vercel.app/api/dashboard
3. **AI Chat**: https://venue-smart-dashboard.vercel.app/ai

### 4. What You Should See

#### ✅ Successful Toast Verification
```json
{
  "success": true,
  "verification": {
    "authentication": "SUCCESS",
    "restaurant": {
      "name": "Your Restaurant Name",
      "address": "Your Address"
    },
    "lastWeekend": {
      "saturdayRevenue": "1234.56",
      "sundayRevenue": "2345.67",
      "sampleMenuItems": ["Item 1", "Item 2", ...]
    },
    "dataQuality": {
      "isProduction": true
    }
  }
}
```

#### ✅ AI Chat Working
- Ask: "What was our revenue last weekend?"
- Should return actual dollar amounts from your Toast account

### 5. Troubleshooting

#### If Still Getting 404s:
1. Check Vercel deployment logs: `vercel logs`
2. Ensure all files in `/api` directory are `.js` (not `.ts`)
3. Verify functions are being detected: `vercel ls`

#### If Toast Data Is Wrong:
1. Visit `/api/verify-toast` - check if `isProduction: true`
2. Verify location ID matches your restaurant
3. Check weekend revenue is > $100 (confirms real data)

### 6. Quick Fixes Applied

✅ **Fixed vercel.json** - Now supports both .js and .ts functions
✅ **Created /api/verify-toast** - Comprehensive Toast verification
✅ **Added cron function** - /api/cron/fetch-data.js
✅ **Created diagnostic tool** - deploy-diagnostic.html

### 7. Next Steps After Deploy

1. Visit https://venue-smart-dashboard.vercel.app/api/verify-toast
2. Confirm you see your restaurant name and real menu items
3. Check weekend revenue matches your actual sales
4. Test AI chat with questions about your historical data

## Need Help?

If issues persist after deployment:
1. Share the output from `/api/verify-toast`
2. Check `vercel logs` for errors
3. Run the diagnostic tool and share results
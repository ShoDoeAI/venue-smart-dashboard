# 🚀 Vercel Deployment Action Plan

## Current Status
- ✅ API directory symlinks are already set up correctly
- ✅ Build scripts are properly configured
- ✅ vercel.json is correctly configured
- ✅ .vercelignore created to optimize deployment
- ❌ Multiple Vercel projects causing confusion
- ❌ Environment variables not set in Vercel

## Immediate Actions Required

### 1. Choose ONE Vercel Project (5 min)
```bash
# Link to a single project
vercel link

# When prompted:
# 1. Choose "Link to existing project"
# 2. Select ONE of these (recommend: venue-smart-dashboard)
#    - venue-smart-dashboard ✅ (use this one)
#    - venuesmartdash ❌ (delete)
#    - venuesmartdashboard ❌ (delete)
#    - venue-smartdashboard ❌ (delete)
#    - venue-smart-dashboard-frontend ❌ (delete)
```

### 2. Set Environment Variables (10 min)

Go to: https://vercel.com/[your-team]/venue-smart-dashboard/settings/environment-variables

Add these variables for ALL environments (Production, Preview, Development):

```env
# CRITICAL - Without these, deployment will fail
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-key
SUPABASE_ANON_KEY=eyJ...your-anon-key

# API Keys (at least one required for testing)
TOAST_ACCESS_TOKEN=your-toast-token
TOAST_LOCATION_ID=your-location-id
EVENTBRITE_OAUTH_TOKEN=your-eventbrite-token
ANTHROPIC_API_KEY=sk-ant-...your-key

# OpenDate.io (if you have it)
OPENDATE_CLIENT_ID=your-client-id
OPENDATE_CLIENT_SECRET=your-secret
OPENDATE_REFRESH_TOKEN=your-refresh-token

# Cron Secret (generate a random string)
CRON_SECRET=generate-random-string-here

# Frontend Variables (MUST start with VITE_)
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

### 3. Test Local Build (2 min)
```bash
# Run the test script
./vercel-deploy-test.sh
```

### 4. Deploy to Preview (3 min)
```bash
# Deploy to preview environment
vercel

# Expected output:
# ✅ Linked to your-name/venue-smart-dashboard
# ✅ Deployed to https://venue-smart-dashboard-xxx.vercel.app
```

### 5. Check Deployment
- Visit the preview URL
- Check /api/health endpoint
- View function logs: `vercel logs`

### 6. Deploy to Production (if preview works)
```bash
vercel --prod
```

## Common Issues & Fixes

### Issue: "Cannot find module '@venuesync/shared'"
**Fix**: The build order is wrong. Our package.json already has the correct order.

### Issue: "Missing environment variables"
**Fix**: Check Vercel dashboard, ensure all VITE_ prefixed vars are set.

### Issue: "404 on all pages except /"
**Fix**: The rewrites in vercel.json handle this. Make sure it matches the provided config.

### Issue: "Serverless Function failed"
**Fix**: Check function logs with `vercel logs`, likely missing env vars.

## Success Checklist

- [ ] Only ONE Vercel project linked
- [ ] All environment variables set in Vercel
- [ ] Local build passes: `pnpm run build`
- [ ] Preview deployment works
- [ ] API health check responds: `/api/health`
- [ ] Frontend loads at root URL
- [ ] No TypeScript errors in logs

## Next Steps After Deployment

1. **Set up custom domain** (optional)
   - Add domain in Vercel dashboard
   - Update DNS records

2. **Enable Cron Jobs**
   - Cron jobs are automatically enabled
   - Monitor in Vercel dashboard > Functions > Cron

3. **Set up monitoring**
   - Enable Vercel Analytics
   - Set up error alerts

4. **Test core features**
   - Dashboard loads with data
   - AI chat responds
   - Alerts display correctly

## Emergency Rollback

If something goes wrong:
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

## Support

- Check logs: `vercel logs`
- View build output: Vercel dashboard > Deployments
- Debug locally: `vercel dev`

Remember: The most common issue is missing environment variables!
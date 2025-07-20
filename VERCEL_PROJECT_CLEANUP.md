# Vercel Project Cleanup Guide

## Current Projects (based on your deployment IDs):
1. `venuesmartdash` ❌ DELETE
2. `venue-smart-dashboard-frontend` ❌ DELETE  
3. `venuesmartdashboard` ❌ DELETE
4. `venue-smartdashboard` ❌ DELETE
5. `venue-smart-dashboard` ✅ KEEP THIS ONE

## Step 1: First, Link to the Correct Project

```bash
# Make sure you're linked to the right one
vercel link

# Choose:
# - Link to existing project
# - Select: venue-smart-dashboard
```

## Step 2: Delete Other Projects

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. For each project you want to delete:
   - Click on the project name
   - Go to Settings (top navigation)
   - Scroll to bottom "Delete Project" section
   - Click "Delete"
   - Type the project name to confirm
   - Click "Delete Project"

### Option B: Via CLI

```bash
# List all your projects first
vercel list

# Remove each unwanted project
vercel remove venuesmartdash --yes
vercel remove venue-smart-dashboard-frontend --yes
vercel remove venuesmartdashboard --yes
vercel remove venue-smartdashboard --yes
```

## Step 3: Verify Correct Project

```bash
# Check you're linked to the right project
vercel list

# Should show only: venue-smart-dashboard
```

## Why Delete the Others?

1. **Avoids confusion** - No more accidental deployments to wrong project
2. **Cleaner dashboard** - Easier to manage
3. **Prevents conflicts** - No duplicate deployments
4. **Cost efficiency** - Won't count against any limits

## Before Deleting, Check:

- ✅ No production traffic going to those projects
- ✅ No custom domains attached
- ✅ No important environment variables only in those projects
- ✅ You have the main project (venue-smart-dashboard) set up

## After Cleanup:

1. All future deployments will go to `venue-smart-dashboard`
2. Your deployment history will be cleaner
3. No more confusion about which project to use

## Note on Environment Variables

If any of the deleted projects had environment variables set, make sure to add them to `venue-smart-dashboard`:

1. Go to: https://vercel.com/[your-username]/venue-smart-dashboard/settings/environment-variables
2. Add all variables from DEPLOYMENT_ACTION_PLAN.md
3. Save for all environments (Production, Preview, Development)

Ready to deploy after cleanup:
```bash
vercel          # Preview deployment
vercel --prod   # Production deployment
```
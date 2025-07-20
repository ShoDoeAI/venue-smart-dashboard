# Vercel Setup Instructions

## Prerequisites
- Vercel CLI is now installed (`vercel` command)
- You need a Vercel account (sign up at https://vercel.com)

## Setup Steps

### 1. Login to Vercel
```bash
vercel login
```
This will open your browser to authenticate.

### 2. Link the Project
```bash
vercel link
```
- Choose "Link to existing project" if you've already created one on Vercel
- Or choose "Create new project" if this is the first time

### 3. Configure Environment Variables
You'll need to set these environment variables in Vercel Dashboard:

#### Required Variables:
```
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=your_anthropic_api_key

# API Keys for Each Service
EVENTBRITE_API_KEY=your_eventbrite_key
TOAST_API_KEY=your_toast_key
WISK_API_KEY=your_wisk_key
RESY_API_KEY=your_resy_key
AUDIENCE_REPUBLIC_API_KEY=your_audience_republic_key
META_ACCESS_TOKEN=your_meta_access_token
OPENDATE_API_KEY=your_opendate_key

# Toast Specific
TOAST_LOCATION_ID=your_toast_location_id
TOAST_RESTAURANT_ID=your_toast_restaurant_id

# Eventbrite Specific
EVENTBRITE_ORGANIZATION_ID=your_eventbrite_org_id

# Meta Specific
META_PAGE_ID=your_meta_page_id

# Resy Specific
RESY_VENUE_ID=your_resy_venue_id

# Audience Republic Specific
AUDIENCE_REPUBLIC_VENUE_ID=your_audience_republic_venue_id

# OpenDate Specific
OPENDATE_VENUE_ID=your_opendate_venue_id
```

### 4. Deploy to Vercel
```bash
vercel
```
This will deploy to a preview URL.

For production deployment:
```bash
vercel --prod
```

## Project Structure for Vercel

The project is configured with:
- **Backend Functions**: Located in `packages/backend/api/`
- **Frontend**: Built output from `packages/frontend/dist/`
- **Cron Jobs**: Configured in `vercel.json`
  - Data fetching: Every 3 hours
  - KPI calculation: Daily at 1 AM
  - Cleanup: Weekly on Sundays at 3 AM

## Important Notes

1. **Function Timeouts**: 
   - Regular functions: 60 seconds max
   - Cron functions: 300 seconds (5 minutes) max

2. **Build Process**: 
   - The `vercel-build.sh` script handles the monorepo build
   - Builds shared package → backend → frontend in order

3. **API Routes**:
   - All `/api/*` routes are handled by Vercel Functions
   - Frontend routes are served from the built React app

## Troubleshooting

### Build Fails
- Check that all packages build locally: `pnpm build`
- Ensure all dependencies are listed in package.json files
- Check Vercel build logs for specific errors

### Functions Not Working
- Verify environment variables are set in Vercel Dashboard
- Check function logs in Vercel Dashboard
- Test locally with `vercel dev`

### Cron Jobs Not Running
- Verify cron syntax in `vercel.json`
- Check cron logs in Vercel Dashboard
- Ensure functions complete within timeout limits
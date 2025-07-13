# VenueSync Deployment Guide - Vercel

This guide walks you through deploying VenueSync to Vercel for production use.

## Prerequisites

- Vercel account (free tier works)
- GitHub repository connected to Vercel
- All API credentials ready
- Supabase project configured

## Step 1: Prepare for Deployment

### 1.1 Update Configuration Files

Ensure these files are properly configured:

**vercel.json** (already created):
```json
{
  "functions": {
    "packages/backend/api/**/*.ts": {
      "runtime": "@vercel/node@3"
    }
  },
  "crons": [
    {
      "path": "/api/cron/hourly",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/daily", 
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 1.2 Environment Variables

Prepare all environment variables for Vercel:

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Toast API
TOAST_CLIENT_ID=
TOAST_CLIENT_SECRET=
TOAST_RESTAURANT_GUID=

# Eventbrite API  
EVENTBRITE_PRIVATE_TOKEN=
EVENTBRITE_ORGANIZATION_ID=

# OpenDate.io API
OPENDATE_CLIENT_ID=
OPENDATE_CLIENT_SECRET=
OPENDATE_REDIRECT_URI=

# Anthropic
ANTHROPIC_API_KEY=

# Cron Secret
CRON_SECRET=
```

## Step 2: Deploy via Vercel CLI

### 2.1 Install Vercel CLI

```bash
npm i -g vercel
```

### 2.2 Login to Vercel

```bash
vercel login
```

### 2.3 Initial Deployment

From the project root:

```bash
vercel
```

Follow the prompts:
- Link to existing project or create new
- Select scope (personal or team)
- Confirm project settings

### 2.4 Set Environment Variables

```bash
# Set each variable
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
# ... repeat for all variables
```

Or use the Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable for Production environment

### 2.5 Deploy to Production

```bash
vercel --prod
```

## Step 3: Deploy via GitHub Integration

### 3.1 Connect GitHub Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `pnpm build`
   - Output Directory: `packages/frontend/dist`

### 3.2 Configure Build Settings

In Vercel project settings:

**Build & Development Settings:**
- Framework Preset: Other
- Node.js Version: 18.x
- Package Manager: pnpm

**Install Command:**
```bash
pnpm install
```

**Build Command:**
```bash
pnpm build
```

### 3.3 Configure Functions

**Function Region:** 
- Select closest to your venue location

**Function Configuration:**
```json
{
  "maxDuration": 30
}
```

## Step 4: Post-Deployment Setup

### 4.1 Update OAuth Redirect URIs

Update your OAuth providers with production URLs:

**OpenDate.io:**
```
https://your-app.vercel.app/api/auth/opendate/callback
```

### 4.2 Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### 4.3 Set Up Monitoring

**Vercel Analytics:**
1. Enable Analytics in project settings
2. Add tracking script to frontend

**Function Logs:**
1. Go to Functions tab in Vercel dashboard
2. Monitor execution and errors

### 4.4 Configure Cron Jobs

Verify cron jobs are active:
1. Go to Functions → Cron Jobs
2. Check execution history
3. Monitor for failures

## Step 5: Production Checklist

### Security
- [ ] All sensitive data in environment variables
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints

### Performance
- [ ] Database indexes created
- [ ] API response caching enabled
- [ ] Frontend assets optimized
- [ ] CDN enabled for static assets

### Monitoring
- [ ] Error tracking configured
- [ ] Uptime monitoring active
- [ ] Performance monitoring enabled
- [ ] Alerts configured

### Backup
- [ ] Database backup scheduled
- [ ] Environment variables documented
- [ ] Disaster recovery plan created

## Step 6: Continuous Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Run tests
        run: pnpm test
        
      - name: Build
        run: pnpm build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Branch Protection

1. Go to GitHub repo settings
2. Add branch protection rules for `main`
3. Require:
   - Pull request reviews
   - Status checks (tests)
   - Up-to-date branches

## Step 7: Rollback Strategy

### Quick Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Git Rollback

```bash
# Revert commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard [commit-hash]
git push --force origin main
```

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Module resolution issues

### Function Timeouts

1. Increase timeout in vercel.json:
```json
{
  "functions": {
    "packages/backend/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### Cron Job Failures

1. Check function logs
2. Verify CRON_SECRET is set
3. Test endpoint manually

### Database Connection Issues

1. Verify Supabase allows Vercel IPs
2. Check connection pooling settings
3. Review Supabase logs

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check cron job execution
- Review performance metrics

**Weekly:**
- Review API usage and limits
- Check database performance
- Update dependencies

**Monthly:**
- Security audit
- Performance optimization
- Cost review

### Scaling Considerations

**When to Scale:**
- Function execution > 90% of limit
- Database connections maxed out
- Response times > 3 seconds

**Scaling Options:**
- Upgrade Vercel plan for more resources
- Implement caching layer
- Database read replicas
- CDN for static assets

## Support

### Vercel Support
- Documentation: [vercel.com/docs](https://vercel.com/docs)
- Community: [github.com/vercel/community](https://github.com/vercel/community)

### Monitoring Services
- [Sentry](https://sentry.io) for error tracking
- [DataDog](https://datadoghq.com) for APM
- [PagerDuty](https://pagerduty.com) for alerts

---

For additional help, refer to the [Testing Guide](TESTING.md) or open an issue on GitHub.
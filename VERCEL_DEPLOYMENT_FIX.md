# Vercel Deployment Fix Guide

## Issue Analysis

Your deployment failures are caused by:

1. **Multiple Vercel Projects**: You have 4 different project names, causing confusion
2. **API Directory Structure**: Vercel expects serverless functions in root `/api` or specified directories
3. **Build Configuration**: Missing proper build order for monorepo
4. **Environment Variables**: Not properly set in Vercel dashboard

## Fix Steps

### Step 1: Clean Up Vercel Projects

First, let's standardize on ONE project name:

```bash
# Remove old projects and link to a single one
vercel link

# When prompted, choose:
# - Existing project
# - Select or create: venue-smart-dashboard
```

### Step 2: Fix vercel.json

The current vercel.json has issues. Here's the corrected version:

```json
{
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install",
  "framework": "vite",
  "outputDirectory": "packages/frontend/dist",
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60
    },
    "api/cron/*.ts": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/cron/fetch-data",
      "schedule": "0 */3 * * *"
    },
    {
      "path": "/api/cron/calculate-kpis",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/cleanup-snapshots",
      "schedule": "0 3 * * 0"
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 3: Create .vercelignore

Create a `.vercelignore` file to optimize deployment:

```
# Dependencies
node_modules
.pnpm-store

# Build outputs
dist
.next
out

# Development files
*.log
.env*.local
.DS_Store

# Testing
coverage
.nyc_output
**/*.test.ts
**/*.spec.ts

# Documentation
docs
*.md
!README.md

# Scripts and configs
scripts
vitest.config.ts
jest.config.js

# Git
.git
.gitignore

# Editor
.vscode
.idea
```

### Step 4: Set Environment Variables

Go to Vercel Dashboard > Your Project > Settings > Environment Variables

Add ALL of these:

```bash
# Supabase (Required)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# API Keys (Required for each integration)
TOAST_ACCESS_TOKEN=your_toast_token
TOAST_LOCATION_ID=your_location_id
EVENTBRITE_OAUTH_TOKEN=your_eventbrite_token
OPENDATE_CLIENT_ID=your_opendate_client_id
OPENDATE_CLIENT_SECRET=your_opendate_client_secret
OPENDATE_REFRESH_TOKEN=your_refresh_token
ANTHROPIC_API_KEY=your_anthropic_key

# Optional APIs (can add later)
WISK_API_KEY=your_wisk_key
AUDIENCE_REPUBLIC_API_KEY=your_audience_key
META_ACCESS_TOKEN=your_meta_token
OPENTABLE_API_KEY=your_opentable_key

# Cron Secret (Required)
CRON_SECRET=your_random_secret_here

# Frontend (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 5: Update Build Scripts

The build order is critical for monorepos. Update root package.json:

```json
{
  "scripts": {
    "build": "pnpm run build:shared && pnpm run build:backend && pnpm run build:frontend",
    "build:shared": "pnpm --filter @venuesync/shared build",
    "build:backend": "pnpm --filter @venuesync/backend build",
    "build:frontend": "pnpm --filter @venuesync/frontend build"
  }
}
```

### Step 6: Fix API Routes

Vercel needs API files in the root `/api` directory. Since yours are in `packages/backend/api`, we need to either:

**Option A: Move API files (Recommended)**
```bash
# Move api directory to root
mv packages/backend/api ./api
```

**Option B: Create symlinks**
```bash
# Create symlink from root to backend api
ln -s packages/backend/api api
```

### Step 7: Deploy

```bash
# Clear cache and deploy
vercel --prod --force

# Or for preview
vercel
```

## Troubleshooting

### Build Errors
- Check `vercel logs` for details
- Ensure all dependencies are in package.json (not devDependencies)
- Check TypeScript errors with `pnpm typecheck`

### Function Errors
- Verify environment variables are set
- Check function logs in Vercel dashboard
- Test locally with `vercel dev`

### 404 Errors
- Check rewrites in vercel.json
- Ensure outputDirectory is correct
- Verify index.html exists in dist

## Quick Checklist

- [ ] Single Vercel project linked
- [ ] vercel.json updated
- [ ] .vercelignore created
- [ ] All environment variables set
- [ ] API directory in root (or symlinked)
- [ ] Build scripts work locally
- [ ] No TypeScript errors

## Testing Deployment

1. **Local build test**:
   ```bash
   pnpm run build
   # Should complete without errors
   ```

2. **Vercel dev test**:
   ```bash
   vercel dev
   # Should start local server
   ```

3. **Preview deployment**:
   ```bash
   vercel
   # Should deploy to preview URL
   ```

4. **Production deployment**:
   ```bash
   vercel --prod
   # Should deploy to production
   ```
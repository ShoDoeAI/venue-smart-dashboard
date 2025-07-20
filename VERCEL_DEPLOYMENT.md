# Vercel Deployment Guide for VenueSync

This guide explains how to deploy the VenueSync monorepo to Vercel.

## Prerequisites

1. Install Vercel CLI: `npm i -g vercel`
2. Have access to a Vercel account
3. Have all required environment variables ready

## Project Setup

### 1. Link to Vercel Project

First, ensure you're using a single Vercel project. If you have multiple projects, delete the extras and use only one:

```bash
vercel link
```

Choose or create a project named `venue-smart-dashboard`.

### 2. Environment Variables

Set up the following environment variables in Vercel Dashboard (Settings → Environment Variables):

#### Required Variables:

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=your_anthropic_api_key

# API Keys for Integrations
TOAST_API_KEY=your_toast_api_key
TOAST_LOCATION_GUID=your_location_guid
EVENTBRITE_API_KEY=your_eventbrite_api_key
WISK_API_KEY=your_wisk_api_key
RESY_API_KEY=your_resy_api_key
AUDIENCE_REPUBLIC_API_KEY=your_audience_republic_api_key
META_API_KEY=your_meta_api_key
OPENTABLE_API_KEY=your_opentable_api_key

# Frontend Variables (must be prefixed with VITE_)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Deploy Commands

#### Development Deploy:
```bash
vercel
```

#### Production Deploy:
```bash
vercel --prod
```

## Architecture Overview

The deployment uses the following structure:

1. **API Functions**: Symlinked from `packages/backend/api/` to root `api/` directory
2. **Frontend**: Built from `packages/frontend/` and served from `packages/frontend/dist/`
3. **Shared Package**: Built first as a dependency for both backend and frontend

## Build Process

The build process executes in this order:
1. Install dependencies with `pnpm install --frozen-lockfile`
2. Build shared package: `pnpm build:shared`
3. Build backend: `pnpm build:backend`
4. Build frontend: `pnpm build:frontend`

## Troubleshooting

### Common Issues:

1. **"Function not found" errors**: Ensure the `api/` directory exists with proper symlinks
2. **Build failures**: Check that all packages build locally first with `pnpm build`
3. **Runtime errors**: Verify all environment variables are set in Vercel
4. **Cron job failures**: Ensure cron paths match the API function paths

### Debug Steps:

1. Check build logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Test locally with `vercel dev`
4. Ensure Node version matches (>=18.0.0)

## Project Structure for Vercel

```
venue-smart-dashboard/
├── api/                    # Symlinks to backend API functions
│   ├── actions/
│   ├── ai/
│   ├── cron/
│   └── *.ts
├── packages/
│   ├── shared/            # Shared types and utilities
│   ├── backend/           # Original API functions
│   └── frontend/          # React application
├── vercel.json           # Vercel configuration
└── .vercelignore         # Files to ignore during deployment
```

## Important Notes

- Never commit `.env` files
- Always use `pnpm` for package management
- The `api/` directory contains symlinks, not actual files
- Cron jobs run on UTC timezone
- Maximum function duration is set to 60s (300s for cron jobs)
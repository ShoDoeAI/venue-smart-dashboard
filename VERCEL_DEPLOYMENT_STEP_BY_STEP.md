# 🚀 Vercel Deployment - Complete Step-by-Step Guide

## ⚠️ IMPORTANT: You're getting errors because you have 4 different Vercel projects!

Let's fix this properly once and for all.

---

## Step 1: Delete ALL Old Vercel Projects (5 minutes)

### Option A: Via Vercel Dashboard (Easier)

1. Go to: https://vercel.com/dashboard
2. You'll see these projects - DELETE ALL OF THEM:
   - `venuesmartdash` ❌
   - `venue-smart-dashboard-frontend` ❌
   - `venuesmartdashboard` ❌
   - `venue-smartdashboard` ❌

3. For each project:
   - Click on the project name
   - Click "Settings" (top menu)
   - Scroll to bottom
   - Click "Delete Project" (red button)
   - Type the project name to confirm
   - Click "Delete"

### Option B: Via CLI

```bash
# List all projects
vercel list

# Remove each one
vercel remove venuesmartdash --yes
vercel remove venue-smart-dashboard-frontend --yes
vercel remove venuesmartdashboard --yes
vercel remove venue-smartdashboard --yes
```

---

## Step 2: Remove Local Vercel Link (1 minute)

```bash
# Make sure you're in the project root
cd /Users/sho/Code/venue-smart-dashboard

# Remove any existing link
rm -rf .vercel
```

---

## Step 3: Update Your .env.local with Real API Keys (5 minutes)

Edit `/Users/sho/Code/venue-smart-dashboard/.env.local`:

```bash
# Open in your editor
code .env.local
# or
nano .env.local
```

**MUST UPDATE THESE** (replace with your actual keys):

```env
# Change this line:
ANTHROPIC_API_KEY=your_anthropic_api_key
# To your real key:
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-ACTUAL-KEY-HERE

# Add at least ONE real API (example):
TOAST_ACCESS_TOKEN=YOUR-REAL-TOAST-TOKEN
TOAST_LOCATION_ID=YOUR-REAL-LOCATION-ID
```

---

## Step 4: Create ONE New Vercel Project (3 minutes)

```bash
# Make sure you're in the project root
cd /Users/sho/Code/venue-smart-dashboard

# Create new deployment
vercel

# You'll see prompts - answer EXACTLY like this:
? Set up and deploy "~/Code/venue-smart-dashboard"? [Y/n] Y
? Which scope do you want to deploy to? YOUR-USERNAME
? Link to existing project? [y/N] N
? What's your project's name? venue-smart-dashboard
? In which directory is your code located? ./
```

**IMPORTANT**: When it asks about the framework, it should auto-detect "Vite". If not, select "Other" and enter these manually:

- Build Command: `pnpm run build`
- Output Directory: `packages/frontend/dist`
- Install Command: `pnpm install`

---

## Step 5: Add ALL Environment Variables (10 minutes)

After deployment completes, you'll get a URL like: https://venue-smart-dashboard-xxx.vercel.app

1. Go to: https://vercel.com/YOUR-USERNAME/venue-smart-dashboard/settings/environment-variables

2. Add EACH of these variables (copy/paste the whole block):

### Required Supabase Variables:

```
Name: SUPABASE_URL
Value: https://bmhplnojfuznflbyqqze.supabase.co
Environments: ✓ Production ✓ Preview ✓ Development

Name: SUPABASE_SERVICE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY
Environments: ✓ Production ✓ Preview ✓ Development

Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho
Environments: ✓ Production ✓ Preview ✓ Development

Name: VITE_SUPABASE_URL
Value: https://bmhplnojfuznflbyqqze.supabase.co
Environments: ✓ Production ✓ Preview ✓ Development

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho
Environments: ✓ Production ✓ Preview ✓ Development
```

### Required API Keys (UPDATE WITH YOUR REAL KEYS):

```
Name: ANTHROPIC_API_KEY
Value: sk-ant-api03-YOUR-REAL-KEY-HERE
Environments: ✓ Production ✓ Preview ✓ Development

Name: CRON_SECRET
Value: my-super-secret-cron-key-12345
Environments: ✓ Production ✓ Preview ✓ Development
```

### At Least One Data Source (ADD YOUR REAL VALUES):

```
Name: TOAST_ACCESS_TOKEN
Value: YOUR-REAL-TOAST-TOKEN
Environments: ✓ Production ✓ Preview ✓ Development

Name: TOAST_LOCATION_ID
Value: YOUR-REAL-LOCATION-ID
Environments: ✓ Production ✓ Preview ✓ Development
```

---

## Step 6: Redeploy with Environment Variables (2 minutes)

```bash
# Force a new deployment with the env vars
vercel --prod --force
```

---

## Step 7: Verify Everything Works (2 minutes)

1. **Check API Health**:

   ```bash
   curl https://YOUR-DEPLOYMENT-URL.vercel.app/api/health
   ```

   Should return: `{"status":"ok"}`

2. **Visit Dashboard**:
   - Go to: https://YOUR-DEPLOYMENT-URL.vercel.app
   - Should see the dashboard load

3. **Check Logs** (if any errors):
   ```bash
   vercel logs
   ```

---

## Common Issues & Fixes:

### "Module not found" errors:

```bash
# Clear cache and redeploy
rm -rf .vercel
vercel --prod --force
```

### "Missing environment variables":

- Double-check ALL variables are added in Vercel dashboard
- Make sure you checked all 3 environment boxes

### "404 on all routes":

- Make sure vercel.json has the correct rewrites
- Check that outputDirectory is set to `packages/frontend/dist`

### "Serverless Function failed":

- Usually missing environment variables
- Check logs: `vercel logs --since 10m`

---

## ✅ Success Checklist:

- [ ] All old projects deleted
- [ ] .vercel folder removed
- [ ] Real API keys in .env.local
- [ ] Single project created: `venue-smart-dashboard`
- [ ] All environment variables added
- [ ] Deployment successful
- [ ] API health check passes
- [ ] Dashboard loads

---

## Need Help?

If you get stuck at any step, run:

```bash
vercel logs --since 10m
```

And share the error message. The most common issue is missing environment variables!

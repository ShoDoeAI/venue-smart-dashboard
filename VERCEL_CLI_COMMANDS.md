# Vercel CLI Commands to Fix Your Deployment

## First, set up your token:

```bash
# Set your token (you've already done this)
export VERCEL_TOKEN="Nvj3ISOIKlSqIXJD5nqlX760"
```

## Now run these commands in order:

### 1. Clean Local Setup

```bash
cd /Users/sho/Code/venue-smart-dashboard
rm -rf .vercel
```

### 2. List Your Projects

```bash
vercel list
```

### 3. Remove Each Duplicate Project

```bash
# Remove each problematic project
vercel remove venuesmartdash --yes
vercel remove venue-smart-dashboard-frontend --yes
vercel remove venuesmartdashboard --yes
vercel remove venue-smartdashboard --yes
```

### 4. Create New Deployment

```bash
# Create fresh deployment
vercel --name venue-smart-dashboard

# When prompted:
# - Set up and deploy? Y
# - Link to existing project? N
# - What's your project's name? venue-smart-dashboard
# - In which directory is your code located? ./
```

### 5. Add Environment Variables via CLI

```bash
# Add each environment variable
vercel env add SUPABASE_URL production < echo "https://bmhplnojfuznflbyqqze.supabase.co"
vercel env add SUPABASE_SERVICE_KEY production < echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY"
vercel env add SUPABASE_ANON_KEY production < echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho"
vercel env add VITE_SUPABASE_URL production < echo "https://bmhplnojfuznflbyqqze.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY production < echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho"
vercel env add ANTHROPIC_API_KEY production < echo "YOUR_REAL_ANTHROPIC_KEY"
vercel env add CRON_SECRET production < echo "your-secret-cron-key"
```

### 6. Deploy to Production

```bash
vercel --prod
```

### 7. Check Your Deployment

```bash
# Get your deployment URL
vercel ls

# Check logs if needed
vercel logs
```

## Alternative: Run the Automated Script

I've created a script that does all of this:

```bash
./fix-vercel-deployment.sh
```

This script will:

1. Clean local setup
2. List projects
3. Remove duplicates
4. Create new deployment
5. Generate env vars file
6. Guide you through the rest

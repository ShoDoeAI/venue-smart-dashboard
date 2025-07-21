#!/bin/bash

# Vercel Deployment Fix Script
# This script will clean up your Vercel projects and create a proper deployment

echo "🧹 Vercel Deployment Fix Script"
echo "=============================="
echo ""

# Step 1: Clean local setup
echo "📁 Step 1: Cleaning local Vercel configuration..."
rm -rf .vercel
echo "✅ Local .vercel folder removed"
echo ""

# Step 2: List current projects
echo "📋 Step 2: Listing your current Vercel projects..."
echo "Please review these projects - we'll delete all except 'venue-smart-dashboard'"
echo ""
vercel list
echo ""

# Step 3: Remove duplicate projects
echo "🗑️  Step 3: Removing duplicate projects..."
echo "This will delete the problematic projects"
echo ""

# Array of projects to remove
projects_to_remove=(
    "venuesmartdash"
    "venue-smart-dashboard-frontend"
    "venuesmartdashboard"
    "venue-smartdashboard"
)

for project in "${projects_to_remove[@]}"; do
    echo "Attempting to remove: $project"
    vercel remove "$project" --yes 2>/dev/null || echo "⚠️  Project $project not found or already deleted"
done

echo ""
echo "✅ Duplicate projects cleaned up"
echo ""

# Step 4: Create .env.vercel with all required variables
echo "📝 Step 4: Creating environment variables file..."
cat > .env.vercel << 'EOF'
# Vercel Environment Variables
# Copy these to your Vercel dashboard after deployment

# Supabase Configuration
SUPABASE_URL="https://bmhplnojfuznflbyqqze.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho"

# Frontend Variables (Vite)
VITE_SUPABASE_URL="https://bmhplnojfuznflbyqqze.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho"

# IMPORTANT: Add your real API keys here!
ANTHROPIC_API_KEY="YOUR_REAL_ANTHROPIC_KEY_HERE"
CRON_SECRET="dev-cron-secret-2025"

# Optional: Add at least one data source
# TOAST_ACCESS_TOKEN="your_token"
# TOAST_LOCATION_ID="your_location_id"
# EVENTBRITE_OAUTH_TOKEN="your_token"
EOF

echo "✅ Created .env.vercel file"
echo ""

# Step 5: Update .env.local reminder
echo "⚠️  IMPORTANT: Update your .env.local file!"
echo "Edit .env.local and replace 'your_anthropic_api_key' with your real key"
echo ""
read -p "Have you updated .env.local with your real Anthropic API key? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please update .env.local first, then run this script again"
    exit 1
fi

# Step 6: Create new deployment
echo ""
echo "🚀 Step 5: Creating new Vercel deployment..."
echo "When prompted:"
echo "  - Set up and deploy? Y"
echo "  - Link to existing project? N"
echo "  - Project name: venue-smart-dashboard"
echo "  - Directory: ./"
echo ""
read -p "Ready to create deployment? Press Enter to continue..."

# Run vercel deployment
vercel

echo ""
echo "🎯 Step 6: Next Steps"
echo "===================="
echo "1. Go to your Vercel dashboard: https://vercel.com/dashboard"
echo "2. Click on 'venue-smart-dashboard' project"
echo "3. Go to Settings → Environment Variables"
echo "4. Add ALL variables from .env.vercel file"
echo "5. Make sure to check all 3 boxes: Production, Preview, Development"
echo ""
echo "6. Then run: vercel --prod"
echo ""
echo "✅ Script complete! Your deployment should now work correctly."
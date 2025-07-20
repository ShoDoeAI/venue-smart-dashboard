#!/bin/bash

# Vercel Deployment Test Script
echo "🚀 Vercel Deployment Test"
echo "========================="

# Step 1: Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    pnpm add -g vercel
fi

# Step 2: Check environment
echo ""
echo "📋 Checking environment..."
echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"

# Step 3: Clean and install
echo ""
echo "🧹 Cleaning and installing dependencies..."
rm -rf node_modules packages/*/node_modules
pnpm install

# Step 4: Build test
echo ""
echo "🔨 Testing build..."
pnpm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi

echo ""
echo "✅ Build successful!"

# Step 5: Check for required files
echo ""
echo "📁 Checking required files..."
FILES_TO_CHECK=(
    "vercel.json"
    ".vercelignore"
    "packages/frontend/dist/index.html"
    "api/dashboard.ts"
    "api/chat.ts"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -e "$file" ] || [ -L "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing!"
    fi
done

# Step 6: Environment variables reminder
echo ""
echo "⚠️  Environment Variables Reminder"
echo "================================="
echo "Make sure these are set in Vercel Dashboard:"
echo ""
echo "Required:"
echo "- SUPABASE_URL"
echo "- SUPABASE_SERVICE_KEY"
echo "- SUPABASE_ANON_KEY"
echo "- TOAST_ACCESS_TOKEN"
echo "- TOAST_LOCATION_ID"
echo "- EVENTBRITE_OAUTH_TOKEN"
echo "- OPENDATE_CLIENT_ID"
echo "- OPENDATE_CLIENT_SECRET"
echo "- OPENDATE_REFRESH_TOKEN"
echo "- ANTHROPIC_API_KEY"
echo "- CRON_SECRET"
echo "- VITE_SUPABASE_URL"
echo "- VITE_SUPABASE_ANON_KEY"
echo ""

# Step 7: Ready to deploy
echo "🎯 Ready to deploy!"
echo ""
echo "To deploy:"
echo "1. Run: vercel link"
echo "   - Choose 'venue-smart-dashboard' as project name"
echo ""
echo "2. Deploy to preview:"
echo "   vercel"
echo ""
echo "3. Deploy to production:"
echo "   vercel --prod"
echo ""
echo "4. Check logs if deployment fails:"
echo "   vercel logs"
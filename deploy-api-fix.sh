#!/bin/bash

# Deploy API Fix Script
# This script ensures the API files are properly deployed to Vercel

echo "🚀 Starting Vercel deployment with API fix..."

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Please run this script from the project root."
    exit 1
fi

# Check if API files exist
if [ ! -d "api" ]; then
    echo "❌ Error: /api directory not found"
    exit 1
fi

# List API files that will be deployed
echo "📁 API files to be deployed:"
ls -la api/

# Deploy to Vercel
echo "🔄 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🔍 Test your endpoints:"
echo "  - https://venue-smart-dashboard.vercel.app/api/dashboard"
echo "  - https://venue-smart-dashboard.vercel.app/api/toast-historical"
echo "  - https://venue-smart-dashboard.vercel.app/api/health"
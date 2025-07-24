#!/bin/bash

echo "🔧 Setting up Vercel Environment Variables"
echo ""

# Toast API
echo "Setting Toast API credentials..."
vercel env add TOAST_CLIENT_ID production <<< "mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7"
vercel env add TOAST_CLIENT_SECRET production <<< "-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4"
vercel env add TOAST_LOCATION_ID production <<< "bfb355cb-55e4-4f57-af16-d0d18c11ad3c"

# Supabase (you'll need to add these)
echo ""
echo "⚠️  You need to manually add these Supabase variables:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_KEY"
echo "   - SUPABASE_ANON_KEY"
echo ""
echo "Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api"

# Anthropic
echo ""
echo "⚠️  You need to manually add:"
echo "   - ANTHROPIC_API_KEY"
echo ""

echo "To add these manually, run:"
echo "vercel env add SUPABASE_URL production"
echo "vercel env add SUPABASE_SERVICE_KEY production"
echo "vercel env add SUPABASE_ANON_KEY production"
echo "vercel env add ANTHROPIC_API_KEY production"
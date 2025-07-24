#!/bin/bash

echo "🔧 Applying Toast Schema Migration with Supabase CLI"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  brew install supabase/tap/supabase"
    echo "or"
    echo "  npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if we're linked to a project
if ! supabase status &> /dev/null; then
    echo "❌ Not linked to a Supabase project!"
    echo ""
    echo "Link to your project with:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "You can find your project ref in your Supabase URL:"
    echo "  https://YOUR_PROJECT_REF.supabase.co"
    exit 1
fi

echo "📊 Current project status:"
supabase status
echo ""

# Apply the migration
echo "🚀 Applying Toast comprehensive schema migration..."
supabase db push

echo ""
echo "✅ Migration applied!"
echo ""
echo "Next steps:"
echo "1. Run: node sync-toast-comprehensive.js"
echo "2. Your Toast data will be synced to the new schema"
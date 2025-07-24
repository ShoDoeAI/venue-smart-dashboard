#!/bin/bash

echo "🔧 Setting up Supabase CLI for Toast Schema Migration"
echo ""

# Extract project ref from .env.local
if [ -f .env.local ]; then
    SUPABASE_URL=$(grep SUPABASE_URL .env.local | cut -d '=' -f2)
    PROJECT_REF=$(echo $SUPABASE_URL | sed -n 's/https:\/\/\(.*\)\.supabase\.co/\1/p')
    
    if [ -n "$PROJECT_REF" ]; then
        echo "📋 Found Supabase project: $PROJECT_REF"
    else
        echo "❌ Could not extract project ref from SUPABASE_URL"
        exit 1
    fi
else
    echo "❌ .env.local not found"
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo ""
    echo "📦 Supabase CLI not found. Installing..."
    
    # Try to install via npm (since the project uses npm)
    if command -v npm &> /dev/null; then
        npm install -g supabase
    else
        echo "❌ npm not found. Please install Supabase CLI manually:"
        echo "  brew install supabase/tap/supabase"
        exit 1
    fi
fi

echo ""
echo "✅ Supabase CLI is installed"
supabase --version

# Initialize Supabase in the project if not already done
if [ ! -f "supabase/config.toml" ]; then
    echo ""
    echo "🚀 Initializing Supabase in project..."
    supabase init
fi

# Link to the project
echo ""
echo "🔗 Linking to Supabase project..."
supabase link --project-ref $PROJECT_REF

# Apply the migration
echo ""
echo "📊 Applying Toast comprehensive schema..."
echo ""

# Check if migration exists
MIGRATION_FILE="supabase/migrations/20240113_toast_comprehensive_schema.sql"
if [ -f "$MIGRATION_FILE" ]; then
    echo "✅ Migration file found"
    
    # Push the migration
    supabase db push
    
    echo ""
    echo "✨ Migration applied successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Verify tables were created:"
    echo "   supabase db diff"
    echo ""
    echo "2. Sync Toast data to new schema:"
    echo "   node sync-toast-comprehensive.js"
else
    echo "❌ Migration file not found at: $MIGRATION_FILE"
    exit 1
fi
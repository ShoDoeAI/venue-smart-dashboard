#!/bin/bash

# Database setup script for VenueSync

echo "🚀 VenueSync Database Setup"
echo "=========================="
echo ""

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL environment variable is not set"
    echo "Please set it in your .env file with your Supabase database URL"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    echo "Please set it in your .env file"
    exit 1
fi

echo "📝 Step 1: Running database migrations..."
echo "This will create all tables and set up RLS policies"
echo ""

# Since we can't use supabase CLI, we'll provide instructions
echo "Please run the following SQL in your Supabase SQL editor:"
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Create a new query"
echo "4. Copy and paste the contents of: supabase/migrations/20240711_initial_schema.sql"
echo "5. Run the query"
echo ""
echo "Press Enter when you've completed this step..."
read

echo "✅ Database schema created!"
echo ""

echo "📝 Step 2: Generating TypeScript types..."
echo ""
echo "To generate types, run this command with your project details:"
echo ""
echo "npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > packages/shared/src/types/database.ts"
echo ""
echo "You can find your project ID in your Supabase dashboard URL"
echo ""

echo "📝 Step 3: Setting up initial API credentials"
echo ""
echo "Run this SQL in your Supabase SQL editor to add encrypted API credentials:"
echo ""
cat << 'EOF'
-- Example: Insert encrypted API credentials
-- Replace 'your_actual_api_key' with real values

INSERT INTO api_credentials (service, credentials, is_active) VALUES
('square', pgp_sym_encrypt('{"access_token": "your_square_token"}', 'your_encryption_key'), true),
('eventbrite', pgp_sym_encrypt('{"api_key": "your_eventbrite_key"}', 'your_encryption_key'), true),
('wisk', pgp_sym_encrypt('{"api_key": "your_wisk_key"}', 'your_encryption_key'), true);

-- To decrypt later:
-- SELECT service, pgp_sym_decrypt(credentials::bytea, 'your_encryption_key')::json FROM api_credentials;
EOF

echo ""
echo "🎉 Database setup instructions complete!"
echo ""
echo "Next steps:"
echo "1. Ensure all SQL has been run in Supabase"
echo "2. Generate TypeScript types"
echo "3. Update .env with your Supabase credentials"
echo "4. Start developing!"
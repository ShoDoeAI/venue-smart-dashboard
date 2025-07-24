#!/bin/bash

echo "🚀 Starting Toast Data Sync to Supabase..."
echo ""
echo "1️⃣ Installing required packages..."
npm install @supabase/supabase-js axios

echo ""
echo "2️⃣ Running sync script..."
node sync-toast-now.js

echo ""
echo "✅ Sync process complete!"
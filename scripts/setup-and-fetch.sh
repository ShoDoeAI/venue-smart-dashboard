#!/bin/bash

echo "🚀 Setting up VenueSync for Jack's on Water Street"
echo "=================================================="

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Run the venue setup script
echo -e "\n🏪 Setting up venue in database..."
cd packages/backend && npx tsx ../../scripts/setup-venue.ts

# Start the dev server in the background
echo -e "\n🌐 Starting development server..."
cd ../.. && pnpm dev &
DEV_PID=$!

# Wait for server to start
echo -e "\n⏳ Waiting for server to start..."
sleep 10

# Trigger manual data fetch
echo -e "\n📊 Fetching Toast data for the last 30 days..."
curl -X POST http://localhost:3000/api/manual-fetch \
  -H "Content-Type: application/json" \
  -d '{
    "venueId": "bfb355cb-55e4-4f57-af16-d0d18c11ad3c",
    "apis": ["toast"]
  }'

echo -e "\n\n✅ Setup complete!"
echo "=================================="
echo "🎉 VenueSync is now running with real Toast data!"
echo ""
echo "📍 Open these URLs in your browser:"
echo "   - Dashboard: http://localhost:5173/"
echo "   - Toast Data Viewer: http://localhost:5173/toast-data"
echo "   - AI Assistant: http://localhost:5173/ai"
echo ""
echo "💡 The AI assistant now has access to real Toast revenue data."
echo "   Try asking questions like:"
echo "   - 'What was our revenue last week?'"
echo "   - 'Show me our sales trends for the past month'"
echo "   - 'What are our peak hours?'"
echo ""
echo "Press Ctrl+C to stop the server"

# Keep the script running
wait $DEV_PID
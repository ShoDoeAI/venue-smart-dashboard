#!/bin/bash

# Test the Toast 1500 orders sync endpoint

echo "Testing Toast 1500 Orders Sync..."
echo "================================"

# Test with a small batch first (200 orders)
echo "1. Testing with 200 orders (2 pages)..."
curl -X POST https://venue-smart-dashboard.vercel.app/api/sync-toast-1500 \
  -H "Content-Type: application/json" \
  -d '{"limit": 200}' \
  -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n"

echo -e "\n\n"

# If you want to test the full 1500 orders, uncomment below:
# echo "2. Testing with full 1500 orders (15 pages)..."
# curl -X POST https://venue-smart-dashboard.vercel.app/api/sync-toast-1500 \
#   -H "Content-Type: application/json" \
#   -d '{"limit": 1500}' \
#   -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n"
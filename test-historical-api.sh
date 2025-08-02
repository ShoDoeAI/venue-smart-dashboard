#!/bin/bash

# Test script to verify historical data API endpoints

API_URL="https://venue-smart-dashboard.vercel.app"
# API_URL="http://localhost:3000"  # Use this for local testing

echo "Testing Historical Data API Endpoints"
echo "====================================="

# Test 1: Health check
echo -e "\n1. Health Check:"
curl -s "$API_URL/api/health" | jq '.'

# Test 2: Historical dashboard for last week
echo -e "\n2. Historical Dashboard (Last 7 days):"
START_DATE=$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)
curl -s "$API_URL/api/dashboard/historical?startDate=$START_DATE&endDate=$END_DATE&granularity=daily" | jq '{success, period, summary}'

# Test 3: Chat API with historical query
echo -e "\n3. Chat API - Historical Query:"
curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What was last week'\''s revenue?",
    "conversationId": "test-historical"
  }' | jq '{success, historicalQuery, timeRange}'

# Test 4: Specific date query
echo -e "\n4. Chat API - Specific Date:"
curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me the revenue for 2024-12-25",
    "conversationId": "test-specific-date"
  }' | jq '{success, historicalQuery, timeRange}'

# Test 5: Comparison query
echo -e "\n5. Chat API - Comparison Query:"
curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Compare this month to last month revenue",
    "conversationId": "test-comparison"
  }' | jq '{success, historicalQuery}'

echo -e "\n\nTo run historical data sync:"
echo "curl -X POST '$API_URL/api/cron/sync-historical-data' -H 'Authorization: Bearer YOUR_ADMIN_SECRET'"
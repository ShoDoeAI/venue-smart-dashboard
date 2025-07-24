#!/bin/bash

# AI Chat API Test Script
# Tests the AI chat endpoint with various queries

API_URL="https://venue-smart-dashboard.vercel.app/api/chat"
AUTH_TOKEN="Bearer $SUPABASE_ANON_KEY"

echo "🤖 Testing AI Chat API..."
echo "========================="

# Test 1: Basic Revenue Query
echo -e "\n📊 Test 1: Basic Revenue Query"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_TOKEN" \
  -d '{
    "message": "What is our revenue today?",
    "venueId": "test-venue"
  }' | jq '.response' | head -20

# Test 2: Historical Comparison
echo -e "\n📈 Test 2: Historical Comparison"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_TOKEN" \
  -d '{
    "message": "Compare this week to last week performance",
    "venueId": "test-venue"
  }' | jq '.response' | head -20

# Test 3: Action Suggestions
echo -e "\n💡 Test 3: Action Suggestions"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_TOKEN" \
  -d '{
    "message": "What actions should I take to improve revenue?",
    "venueId": "test-venue"
  }' | jq '.response' | head -20

# Test 4: Data Sources
echo -e "\n🔌 Test 4: Data Sources Check"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_TOKEN" \
  -d '{
    "message": "What data sources are you connected to?",
    "venueId": "test-venue"
  }' | jq '.response' | head -20

echo -e "\n✅ AI Chat tests complete!"
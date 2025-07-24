#!/bin/bash

echo "🚀 Testing VenueSync Chat API Integration"
echo "========================================"
echo ""

# Production URL
BASE_URL="https://venue-smart-dashboard.vercel.app"

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
curl -s "${BASE_URL}/api/health" | python3 -m json.tool
echo ""

# Test 2: Dashboard Data
echo "2️⃣ Testing Dashboard Endpoint..."
DASHBOARD_RESPONSE=$(curl -s "${BASE_URL}/api/dashboard")
echo "$DASHBOARD_RESPONSE" | python3 -m json.tool | head -20
echo ""

# Extract revenue from dashboard
REVENUE=$(echo "$DASHBOARD_RESPONSE" | python3 -c "import json, sys; data=json.load(sys.stdin); print(data.get('kpis', {}).get('revenueMetrics', {}).get('current', 0))")
echo "Current Revenue: $${REVENUE}"
echo ""

# Test 3: Chat API - Basic Query
echo "3️⃣ Testing Chat API - Revenue Query..."
curl -s -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the current revenue and how is business performing?"
  }' | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'success' in data and data['success']:
    print('✅ Success!')
    print('Response:', data.get('response', '')[:200] + '...')
    print('Has Toast Data:', data.get('dataContext', {}).get('hasToastData', False))
else:
    print('❌ Failed:', data.get('error', 'Unknown error'))
"
echo ""

# Test 4: Chat API - Toast Integration
echo "4️⃣ Testing Chat API - Toast POS Query..."
curl -s -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me the top selling items and payment methods from Toast POS"
  }' | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'success' in data and data['success']:
    print('✅ Success!')
    print('Response:', data.get('response', '')[:200] + '...')
else:
    print('❌ Failed:', data.get('error', 'Unknown error'))
"
echo ""

# Test 5: Chat API - Analytics Query
echo "5️⃣ Testing Chat API - Analytics Query..."
curl -s -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are our peak hours and busiest days? Show year-over-year growth."
  }' | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'success' in data and data['success']:
    print('✅ Success!')
    response = data.get('response', '')
    if 'peak hours' in response.lower() or 'year' in response.lower():
        print('✓ Contains relevant data about peak hours or YoY growth')
    print('Response preview:', response[:200] + '...')
else:
    print('❌ Failed:', data.get('error', 'Unknown error'))
"
echo ""

# Test 6: Alerts Endpoint
echo "6️⃣ Testing Alerts Endpoint..."
curl -s "${BASE_URL}/api/alerts" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'alerts' in data:
    print('✅ Success! Found', len(data['alerts']), 'alerts')
    for alert in data['alerts'][:3]:
        print(f\"  - {alert.get('severity', 'info')}: {alert.get('title', 'No title')}\")
else:
    print('❌ Failed to fetch alerts')
"
echo ""

echo "✨ All tests completed!"
echo ""
echo "Summary:"
echo "- Production URL: ${BASE_URL}"
echo "- Current Revenue: \$${REVENUE}"
echo "- All endpoints tested with real data"
#!/bin/bash

# Test AI chat with queries for all 24 months

echo "🧪 Testing AI Chat with all 24 months of data..."
echo "================================================"
echo ""

API_URL="https://venue-smart-dashboard.vercel.app/api/chat"

# Function to test a query
test_query() {
    local query="$1"
    echo "Q: $query"
    
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$query\", \"sessionId\": \"test-$(date +%s)\"}" | head -200)
    
    # Extract the AI response
    if echo "$response" | grep -q '"response":'; then
        # Extract response text between quotes, handling escaped quotes
        ai_response=$(echo "$response" | grep -o '"response":"[^"]*' | sed 's/"response":"//' | sed 's/\\n/ /g')
        echo "A: $ai_response"
    else
        echo "A: [Error or no response]"
    fi
    echo ""
    sleep 2
}

# Test specific months from each year
echo "=== Testing Specific Months ==="
test_query "What was the revenue in September 2023?"
test_query "What was the revenue in January 2024?"
test_query "What was the revenue in April 2024?"
test_query "What was the revenue in November 2024?"
test_query "What was the revenue in March 2025?"
test_query "What was the revenue in July 2025?"

# Test year totals
echo "=== Testing Year Totals ==="
test_query "What was the total revenue for 2024?"
test_query "What was the total revenue for 2023?"

# Test comparisons
echo "=== Testing Comparisons ==="
test_query "Compare February 2024 vs February 2025 revenue"
test_query "Which month in 2024 had the highest revenue?"

# Test date range queries
echo "=== Testing Date Ranges ==="
test_query "What was the revenue from April to June 2024?"
test_query "Show me Q1 2025 revenue"

echo ""
echo "🎉 Testing complete!"
echo ""
echo "Note: Verify that the AI responses match the synced data:"
echo "- 2023 (Sep-Dec): ~$30K total"
echo "- 2024 (full year): ~$150K total"
echo "- 2025 (Jan-Aug): ~$125K total"
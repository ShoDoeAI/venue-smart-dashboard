#!/bin/bash

echo "Testing Enhanced Chat API with Toast Data Access"
echo "================================================"

# Test 1: Revenue Analysis
echo -e "\n1. Testing Revenue Analysis:"
curl -s -X POST https://venue-smart-dashboard.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is my total revenue for the past week?"}' | python3 -m json.tool | grep -E "(response|hasToastData|totalRevenue)" | head -20

# Test 2: Peak Hours
echo -e "\n\n2. Testing Peak Hours Analysis:"
curl -s -X POST https://venue-smart-dashboard.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are my busiest hours?"}' | python3 -m json.tool | grep -E "(response|peak|hour)" | head -20

# Test 3: Payment Methods
echo -e "\n\n3. Testing Payment Methods:"
curl -s -X POST https://venue-smart-dashboard.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What payment methods do my customers use?"}' | python3 -m json.tool | grep -E "(response|payment|cash|credit)" | head -20

echo -e "\n\nDone! Check the responses above to verify Toast data integration."
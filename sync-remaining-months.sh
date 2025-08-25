#!/bin/bash

# Sync the remaining months that failed

echo "🔄 Syncing remaining months..."
echo ""

BASE_URL="https://venue-smart-dashboard.vercel.app/api/sync-missing-months"

# Failed months
MONTHS=(
  "2023,11"  # November 2023
  "2024,6"   # June 2024
)

for month_data in "${MONTHS[@]}"; do
  IFS=',' read -r year month <<< "$month_data"
  month_name=$(date -d "$year-$month-01" +"%B %Y" 2>/dev/null || echo "$year-$month")
  
  echo -n "📅 Syncing $month_name... "
  
  response=$(curl -s "${BASE_URL}?year=${year}&months=${month}")
  
  if echo "$response" | grep -q '"success":true'; then
    revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | head -1 | cut -d: -f2)
    new_records=$(echo "$response" | grep -o '"newRecords":[0-9]*' | head -1 | cut -d: -f2)
    echo "✅ \$${revenue:-0} (${new_records:-0} new)"
  else
    echo "❌ Failed"
  fi
  
  sleep 2
done

echo ""
echo "🎉 Done!"
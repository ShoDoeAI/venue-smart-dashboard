#!/bin/bash

# Script to sync all months that we know have Toast data
# Based on scan results: 11 months total

echo "🚀 Syncing all known months with Toast data..."
echo "This will sync 11 months of historical data."
echo ""

BASE_URL="https://venue-smart-dashboard.vercel.app/api/sync-missing-months"

# Array of months with data (year,month pairs)
declare -a MONTHS_WITH_DATA=(
  "2023,10"  # October 2023
  "2023,11"  # November 2023
  "2023,12"  # December 2023
  "2024,6"   # June 2024
  "2024,9"   # September 2024
  "2024,11"  # November 2024
  "2025,2"   # February 2025
  "2025,3"   # March 2025
  "2025,6"   # June 2025
  "2025,7"   # July 2025
  "2025,8"   # August 2025
)

echo "Months to sync:"
for month_data in "${MONTHS_WITH_DATA[@]}"; do
  IFS=',' read -r year month <<< "$month_data"
  echo "  - $(date -d "$year-$month-01" +"%B %Y" 2>/dev/null || echo "$year-$month")"
done

echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Starting sync..."
  
  # Process each month
  for month_data in "${MONTHS_WITH_DATA[@]}"; do
    IFS=',' read -r year month <<< "$month_data"
    
    echo ""
    echo "📅 Syncing $year-$month..."
    
    # Call sync endpoint
    response=$(curl -s -X GET "${BASE_URL}?year=${year}&months=${month}")
    
    # Check if successful
    if echo "$response" | grep -q '"success":true'; then
      revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | cut -d: -f2)
      records=$(echo "$response" | grep -o '"newRecords":[0-9]*' | cut -d: -f2)
      echo "✅ Success: \$${revenue:-0} revenue, ${records:-0} new records"
    else
      echo "❌ Failed to sync $year-$month"
      echo "$response" | head -n 3
    fi
    
    # Small delay between requests
    sleep 2
  done
  
  echo ""
  echo "🎉 Sync complete!"
else
  echo "Sync cancelled."
fi
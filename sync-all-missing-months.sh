#!/bin/bash

# Sync script for 24 months of Toast data
# This will sync all missing historical data from Sep 2023 - Apr 2025

echo "🚀 Starting 24-month Toast data sync..."
echo "This will sync 20 months of missing data."
echo "Expected time: 2-4 hours depending on data volume."
echo ""

# Function to sync a year
sync_year() {
    local year=$1
    local months=$2
    echo "📅 Syncing year $year (months: $months)..."
    
    response=$(curl -s -X GET "https://venue-smart-dashboard.vercel.app/api/sync-missing-months?year=$year&months=$months")
    
    # Extract summary info
    processed=$(echo "$response" | grep -o '"monthsProcessed":[0-9]*' | cut -d: -f2)
    revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | cut -d: -f2)
    errors=$(echo "$response" | grep -o '"errors":[0-9]*' | cut -d: -f2)
    
    echo "✅ Completed: $processed months, $revenue total revenue, $errors errors"
    echo "$response" > "sync-results-$year.json"
    echo ""
}

# Quick test first
echo "🧪 Testing with one month first (January 2025 - quick mode)..."
curl -s "https://venue-smart-dashboard.vercel.app/api/sync-missing-months?year=2025&months=1&quick=true" | python3 -m json.tool

echo ""
read -p "Continue with full sync? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Sync in reverse chronological order (most recent first)
    echo ""
    echo "Starting full sync..."
    
    # 2025 missing months (Jan-Apr)
    sync_year 2025 "1,2,3,4"
    
    # 2024 all months
    sync_year 2024 "1,2,3,4,5,6,7,8,9,10,11,12"
    
    # 2023 missing months (Sep-Dec)
    sync_year 2023 "9,10,11,12"
    
    echo "🎉 Sync complete! Check sync-results-*.json for details."
else
    echo "Sync cancelled."
fi
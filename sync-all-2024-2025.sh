#!/bin/bash

echo "🔄 COMPREHENSIVE SYNC - 2024 & 2025"
echo "==================================="
echo ""

BASE_URL="https://venue-smart-dashboard.vercel.app/api/sync-missing-months"

# Function to sync a year
sync_year() {
    local year=$1
    echo "📅 Syncing Year: $year"
    echo "------------------------"
    
    # Sync all 12 months at once
    echo -n "Syncing all months of $year... "
    response=$(curl -s -X GET "${BASE_URL}?year=${year}&months=1,2,3,4,5,6,7,8,9,10,11,12")
    
    if echo "$response" | grep -q '"success":true'; then
        revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | cut -d: -f2)
        new_records=$(echo "$response" | grep -o '"newRecords":[0-9]*' | cut -d: -f2)
        updated_records=$(echo "$response" | grep -o '"updatedRecords":[0-9]*' | cut -d: -f2)
        
        echo "✅ Success!"
        echo "  Total Revenue: $${revenue:-0}"
        echo "  New Records: ${new_records:-0}"
        echo "  Updated Records: ${updated_records:-0}"
    else
        echo "❌ Failed"
        echo "  Response: $response"
    fi
    
    echo ""
}

# Sync 2024
sync_year 2024

# Sync 2025
sync_year 2025

echo "✅ Sync complete!"
echo ""
echo "Next step: Testing AI accuracy..."
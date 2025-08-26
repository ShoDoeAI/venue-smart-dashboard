#!/bin/bash

echo "🔄 MONTH-BY-MONTH SYNC"
echo "====================="
echo ""

BASE_URL="https://venue-smart-dashboard.vercel.app/api/sync-missing-months"
TOTAL_REVENUE=0
TOTAL_NEW=0
TOTAL_UPDATED=0

# Sync individual months
sync_month() {
    local year=$1
    local month=$2
    local month_name=$(date -d "$year-$month-01" +"%B %Y" 2>/dev/null || echo "$year-$month")
    
    echo -n "Syncing $month_name... "
    response=$(curl -s -X GET "${BASE_URL}?year=${year}&months=${month}" --max-time 30)
    
    if echo "$response" | grep -q '"success":true'; then
        revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | cut -d: -f2)
        new=$(echo "$response" | grep -o '"newRecords":[0-9]*' | cut -d: -f2)
        updated=$(echo "$response" | grep -o '"updatedRecords":[0-9]*' | cut -d: -f2)
        
        revenue=${revenue:-0}
        new=${new:-0}
        updated=${updated:-0}
        
        TOTAL_REVENUE=$(echo "$TOTAL_REVENUE + $revenue" | bc)
        TOTAL_NEW=$((TOTAL_NEW + new))
        TOTAL_UPDATED=$((TOTAL_UPDATED + updated))
        
        echo "✅ $${revenue} (${new} new, ${updated} updated)"
    else
        echo "❌ Failed or timeout"
    fi
    
    sleep 2
}

echo "📅 2024 Data:"
echo "-------------"
for month in {1..12}; do
    sync_month 2024 $month
done

echo ""
echo "📅 2025 Data:"
echo "-------------"
for month in {1..8}; do
    sync_month 2025 $month
done

echo ""
echo "========================================="
echo "📊 SYNC SUMMARY"
echo "========================================="
echo "Total Revenue Synced: $${TOTAL_REVENUE}"
echo "Total New Records: ${TOTAL_NEW}"
echo "Total Updated Records: ${TOTAL_UPDATED}"
echo ""
echo "✅ Sync complete!"
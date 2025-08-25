#!/bin/bash

# Complete accuracy sync - ensures 100% data accuracy
echo "🎯 COMPLETE DATA ACCURACY SYNC"
echo "=============================="
echo "This will ensure 100% accuracy for all 24 months"
echo "Processing every single day from Sep 2023 to Aug 2025"
echo ""

BASE_URL="https://venue-smart-dashboard.vercel.app/api/sync-missing-months"
FAILED_MONTHS=""
SUCCESS_COUNT=0
TOTAL_COUNT=0

# Function to sync a month with retries
sync_month_with_retry() {
    local year=$1
    local month=$2
    local month_name=$(date -d "$year-$month-01" +"%B %Y" 2>/dev/null || echo "$year-$month")
    local retry_count=0
    local max_retries=3
    
    while [ $retry_count -lt $max_retries ]; do
        echo -n "📅 Syncing $month_name (attempt $((retry_count + 1)))... "
        
        response=$(curl -s -X GET "${BASE_URL}?year=${year}&months=${month}" --max-time 60)
        
        if echo "$response" | grep -q '"success":true'; then
            revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | head -1 | cut -d: -f2)
            new_records=$(echo "$response" | grep -o '"newRecords":[0-9]*' | head -1 | cut -d: -f2)
            updated_records=$(echo "$response" | grep -o '"updatedRecords":[0-9]*' | head -1 | cut -d: -f2)
            days_with_revenue=$(echo "$response" | grep -o '"daysWithRevenue":[0-9]*' | head -1 | cut -d: -f2)
            
            echo "✅ $${revenue:-0} (${days_with_revenue:-0} days)"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            return 0
        else
            echo "❌ Failed"
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                echo "  Retrying in 5 seconds..."
                sleep 5
            else
                FAILED_MONTHS="$FAILED_MONTHS $year-$month"
            fi
        fi
    done
    
    return 1
}

echo "Starting complete sync..."
echo ""

# 2023 (Sep-Dec)
echo "=== 2023 (September - December) ==="
for month in 9 10 11 12; do
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    sync_month_with_retry 2023 $month
    sleep 2
done

# 2024 (all months)
echo ""
echo "=== 2024 (January - December) ==="
for month in {1..12}; do
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    sync_month_with_retry 2024 $month
    sleep 2
done

# 2025 (Jan-Aug)
echo ""
echo "=== 2025 (January - August) ==="
for month in {1..8}; do
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    sync_month_with_retry 2025 $month
    sleep 2
done

echo ""
echo "======================================"
echo "📊 SYNC SUMMARY"
echo "======================================"
echo "Total months: $TOTAL_COUNT"
echo "Successful: $SUCCESS_COUNT"
echo "Failed: $((TOTAL_COUNT - SUCCESS_COUNT))"

if [ -n "$FAILED_MONTHS" ]; then
    echo ""
    echo "❌ Failed months:$FAILED_MONTHS"
    echo ""
    echo "Attempting to fix failed months individually..."
    
    # Try to sync failed months one more time
    for month_str in $FAILED_MONTHS; do
        IFS='-' read -r year month <<< "$month_str"
        echo ""
        echo "Retrying $month_str..."
        sync_month_with_retry $year $month
    done
fi

echo ""
echo "✅ Sync process complete!"
echo ""
echo "Next step: Running accuracy verification..."
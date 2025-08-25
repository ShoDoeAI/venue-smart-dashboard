#!/bin/bash

# Script to sync ALL 24 months of Toast data
# From September 2023 to August 2025

echo "🚀 Syncing ALL 24 months of Toast data..."
echo "This will sync from September 2023 to August 2025."
echo "Note: The venue operates primarily on Fridays and Saturdays"
echo "Expected time: 15-30 minutes depending on server response"
echo ""

BASE_URL="https://venue-smart-dashboard.vercel.app/api/sync-missing-months"

# Track totals
TOTAL_REVENUE=0
TOTAL_RECORDS=0
TOTAL_MONTHS=0

# Function to sync a single month
sync_month() {
    local year=$1
    local month=$2
    local month_name=$(date -d "$year-$month-01" +"%B %Y" 2>/dev/null || echo "$year-$month")
    
    echo -n "📅 Syncing $month_name... "
    
    # Call sync endpoint for single month
    response=$(curl -s -X GET "${BASE_URL}?year=${year}&months=${month}")
    
    # Extract summary info - use head -1 to get first occurrence
    if echo "$response" | grep -q '"success":true'; then
        revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | head -1 | cut -d: -f2)
        new_records=$(echo "$response" | grep -o '"newRecords":[0-9]*' | head -1 | cut -d: -f2)
        updated_records=$(echo "$response" | grep -o '"updatedRecords":[0-9]*' | head -1 | cut -d: -f2)
        days_with_revenue=$(echo "$response" | grep -o '"daysWithRevenue":[0-9]*' | head -1 | cut -d: -f2)
        
        # Update totals
        revenue=${revenue:-0}
        new_count=${new_records:-0}
        updated_count=${updated_records:-0}
        
        TOTAL_REVENUE=$(echo "scale=2; $TOTAL_REVENUE + $revenue" | bc 2>/dev/null || echo "$TOTAL_REVENUE")
        TOTAL_RECORDS=$((TOTAL_RECORDS + new_count + updated_count))
        TOTAL_MONTHS=$((TOTAL_MONTHS + 1))
        
        if [ "$revenue" = "0" ] || [ -z "$revenue" ]; then
            echo "✅ No revenue (likely closed)"
        else
            echo "✅ \$$revenue (${days_with_revenue:-0} days, ${new_count} new, ${updated_count} updated)"
        fi
    else
        echo "❌ Failed"
        echo "  Error: $response" | head -n 1
    fi
    
    # Small delay to avoid rate limiting
    sleep 1
}

echo "Starting comprehensive sync..."
echo ""

# Sync 2023 (Sep-Dec)
echo "=== 2023 (September - December) ==="
for month in 9 10 11 12; do
    sync_month 2023 $month
done

echo ""
echo "=== 2024 (January - December) ==="
for month in {1..12}; do
    sync_month 2024 $month
done

echo ""
echo "=== 2025 (January - August) ==="
for month in {1..8}; do
    sync_month 2025 $month
done

echo ""
echo "======================================"
echo "🎉 Sync complete!"
echo ""
echo "Summary:"
echo "  - Months processed: $TOTAL_MONTHS"
echo "  - Total revenue synced: \$${TOTAL_REVENUE}"
echo "  - Total records: $TOTAL_RECORDS"
echo ""
echo "You can now query any month from September 2023 to August 2025 in the AI chat."
echo "Examples:"
echo "  - 'What was revenue in January 2024?'"
echo "  - 'Show me February 2024 vs February 2025'"
echo "  - 'What's the total revenue for all of 2024?'"
echo ""
echo "Note: Months with \$0 revenue likely indicate the venue was closed."
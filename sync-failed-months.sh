#!/bin/bash

# Quick script to sync the months that failed during the full sync

echo "🔄 Syncing months that failed during full sync..."
echo ""

BASE_URL="https://venue-smart-dashboard.vercel.app/api/sync-missing-months"

# Sync April 2024
echo -n "📅 Syncing April 2024... "
response=$(curl -s "${BASE_URL}?year=2024&months=4")
if echo "$response" | grep -q '"success":true'; then
    revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | head -1 | cut -d: -f2)
    echo "✅ \$$revenue"
else
    echo "❌ Failed"
fi

# Sync May 2024
echo -n "📅 Syncing May 2024... "
response=$(curl -s "${BASE_URL}?year=2024&months=5")
if echo "$response" | grep -q '"success":true'; then
    revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | head -1 | cut -d: -f2)
    echo "✅ \$$revenue"
else
    echo "❌ Failed"
fi

# Sync November 2024
echo -n "📅 Syncing November 2024... "
response=$(curl -s "${BASE_URL}?year=2024&months=11")
if echo "$response" | grep -q '"success":true'; then
    revenue=$(echo "$response" | grep -o '"totalRevenueSynced":[0-9.]*' | head -1 | cut -d: -f2)
    echo "✅ \$$revenue"
else
    echo "❌ Failed"
fi

echo ""
echo "🎉 Done!"
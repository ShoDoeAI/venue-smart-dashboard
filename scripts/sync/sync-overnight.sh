#!/bin/bash

# Overnight sync script with logging and progress tracking

LOG_FILE="sync-overnight-$(date +%Y%m%d-%H%M%S).log"

echo "🌙 Starting Overnight Toast Sync" | tee $LOG_FILE
echo "================================" | tee -a $LOG_FILE
echo "Started at: $(date)" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Function to check progress
check_progress() {
    if [ -f ".sync-progress.json" ]; then
        COMPLETED=$(jq '.completed | length' .sync-progress.json)
        REVENUE=$(jq '.totalRevenue' .sync-progress.json)
        echo "Progress: $COMPLETED/731 days ($(echo "scale=1; $COMPLETED * 100 / 731" | bc)%)" | tee -a $LOG_FILE
        echo "Revenue synced: \$$(echo "scale=2; $REVENUE" | bc)" | tee -a $LOG_FILE
    fi
}

# Initial status
echo "Initial status:" | tee -a $LOG_FILE
check_progress
echo "" | tee -a $LOG_FILE

# Run the auto-batch sync
echo "Starting auto-batch sync..." | tee -a $LOG_FILE
echo "This will run continuously until all data is synced" | tee -a $LOG_FILE
echo "You can safely close your terminal - the sync will continue" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Run with nohup to continue even if terminal closes
nohup node sync-auto-batches.js >> $LOG_FILE 2>&1 &
SYNC_PID=$!

echo "Sync started with PID: $SYNC_PID" | tee -a $LOG_FILE
echo "Log file: $LOG_FILE" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "To check progress later:" | tee -a $LOG_FILE
echo "  tail -f $LOG_FILE" | tee -a $LOG_FILE
echo "  node sync-status.js" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "To stop the sync:" | tee -a $LOG_FILE
echo "  kill $SYNC_PID" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "Sweet dreams! 😴" | tee -a $LOG_FILE
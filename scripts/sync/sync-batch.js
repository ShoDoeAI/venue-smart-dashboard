#!/usr/bin/env node

// Batch sync script - runs a limited number of days at a time
// This prevents timeouts and allows for incremental progress

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '.sync-progress.json');
const DAYS_PER_BATCH = 30; // Sync 30 days at a time

async function runBatch() {
  // Check if progress file exists
  let progress = { completed: [] };
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (error) {
    console.log('No progress file found, will start fresh');
  }

  const totalDays = 731; // 2 years
  const completedDays = progress.completed ? progress.completed.length : 0;
  const remainingDays = totalDays - completedDays;

  if (remainingDays === 0) {
    console.log('✅ Sync already complete!');
    return;
  }

  console.log(
    `📊 Progress: ${completedDays}/${totalDays} days (${((completedDays / totalDays) * 100).toFixed(1)}%)`,
  );
  console.log(`📊 Remaining: ${remainingDays} days`);
  console.log(`🔄 Running batch of up to ${DAYS_PER_BATCH} days...\n`);

  // Run the resumable sync
  return new Promise((resolve, reject) => {
    const syncProcess = spawn('node', ['sync-2-years-resume.js'], {
      stdio: 'inherit',
    });

    // Set a timeout for this batch
    const timeout = setTimeout(
      () => {
        console.log('\n⏰ Batch time limit reached, saving progress...');
        syncProcess.kill('SIGTERM');
      },
      5 * 60 * 1000,
    ); // 5 minutes per batch

    syncProcess.on('exit', (code) => {
      clearTimeout(timeout);

      // Check new progress
      try {
        if (fs.existsSync(PROGRESS_FILE)) {
          const newProgress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
          const newCompleted = newProgress.completed ? newProgress.completed.length : 0;
          console.log(`\n✅ Batch complete! Synced ${newCompleted - completedDays} more days`);
          console.log(`💰 Total revenue: $${newProgress.totalRevenue?.toFixed(2) || '0.00'}`);

          if (newCompleted < totalDays) {
            console.log(
              `\n📊 Overall progress: ${newCompleted}/${totalDays} days (${((newCompleted / totalDays) * 100).toFixed(1)}%)`,
            );
            console.log('Run this script again to continue syncing');
          }
        }
      } catch (error) {
        console.error('Could not read progress');
      }

      resolve(code);
    });

    syncProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Run the batch
runBatch().catch(console.error);

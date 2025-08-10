#!/usr/bin/env node

// Continuous sync that won't stop until 100% complete

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '.sync-progress.json');

async function runSingleBatch() {
  return new Promise((resolve) => {
    const syncProcess = spawn('node', ['sync-batch-frequent-save.js'], {
      stdio: 'pipe',
    });

    let output = '';

    syncProcess.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    syncProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    syncProcess.on('exit', (code) => {
      resolve({ code, output });
    });
  });
}

async function continuousSync() {
  console.log("🚀 Continuous Sync Runner - Won't Stop Until 100%");
  console.log('='.repeat(60));

  let batchNumber = 1;
  let lastProgress = 0;
  let noProgressCount = 0;
  const maxNoProgress = 3; // Allow 3 batches with no progress before stopping

  // Get initial progress
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      lastProgress = progress.completed.length;
      console.log(
        `Starting from: ${lastProgress}/731 days (${((lastProgress / 731) * 100).toFixed(1)}%)\n`,
      );
    }
  } catch (error) {
    console.log('Starting fresh sync\n');
  }

  while (true) {
    console.log(`\n📦 Starting Batch #${batchNumber}...`);
    console.log('-'.repeat(60) + '\n');

    const startTime = Date.now();
    const result = await runSingleBatch();
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Check progress
    try {
      if (fs.existsSync(PROGRESS_FILE)) {
        const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        const completedDays = progress.completed.length;
        const totalDays = 731;
        const percentage = ((completedDays / totalDays) * 100).toFixed(1);
        const daysAdded = completedDays - lastProgress;

        console.log(`\n📊 Batch #${batchNumber} Complete!`);
        console.log(`   Time: ${elapsedTime} seconds`);
        console.log(`   Progress: ${completedDays}/${totalDays} days (${percentage}%)`);
        console.log(`   Revenue: $${progress.totalRevenue.toFixed(2)}`);
        console.log(`   Days added: ${daysAdded}`);

        // Check if we're done
        if (completedDays >= totalDays) {
          console.log('\n🎉 SYNC COMPLETE! All 2 years of data have been synced.');
          console.log(`Total time: ${batchNumber} batches`);
          console.log(`Total revenue: $${progress.totalRevenue.toFixed(2)}`);
          console.log(`Total orders: ${progress.totalOrders}`);
          console.log(`Total checks: ${progress.totalChecks}`);

          // Clean up progress file
          fs.unlinkSync(PROGRESS_FILE);
          break;
        }

        // Check if progress was made
        if (daysAdded === 0) {
          noProgressCount++;
          console.log(`\n⚠️  No progress made (${noProgressCount}/${maxNoProgress})`);

          if (noProgressCount >= maxNoProgress) {
            console.log('\n❌ No progress after 3 attempts. Stopping.');
            console.log('There may be an issue with the sync. Check for errors.');
            break;
          }
        } else {
          noProgressCount = 0; // Reset counter on successful progress
          lastProgress = completedDays;
        }

        // Estimate time remaining
        if (daysAdded > 0) {
          const daysPerBatch = daysAdded;
          const batchesRemaining = Math.ceil((totalDays - completedDays) / daysPerBatch);
          const minutesRemaining = ((batchesRemaining * elapsedTime) / 60).toFixed(1);
          console.log(`\n⏱️  Estimated time remaining: ${minutesRemaining} minutes`);
        }
      } else {
        console.log('\n✅ Sync complete - no progress file found');
        break;
      }
    } catch (error) {
      console.error('Error checking progress:', error.message);
      noProgressCount++;

      if (noProgressCount >= maxNoProgress) {
        console.log('\n❌ Too many errors. Stopping.');
        break;
      }
    }

    batchNumber++;

    // Small delay between batches
    console.log('\n⏱️  Waiting 3 seconds before next batch...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log('\n✅ Continuous sync finished');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Run
continuousSync().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

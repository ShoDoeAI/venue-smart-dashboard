#!/usr/bin/env node

// Run multiple batches automatically with progress updates

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

async function runAutoBatches() {
  console.log('🚀 Auto-Batch Sync Runner');
  console.log('='.repeat(60));
  console.log('This will run batches continuously until sync is complete\n');

  let batchNumber = 1;
  let lastProgress = 0;

  while (true) {
    console.log(`\n📦 Starting Batch #${batchNumber}...`);
    console.log('-'.repeat(60) + '\n');

    const result = await runSingleBatch();

    // Check progress
    try {
      if (fs.existsSync(PROGRESS_FILE)) {
        const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        const completedDays = progress.completed.length;
        const totalDays = 731;
        const percentage = ((completedDays / totalDays) * 100).toFixed(1);

        console.log(`\n📊 Batch #${batchNumber} Complete!`);
        console.log(`   Progress: ${completedDays}/${totalDays} days (${percentage}%)`);
        console.log(`   Revenue: $${progress.totalRevenue.toFixed(2)}`);
        console.log(`   Days added: ${completedDays - lastProgress}`);

        lastProgress = completedDays;

        if (completedDays >= totalDays) {
          console.log('\n🎉 SYNC COMPLETE! All 2 years of data have been synced.');
          break;
        }

        // If no progress was made, stop
        if (completedDays === lastProgress && batchNumber > 1) {
          console.log('\n⚠️  No progress made in last batch. Stopping.');
          break;
        }
      } else {
        console.log('\n✅ Sync complete - no progress file found');
        break;
      }
    } catch (error) {
      console.error('Error checking progress:', error.message);
      break;
    }

    batchNumber++;

    // Small delay between batches
    console.log('\n⏱️  Waiting 5 seconds before next batch...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log('\n✅ Auto-batch sync finished');
}

// Run
runAutoBatches().catch(console.error);

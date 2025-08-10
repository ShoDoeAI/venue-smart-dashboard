#!/usr/bin/env node

// Check the status of the 2-year sync

const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '.sync-progress.json');

function checkStatus() {
  console.log('📊 2-Year Toast Sync Status');
  console.log('='.repeat(60));

  try {
    if (!fs.existsSync(PROGRESS_FILE)) {
      console.log('❌ No sync in progress');
      console.log('Run: node sync-batch.js to start syncing');
      return;
    }

    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    const startDate = new Date(progress.startDate);
    const endDate = new Date(progress.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const completedDays = progress.completed.length;
    const percentage = ((completedDays / totalDays) * 100).toFixed(1);

    console.log(
      `\n📅 Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    );
    console.log(`✅ Completed: ${completedDays}/${totalDays} days (${percentage}%)`);
    console.log(`📊 Remaining: ${totalDays - completedDays} days`);

    if (completedDays > 0) {
      console.log(`\n💰 Revenue synced: $${progress.totalRevenue.toFixed(2)}`);
      console.log(`📦 Orders synced: ${progress.totalOrders.toLocaleString()}`);
      console.log(`📋 Checks synced: ${progress.totalChecks.toLocaleString()}`);
      console.log(`💵 Average per day: $${(progress.totalRevenue / completedDays).toFixed(2)}`);

      // Show last synced date
      const lastSynced = progress.completed[progress.completed.length - 1];
      console.log(`\n📅 Last synced: ${lastSynced}`);

      // Estimate time remaining
      const daysPerMinute = completedDays / 30; // Rough estimate based on previous runs
      const minutesRemaining = (totalDays - completedDays) / daysPerMinute;
      console.log(`⏱️  Estimated time remaining: ${Math.ceil(minutesRemaining)} minutes`);
    }

    if (progress.failedDates && progress.failedDates.length > 0) {
      console.log(`\n⚠️  Failed dates: ${progress.failedDates.length}`);
      progress.failedDates.slice(0, 5).forEach((f) => {
        console.log(`   ${f.date}: ${f.error}`);
      });
    }

    console.log('\n🔄 To continue syncing, run: node sync-batch.js');

    // Progress bar
    const barLength = 50;
    const filled = Math.floor((completedDays / totalDays) * barLength);
    const empty = barLength - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
    console.log(`\n[${progressBar}] ${percentage}%`);
  } catch (error) {
    console.error('❌ Error reading progress:', error.message);
  }
}

checkStatus();

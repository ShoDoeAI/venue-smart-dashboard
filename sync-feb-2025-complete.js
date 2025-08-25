const axios = require('axios');

async function syncFebruary2025() {
  console.log('Syncing February 2025 with day-by-day approach...\n');
  
  const daysToSync = [12, 13, 14, 15, 18, 20, 21, 22]; // Days with revenue
  
  for (const day of daysToSync) {
    const dateStr = `2025-02-${day.toString().padStart(2, '0')}`;
    console.log(`Syncing ${dateStr}...`);
    
    try {
      const response = await axios.get(
        `https://venue-smart-dashboard.vercel.app/api/sync-missing-months?year=2025&months=2&specificDays=${day}`
      );
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`Error syncing ${dateStr}: ${error.message}`);
    }
  }
  
  // Now do a full month sync
  console.log('\nDoing full February 2025 sync...');
  
  try {
    const response = await axios.get(
      'https://venue-smart-dashboard.vercel.app/api/sync-missing-months?year=2025&months=2'
    );
    
    const data = response.data;
    console.log(`\nSync complete:`);
    console.log(`- Total revenue: $${data.summary?.totalRevenueSynced || 0}`);
    console.log(`- New records: ${data.summary?.newRecords || 0}`);
    console.log(`- Days with revenue: ${Object.keys(data.results?.[0]?.dailyBreakdown || {}).length}`);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

syncFebruary2025().catch(console.error);
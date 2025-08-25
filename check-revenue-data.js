const axios = require('axios');

async function checkRevenueData() {
  console.log('Checking revenue data in database...\n');
  
  // Test specific months
  const testQueries = [
    'SELECT date, revenue_total FROM revenue_overrides WHERE date >= \'2024-01-01\' AND date <= \'2024-01-31\' ORDER BY date',
    'SELECT date, revenue_total FROM revenue_overrides WHERE date >= \'2024-04-01\' AND date <= \'2024-04-30\' ORDER BY date',
    'SELECT date, revenue_total FROM revenue_overrides WHERE date >= \'2025-07-01\' AND date <= \'2025-07-31\' ORDER BY date',
    'SELECT date, revenue_total FROM revenue_overrides WHERE date >= \'2025-08-01\' AND date <= \'2025-08-31\' ORDER BY date'
  ];
  
  const months = ['January 2024', 'April 2024', 'July 2025', 'August 2025'];
  
  for (let i = 0; i < testQueries.length; i++) {
    console.log(`\n=== ${months[i]} ===`);
    
    try {
      // Use the API endpoint that returns revenue data
      const startDate = testQueries[i].match(/'>= '([^']+)'/)[1];
      const endDate = testQueries[i].match(/<= '([^']+)'/)[1];
      
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/find-revenue-data', {
        startDate,
        endDate
      });
      
      if (response.data.revenue_overrides && response.data.revenue_overrides.length > 0) {
        const total = response.data.revenue_overrides.reduce((sum, row) => sum + row.revenue_total, 0);
        console.log(`Total revenue: $${total.toFixed(2)}`);
        console.log(`Days with data: ${response.data.revenue_overrides.length}`);
        console.log('Sample days:');
        response.data.revenue_overrides.slice(0, 3).forEach(row => {
          console.log(`  ${row.date}: $${row.revenue_total}`);
        });
      } else {
        console.log('No data found');
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  // Also test what the AI is seeing
  console.log('\n\n=== Testing AI responses ===');
  
  for (let i = 0; i < months.length; i++) {
    console.log(`\nAsking AI about ${months[i]}...`);
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: `What was the exact total revenue for ${months[i]}? Just give me the number.`,
        sessionId: 'test-' + Date.now()
      });
      
      const aiResponse = response.data.response || 'No response';
      const revenueMatch = aiResponse.match(/\$[\d,]+(\.\d{2})?/);
      console.log(`AI says: ${revenueMatch ? revenueMatch[0] : 'Could not find revenue'}`);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
}

checkRevenueData().catch(console.error);
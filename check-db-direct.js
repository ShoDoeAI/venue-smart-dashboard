const axios = require('axios');

// Use Supabase REST API directly
const SUPABASE_URL = 'https://bmhplnojfuznflbyqqze.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY';

async function checkDatabase() {
  console.log('Checking database directly...\n');
  
  // Query revenue_overrides for specific months
  const testMonths = [
    { name: 'January 2024', start: '2024-01-01', end: '2024-01-31' },
    { name: 'April 2024', start: '2024-04-01', end: '2024-04-30' },
    { name: 'May 2024', start: '2024-05-01', end: '2024-05-31' },
    { name: 'November 2024', start: '2024-11-01', end: '2024-11-30' },
    { name: 'July 2025', start: '2025-07-01', end: '2025-07-31' },
    { name: 'August 2025', start: '2025-08-01', end: '2025-08-31' }
  ];
  
  for (const month of testMonths) {
    try {
      const response = await axios.get(
        `${SUPABASE_URL}/rest/v1/revenue_overrides?date=gte.${month.start}&date=lte.${month.end}&select=date,revenue_total,check_count`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        }
      );
      
      const data = response.data;
      const totalRevenue = data.reduce((sum, row) => sum + (row.revenue_total || 0), 0);
      
      console.log(`${month.name}:`);
      console.log(`  Records: ${data.length}`);
      console.log(`  Total Revenue: $${totalRevenue.toFixed(2)}`);
      
      if (data.length > 0 && data.length <= 5) {
        console.log('  Daily breakdown:');
        data.forEach(row => {
          console.log(`    ${row.date}: $${row.revenue_total} (${row.check_count} checks)`);
        });
      }
      console.log('');
    } catch (error) {
      console.log(`${month.name}: Error - ${error.message}\n`);
    }
  }
}

checkDatabase().catch(console.error);
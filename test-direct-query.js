const axios = require('axios');

const SUPABASE_URL = 'https://bmhplnojfuznflbyqqze.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY';

async function testDirectQuery() {
  console.log('Testing direct Supabase query for Feb 14, 2025...\n');
  
  // Test what the AI context aggregator should be doing
  const startDate = new Date(2025, 1, 14); // Feb 14, 2025
  const endDate = new Date(2025, 1, 14);   // Same day
  
  console.log('Query parameters:');
  console.log('  startDate:', startDate.toISOString());
  console.log('  endDate:', endDate.toISOString());
  console.log('  startDate string:', startDate.toISOString().split('T')[0]);
  console.log('  endDate string:', endDate.toISOString().split('T')[0]);
  
  // Query exactly like the AI context aggregator does
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const url = `${SUPABASE_URL}/rest/v1/revenue_overrides?date=gte.${startDateStr}&date=lte.${endDateStr}&order=date.asc`;
  console.log('Query URL:', url);
  
  const response = await axios.get(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  
  const overrides = response.data;
  const overridesError = null;
    
  console.log('\nQuery result:');
  console.log('  Error:', overridesError);
  console.log('  Data count:', overrides?.length || 0);
  
  if (overrides && overrides.length > 0) {
    console.log('\nRecords found:');
    overrides.forEach((record) => {
      console.log(`  ${record.date}: $${record.actual_revenue} (${record.check_count} checks)`);
    });
    
    // Build the analytics object like the aggregator would
    const analytics = {
      queryPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      totalRevenue: overrides.reduce((sum, o) => sum + o.actual_revenue, 0),
      totalChecks: overrides.reduce((sum, o) => sum + o.check_count, 0),
      dailyBreakdown: overrides.map((override) => {
        const dayDate = new Date(override.date);
        return {
          date: override.date,
          dayOfWeek: dayDate.toLocaleDateString('en-US', { weekday: 'long' }),
          revenue: override.actual_revenue,
          orders: 0,
          checks: override.check_count,
        };
      })
    };
    
    console.log('\nAnalytics object that should be passed to AI:');
    console.log(JSON.stringify(analytics, null, 2));
  } else {
    console.log('\nNo data found!');
  }
}

testDirectQuery().catch(console.error);
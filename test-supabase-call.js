const axios = require('axios');

const SUPABASE_URL = 'https://bmhplnojfuznflbyqqze.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY';

async function testSupabaseCall() {
  console.log('Testing what the AI Context Aggregator should be querying...\n');
  
  // Test different date scenarios
  const testCases = [
    {
      name: "February 1, 2025 (what AI claims to see)",
      startDate: '2025-02-01',
      endDate: '2025-02-01'
    },
    {
      name: "February 14, 2025 (what we want)",
      startDate: '2025-02-14', 
      endDate: '2025-02-14'
    },
    {
      name: "Entire February 2025",
      startDate: '2025-02-01',
      endDate: '2025-02-28'
    }
  ];
  
  for (const test of testCases) {
    console.log(`\n${test.name}:`);
    console.log(`Query: date >= '${test.startDate}' AND date <= '${test.endDate}'`);
    
    const url = `${SUPABASE_URL}/rest/v1/revenue_overrides?date=gte.${test.startDate}&date=lte.${test.endDate}&order=date.asc`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      const data = response.data;
      console.log(`Results: ${data.length} records`);
      
      if (data.length > 0) {
        data.forEach(record => {
          console.log(`  - ${record.date}: $${record.actual_revenue} (${record.check_count} checks)`);
        });
      } else {
        console.log('  No data found');
      }
      
    } catch (error) {
      console.error('  Error:', error.message);
    }
  }
  
  // Also check what date string conversions might be happening
  console.log('\n\nDate String Conversions:');
  const feb14 = new Date(2025, 1, 14); // Month is 0-indexed
  console.log('new Date(2025, 1, 14):', feb14.toISOString());
  console.log('ISO split[0]:', feb14.toISOString().split('T')[0]);
  
  const feb1 = new Date(2025, 1, 1);
  console.log('\nnew Date(2025, 1, 1):', feb1.toISOString());
  console.log('ISO split[0]:', feb1.toISOString().split('T')[0]);
}

testSupabaseCall().catch(console.error);
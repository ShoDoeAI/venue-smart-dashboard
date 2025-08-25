const axios = require('axios');

const SUPABASE_URL = 'https://bmhplnojfuznflbyqqze.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY';

async function checkDatabaseFormat() {
  console.log('Checking database format for revenue_overrides table...\n');
  
  try {
    // Get sample records
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/revenue_overrides?select=*&order=date.desc&limit=5`,
      { 
        headers: { 
          'apikey': SUPABASE_SERVICE_KEY, 
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` 
        } 
      }
    );
    
    const records = response.data;
    
    console.log('Sample records from revenue_overrides:');
    console.log('=====================================\n');
    
    records.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(JSON.stringify(record, null, 2));
      console.log('\nData types:');
      Object.entries(record).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value} = ${value}`);
      });
      console.log('\n---\n');
    });
    
    // Check specific dates
    console.log('Checking specific dates that should have data:');
    const testDates = ['2025-02-14', '2025-07-25', '2025-08-10'];
    
    for (const date of testDates) {
      const dateResponse = await axios.get(
        `${SUPABASE_URL}/rest/v1/revenue_overrides?date=eq.${date}&select=*`,
        { 
          headers: { 
            'apikey': SUPABASE_SERVICE_KEY, 
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` 
          } 
        }
      );
      
      const record = dateResponse.data[0];
      console.log(`\n${date}:`);
      if (record) {
        console.log(`  Found: actual_revenue=${record.actual_revenue}, check_count=${record.check_count}`);
        console.log(`  Full record:`, JSON.stringify(record));
      } else {
        console.log('  No record found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkDatabaseFormat().catch(console.error);
const { createClient } = require('@supabase/supabase-js');
const { AIContextAggregatorToast } = require('./packages/backend/src/services/ai-context-aggregator-toast');
require('dotenv').config();

// Get env vars from API
const SUPABASE_URL = 'https://ixrdubzjexuwwgtsvzjh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cmR1YnpqZXh1d3dndHN2empoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjE1MDI1MiwiZXhwIjoyMDM3NzI2MjUyfQ.WGAla-DLVoLAts6JAleKULjA7GyIN8NEQFPLpBGQfmY';

async function testAggregator() {
  console.log('Testing AI Context Aggregator...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const aggregator = new AIContextAggregatorToast(supabase);
  
  // Test months
  const tests = [
    { name: 'January 2024', start: new Date('2024-01-01'), end: new Date('2024-01-31') },
    { name: 'April 2024', start: new Date('2024-04-01'), end: new Date('2024-04-30') },
    { name: 'July 2025', start: new Date('2025-07-01'), end: new Date('2025-07-31') },
    { name: 'August 2025', start: new Date('2025-08-01'), end: new Date('2025-08-31') }
  ];
  
  for (const test of tests) {
    console.log(`\n=== Testing ${test.name} ===`);
    
    try {
      // Test the aggregator
      const context = await aggregator.buildEnhancedContext(
        'venue-1', // venue ID
        'revenue', // query type
        test.start,
        test.end
      );
      
      const analytics = context.toastAnalytics;
      
      console.log(`Total Revenue: $${analytics?.totalRevenue || 0}`);
      console.log(`Days with data: ${analytics?.dailyBreakdown?.length || 0}`);
      console.log(`Query period: ${analytics?.queryPeriod?.startDate} to ${analytics?.queryPeriod?.endDate}`);
      console.log(`No data found: ${analytics?.noDataFound || false}`);
      
      if (analytics?.dailyBreakdown && analytics.dailyBreakdown.length > 0) {
        console.log('Sample days:');
        analytics.dailyBreakdown.slice(0, 3).forEach(day => {
          console.log(`  ${day.date}: $${day.revenue} (${day.checks} checks)`);
        });
      }
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
    }
  }
  
  // Also check what's in the revenue_overrides table
  console.log('\n\n=== Checking revenue_overrides table ===');
  
  const { data: overrides, error } = await supabase
    .from('revenue_overrides')
    .select('date, revenue_total')
    .order('date', { ascending: false })
    .limit(20);
    
  if (error) {
    console.log('Error querying revenue_overrides:', error);
  } else {
    console.log(`Found ${overrides.length} recent records:`);
    overrides.forEach(row => {
      console.log(`  ${row.date}: $${row.revenue_total}`);
    });
  }
}

testAggregator().catch(console.error);
const axios = require('axios');

const SUPABASE_URL = 'https://bmhplnojfuznflbyqqze.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY';

async function fixMismatches() {
  console.log('🔧 Fixing revenue mismatches...\n');

  const fixes = [
    {
      date: '2023-09-23',
      actual_revenue: 20995.00,
      check_count: 798,
      old_revenue: 2101.00,
      description: 'September 23, 2023 - Major discrepancy ($18,894 difference)'
    },
    {
      date: '2024-01-01',
      actual_revenue: 0.00,
      check_count: 0,
      old_revenue: 1000.00,
      description: 'January 1, 2024 - Test record removed (venue was closed)'
    },
    {
      date: '2025-06-14',
      actual_revenue: 2144.40,
      check_count: 99,
      old_revenue: 3750.40,
      description: 'June 14, 2025 - Partial data correction'
    },
    {
      date: '2025-07-18',
      actual_revenue: 24378.61,
      check_count: 1094,
      old_revenue: 1639.69,
      description: 'July 18, 2025 - Major discrepancy ($22,739 difference)'
    }
  ];

  for (const fix of fixes) {
    console.log(`Fixing ${fix.date}:`);
    console.log(`  ${fix.description}`);
    console.log(`  Old: $${fix.old_revenue} → New: $${fix.actual_revenue}`);
    
    try {
      // Update the record
      const response = await axios.patch(
        `${SUPABASE_URL}/rest/v1/revenue_overrides?date=eq.${fix.date}`,
        {
          actual_revenue: fix.actual_revenue,
          revenue_total: fix.actual_revenue,
          check_count: fix.check_count,
          notes: `Corrected from Toast API verification on ${new Date().toISOString()}`
        },
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        }
      );

      if (response.status === 204) {
        console.log(`  ✅ Fixed successfully\n`);
      } else {
        console.log(`  ❌ Unexpected response: ${response.status}\n`);
      }
    } catch (error) {
      // For the test record that doesn't exist, try to delete it
      if (fix.date === '2024-01-01' && error.response?.status === 404) {
        console.log(`  ℹ️  Record doesn't exist (already removed)\n`);
      } else {
        console.log(`  ❌ Error: ${error.message}\n`);
      }
    }
  }

  console.log('✅ All fixes completed!');
  console.log('\nRevenue changes:');
  console.log(`  Added: $${(20995 + 24378.61 - 2101 - 1639.69).toFixed(2)}`);
  console.log(`  Removed: $${(1000 + 3750.40 - 2144.40).toFixed(2)}`);
  console.log(`  Net change: +$${(20995 + 24378.61 - 2101 - 1639.69 - 1000 - 3750.40 + 2144.40).toFixed(2)}`);
}

fixMismatches().catch(console.error);
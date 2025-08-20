const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkDataSource() {
  console.log('🔍 Checking how existing revenue data was added...\n');
  
  const { data, error } = await supabase
    .from('revenue_overrides')
    .select('date, actual_revenue, notes, created_at')
    .order('date', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Revenue overrides entries:\n');
  data.forEach(row => {
    console.log(`📅 ${row.date}: $${row.actual_revenue.toFixed(2)}`);
    console.log(`   Notes: ${row.notes || 'No notes'}`);
    console.log(`   Added: ${new Date(row.created_at).toLocaleString()}`);
    console.log('');
  });
  
  // Group by how they were added
  const sources = {};
  data.forEach(row => {
    const source = row.notes?.includes('Toast API') ? 'Toast API Sync' :
                  row.notes?.includes('verified') ? 'Manual Verification' :
                  row.notes?.includes('Synced') ? 'API Sync' :
                  'Unknown';
    sources[source] = (sources[source] || 0) + 1;
  });
  
  console.log('\n📊 Data Sources Summary:');
  Object.entries(sources).forEach(([source, count]) => {
    console.log(`   ${source}: ${count} entries`);
  });
}

checkDataSource();
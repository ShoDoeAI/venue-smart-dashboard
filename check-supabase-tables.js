require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
  console.log('🔍 Checking Supabase Tables\n');
  
  try {
    // Check toast_transactions table
    console.log('1️⃣ Checking toast_transactions table...');
    const { count: toastCount, error: toastError } = await supabase
      .from('toast_transactions')
      .select('*', { count: 'exact', head: true });
    
    if (toastError) {
      console.log('   ❌ toast_transactions table error:', toastError.message);
      console.log('   → Table might not exist. Run the migration SQL.');
    } else {
      console.log(`   ✅ toast_transactions table exists with ${toastCount || 0} records`);
    }
    
    // Check venue_snapshots table
    console.log('\n2️⃣ Checking venue_snapshots table...');
    const { count: snapshotCount, error: snapshotError } = await supabase
      .from('venue_snapshots')
      .select('*', { count: 'exact', head: true });
    
    if (snapshotError) {
      console.log('   ❌ venue_snapshots table error:', snapshotError.message);
    } else {
      console.log(`   ✅ venue_snapshots table exists with ${snapshotCount || 0} records`);
    }
    
    // Check if we have any Toast data
    if (!toastError && toastCount === 0) {
      console.log('\n⚠️  Tables exist but no Toast data found!');
      console.log('\nTo sync Toast data:');
      console.log('1. Make sure you have the required packages:');
      console.log('   npm install @supabase/supabase-js axios');
      console.log('\n2. Run the setup script:');
      console.log('   node setup-jacks-venue.js');
      console.log('\n3. Or manually sync:');
      console.log('   curl -X POST http://localhost:3000/api/sync-toast-to-supabase -H "Content-Type: application/json" -d \'{}\'');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTables();
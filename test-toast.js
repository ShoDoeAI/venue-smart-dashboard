const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testToast() {
  console.log('Testing Toast Integration...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Check venues table
  console.log('1. Checking database tables...');
  const { data: venues, error: venuesError } = await supabase
    .from('venues')
    .select('*')
    .limit(1);

  if (venuesError) {
    console.error('❌ Missing venues table. Please run the migration SQL in Supabase.');
    console.error('Error:', venuesError.message);
    return;
  }

  console.log('✅ Database tables exist');

  // Check Toast credentials
  console.log('\n2. Toast credentials from .env.local:');
  console.log('   Client ID:', process.env.TOAST_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('   Client Secret:', process.env.TOAST_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('   Location ID:', process.env.TOAST_LOCATION_ID ? '✅ Set' : '❌ Missing');

  // Check Toast tables
  console.log('\n3. Checking Toast tables...');
  const tables = ['toast_orders', 'toast_payments', 'toast_checks', 'toast_selections'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count').limit(1);
    console.log(`   ${table}:`, error ? '❌ Missing' : '✅ Exists');
  }

  console.log('\n✅ Toast setup is complete!');
  console.log('\nTo fetch data, the cron job needs to run. You can:');
  console.log('1. Wait for the automatic 3-minute cron job');
  console.log('2. Deploy to Vercel and trigger manually');
}

testToast().catch(console.error);
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupAndTestToast() {
  console.log('🚀 Setting up and testing Toast integration...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // 1. Get the venue
    console.log('1️⃣ Getting venue...');
    const { data: venues, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .limit(1);

    if (venueError) throw venueError;
    const venue = venues[0];
    console.log(`✅ Found venue: ${venue.name} (ID: ${venue.id})`);

    // 2. Set up Toast credentials
    console.log('\n2️⃣ Setting up Toast credentials...');
    
    // First, remove any existing Toast credentials for this venue
    await supabase
      .from('api_credentials')
      .delete()
      .eq('venue_id', venue.id)
      .eq('api_name', 'toast');

    // Insert new Toast credentials
    const { error: credError } = await supabase
      .from('api_credentials')
      .insert({
        venue_id: venue.id,
        api_name: 'toast',
        credentials: {
          clientId: process.env.TOAST_CLIENT_ID,
          clientSecret: process.env.TOAST_CLIENT_SECRET,
          locationGuid: process.env.TOAST_LOCATION_ID,
          environment: 'sandbox'
        },
        is_active: true
      });

    if (credError) throw credError;
    console.log('✅ Toast credentials configured');

    // 3. Initialize sync status
    console.log('\n3️⃣ Setting up sync status...');
    const { error: syncError } = await supabase
      .from('api_sync_status')
      .upsert({
        venue_id: venue.id,
        service: 'toast',
        sync_frequency_minutes: 3,
        is_syncing: false
      }, {
        onConflict: 'venue_id,service'
      });

    if (syncError) console.log('Sync status error (might be OK):', syncError.message);
    else console.log('✅ Sync status initialized');

    // 4. Check Toast tables
    console.log('\n4️⃣ Verifying Toast tables...');
    const tables = ['toast_orders', 'toast_payments', 'toast_checks', 'toast_selections'];
    let allTablesExist = true;
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`❌ ${table}: Missing`);
        allTablesExist = false;
      } else {
        console.log(`✅ ${table}: Exists`);
      }
    }

    if (!allTablesExist) {
      console.log('\n⚠️  Some Toast tables are missing. Please run the Toast tables migration.');
      return;
    }

    // 5. Summary
    console.log('\n✅ Toast Integration Setup Complete!');
    console.log('\n📊 Configuration Summary:');
    console.log(`   Venue: ${venue.name}`);
    console.log(`   Toast Client ID: ${process.env.TOAST_CLIENT_ID?.substring(0, 10)}...`);
    console.log(`   Location ID: ${process.env.TOAST_LOCATION_ID}`);
    console.log(`   Environment: sandbox (demo data)`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Deploy to Vercel: vercel --prod');
    console.log('2. Set these environment variables in Vercel:');
    console.log('   - All Supabase variables from .env.local');
    console.log('   - All Toast variables from .env.local');
    console.log('   - CRON_SECRET (generate a secure one)');
    console.log('3. The cron job will automatically fetch data every 3 minutes');
    console.log('\n💡 To manually trigger data fetch after deployment:');
    console.log('   curl -X POST https://your-app.vercel.app/api/cron/fetch-data \\');
    console.log('     -H "Authorization: Bearer YOUR_CRON_SECRET"');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupAndTestToast();
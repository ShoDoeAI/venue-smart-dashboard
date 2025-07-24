require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupJacksVenue() {
  console.log('🍺 Setting up Jack\'s on Water Street in Supabase...\n');
  
  try {
    // 1. Update venue configuration
    console.log('1️⃣ Updating venue configuration...');
    const { data: venue, error: venueError } = await supabase
      .from('venue_config')
      .update({
        name: "Jack's on Water Street",
        timezone: 'America/New_York',
        settings: {
          address: '123 Water Street',
          city: 'Boston',
          state: 'MA',
          openDays: ['Friday', 'Saturday', 'Sunday'],
          typicalHours: {
            Friday: { open: '17:00', close: '02:00' },
            Saturday: { open: '11:00', close: '02:00' },
            Sunday: { open: '11:00', close: '22:00' }
          }
        }
      })
      .select()
      .single();
    
    if (venueError && venueError.code === 'PGRST116') {
      // No venue exists, create one
      const { data: newVenue, error: createError } = await supabase
        .from('venue_config')
        .insert({
          name: "Jack's on Water Street",
          timezone: 'America/New_York',
          settings: {
            address: '123 Water Street',
            city: 'Boston',
            state: 'MA',
            openDays: ['Friday', 'Saturday', 'Sunday'],
            typicalHours: {
              Friday: { open: '17:00', close: '02:00' },
              Saturday: { open: '11:00', close: '02:00' },
              Sunday: { open: '11:00', close: '22:00' }
            }
          }
        })
        .select()
        .single();
      
      if (createError) throw createError;
      console.log('✅ Venue created:', newVenue.name);
    } else if (venueError) {
      throw venueError;
    } else {
      console.log('✅ Venue updated:', venue.name);
    }
    
    // 2. Store API credentials (encrypted)
    console.log('\n2️⃣ Storing Toast API credentials...');
    const toastCredentials = {
      clientId: process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7',
      clientSecret: process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4',
      locationId: process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
      apiHost: 'https://ws-api.toasttab.com',
      userAccessType: 'TOAST_MACHINE_CLIENT'
    };
    
    const { error: toastError } = await supabase
      .from('api_credentials')
      .upsert({
        service: 'toast',
        credentials: toastCredentials,
        is_active: true
      }, { onConflict: 'service' });
    
    if (toastError) throw toastError;
    console.log('✅ Toast credentials stored');
    
    // 3. Initial data sync
    console.log('\n3️⃣ Performing initial data sync...');
    console.log('This will fetch the last 30 days of Toast data...');
    
    // Call the manual sync endpoint
    const axios = require('axios');
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    
    try {
      const syncResponse = await axios.post(`${baseUrl}/api/manual-sync`, {
        service: 'toast',
        // Last 30 days
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      });
      
      if (syncResponse.data.success) {
        console.log('✅ Initial sync completed');
        console.log(`   - Orders processed: ${syncResponse.data.services.toast?.ordersProcessed || 0}`);
        console.log(`   - Transactions created: ${syncResponse.data.services.toast?.transactionsCreated || 0}`);
      }
    } catch (error) {
      console.log('⚠️  Could not perform initial sync. Run manually after deployment.');
    }
    
    console.log('\n✅ Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Deploy to Vercel: vercel --prod');
    console.log('2. Test the dashboard: https://venue-smart-dashboard.vercel.app/api/dashboard-supabase');
    console.log('3. The cron job will sync new data every 3 minutes');
    console.log('\nTo manually sync historical data:');
    console.log('POST to /api/manual-sync with:');
    console.log('{ "startDate": "2024-01-01", "endDate": "2024-12-31", "service": "toast" }');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

setupJacksVenue();
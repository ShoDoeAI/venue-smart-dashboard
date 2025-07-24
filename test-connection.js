require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function testConnection() {
  console.log('🔍 Testing Complete Data Flow for Jack\'s on Water Street\n');
  console.log('============================================\n');
  
  const results = {
    toast: { status: '❌', message: '' },
    supabase: { status: '❌', message: '' },
    dataFlow: { status: '❌', message: '' },
    revenue: { status: '❌', message: '' }
  };
  
  try {
    // Test 1: Toast Connection
    console.log('1️⃣ Testing Toast API Connection...');
    try {
      const authResponse = await axios.post(
        'https://ws-api.toasttab.com/authentication/v1/authentication/login',
        {
          clientId: TOAST_CLIENT_ID,
          clientSecret: TOAST_CLIENT_SECRET,
          userAccessType: 'TOAST_MACHINE_CLIENT',
        }
      );
      
      const token = authResponse.data.token.accessToken;
      results.toast.status = '✅';
      results.toast.message = 'Connected to Toast API';
      console.log('   ✅ Toast authentication successful');
      
      // Get restaurant name
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
        };
        
        const restaurantResponse = await axios.get(
          `https://ws-api.toasttab.com/restaurants/v1/restaurants/${TOAST_LOCATION_ID}`,
          { headers }
        );
        
        console.log(`   ✅ Restaurant: ${restaurantResponse.data.name}`);
        results.toast.restaurant = restaurantResponse.data.name;
      } catch (e) {
        console.log('   ⚠️  Could not fetch restaurant details');
      }
    } catch (error) {
      results.toast.status = '❌';
      results.toast.message = error.message;
      console.log(`   ❌ Toast connection failed: ${error.message}`);
    }
    
    // Test 2: Supabase Connection
    console.log('\n2️⃣ Testing Supabase Connection...');
    try {
      // Check if we can query the database
      const { data, error } = await supabase
        .from('venue_config')
        .select('name, settings')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      results.supabase.status = '✅';
      results.supabase.message = 'Connected to Supabase';
      console.log('   ✅ Supabase connection successful');
      
      if (data) {
        console.log(`   ✅ Venue: ${data.name}`);
        results.supabase.venue = data.name;
      } else {
        console.log('   ⚠️  No venue configured yet');
      }
    } catch (error) {
      results.supabase.status = '❌';
      results.supabase.message = error.message;
      console.log(`   ❌ Supabase connection failed: ${error.message}`);
    }
    
    // Test 3: Check Toast data in Supabase
    console.log('\n3️⃣ Checking Toast Data in Supabase...');
    try {
      // Get count of Toast transactions
      const { count, error: countError } = await supabase
        .from('toast_transactions')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      console.log(`   📊 Total transactions in database: ${count || 0}`);
      
      // Get latest transaction
      const { data: latestTransaction, error: latestError } = await supabase
        .from('toast_transactions')
        .select('created_at, total_amount, transaction_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (latestTransaction) {
        const date = new Date(latestTransaction.created_at);
        const amount = (latestTransaction.total_amount / 100).toFixed(2);
        console.log(`   📅 Latest transaction: ${date.toLocaleString()} - $${amount}`);
        results.dataFlow.status = '✅';
        results.dataFlow.message = `${count} transactions synced`;
      } else {
        console.log('   ⚠️  No transactions found - need to sync data');
        results.dataFlow.status = '⚠️';
        results.dataFlow.message = 'No data synced yet';
      }
      
      // Get today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayData, error: todayError } = await supabase
        .from('toast_transactions')
        .select('total_amount')
        .gte('created_at', today.toISOString());
      
      if (!todayError && todayData) {
        const todayRevenue = todayData.reduce((sum, t) => sum + (t.total_amount / 100), 0);
        console.log(`   💰 Today's revenue: $${todayRevenue.toFixed(2)}`);
      }
      
    } catch (error) {
      results.dataFlow.status = '❌';
      results.dataFlow.message = error.message;
      console.log(`   ❌ Data check failed: ${error.message}`);
    }
    
    // Test 4: Test API endpoints
    console.log('\n4️⃣ Testing API Endpoints...');
    const baseUrl = 'http://localhost:3000';
    
    try {
      // Test dashboard-supabase endpoint
      const dashboardResponse = await axios.get(`${baseUrl}/api/dashboard-supabase`);
      
      if (dashboardResponse.data.success) {
        const data = dashboardResponse.data.data;
        console.log('   ✅ Dashboard API working');
        console.log(`   📊 Today: $${data.today.revenue.toFixed(2)} (${data.today.transactions} transactions)`);
        console.log(`   📊 Yesterday: $${data.yesterday.revenue.toFixed(2)}`);
        console.log(`   📊 Last 7 days: $${data.last7Days.revenue.toFixed(2)}`);
        console.log(`   📊 Last weekend: $${data.lastWeekend.revenue.toFixed(2)}`);
        
        results.revenue.status = '✅';
        results.revenue.message = 'Revenue calculations working';
        results.revenue.details = {
          today: data.today.revenue,
          yesterday: data.yesterday.revenue,
          last7Days: data.last7Days.revenue,
          lastWeekend: data.lastWeekend.revenue
        };
      }
    } catch (error) {
      console.log(`   ⚠️  Dashboard API not accessible locally`);
      console.log('   Try: https://venue-smart-dashboard.vercel.app/api/dashboard-supabase');
    }
    
    // Summary
    console.log('\n\n📋 CONNECTION STATUS SUMMARY');
    console.log('============================');
    console.log(`Toast API:        ${results.toast.status} ${results.toast.message}`);
    console.log(`Supabase:         ${results.supabase.status} ${results.supabase.message}`);
    console.log(`Data Flow:        ${results.dataFlow.status} ${results.dataFlow.message}`);
    console.log(`Revenue Calc:     ${results.revenue.status} ${results.revenue.message}`);
    
    // Recommendations
    console.log('\n\n💡 NEXT STEPS');
    console.log('==============');
    
    if (results.dataFlow.status === '⚠️') {
      console.log('1. Run initial data sync:');
      console.log('   node setup-jacks-venue.js');
      console.log('\n2. Or manually sync last 30 days:');
      console.log('   curl -X POST http://localhost:3000/api/manual-sync -H "Content-Type: application/json" -d \'{"service": "toast"}\'');
    }
    
    if (results.revenue.status !== '✅') {
      console.log('1. Deploy the new endpoints:');
      console.log('   vercel --prod');
      console.log('\n2. Test the deployed version:');
      console.log('   https://venue-smart-dashboard.vercel.app/api/dashboard-supabase');
    }
    
    console.log('\n3. To import ALL historical data:');
    console.log('   POST to /api/manual-sync with date range');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testConnection();
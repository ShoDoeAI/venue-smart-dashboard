const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyToastData() {
  console.log('🔍 Verifying Toast Data...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // 1. Check Toast credentials
    console.log('1️⃣ Checking Toast Configuration:');
    const { data: creds } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('api_name', 'toast')
      .single();

    if (creds) {
      console.log('✅ Toast Credentials Found:');
      console.log(`   - Location ID: ${creds.credentials.locationGuid}`);
      console.log(`   - Environment: ${creds.credentials.environment || 'production'}`);
      console.log(`   - Client ID: ${creds.credentials.clientId.substring(0, 10)}...`);
    }

    // 2. Check recent orders
    console.log('\n2️⃣ Checking Recent Toast Orders:');
    const { data: orders, error: ordersError } = await supabase
      .from('toast_orders')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(5);

    if (orders && orders.length > 0) {
      console.log(`✅ Found ${orders.length} recent orders:`);
      orders.forEach(order => {
        console.log(`   - Order ${order.order_number || order.display_number}:`);
        console.log(`     Created: ${new Date(order.created_date).toLocaleString()}`);
        console.log(`     Location: ${order.location_id}`);
        console.log(`     Revenue Center: ${order.revenue_center_name || 'N/A'}`);
        console.log(`     Server: ${order.server_first_name} ${order.server_last_name}`);
      });
    } else {
      console.log('❌ No orders found in toast_orders table');
    }

    // 3. Check payments
    console.log('\n3️⃣ Checking Toast Payments:');
    const { data: payments } = await supabase
      .from('toast_payments')
      .select('*')
      .order('paid_date', { ascending: false })
      .limit(5);

    if (payments && payments.length > 0) {
      console.log(`✅ Found ${payments.length} recent payments:`);
      let totalRevenue = 0;
      payments.forEach(payment => {
        const amount = (payment.amount + (payment.tip_amount || 0)) / 100;
        totalRevenue += amount;
        console.log(`   - Payment: $${amount.toFixed(2)}`);
        console.log(`     Type: ${payment.type}`);
        console.log(`     Date: ${payment.paid_date ? new Date(payment.paid_date).toLocaleString() : 'N/A'}`);
      });
      console.log(`   📊 Total from last 5 payments: $${totalRevenue.toFixed(2)}`);
    }

    // 4. Check data freshness
    console.log('\n4️⃣ Checking Data Freshness:');
    const { data: syncStatus } = await supabase
      .from('api_sync_status')
      .select('*')
      .eq('service', 'toast')
      .single();

    if (syncStatus) {
      console.log(`✅ Last sync: ${new Date(syncStatus.last_sync_at).toLocaleString()}`);
      console.log(`   Next sync: Every 3 minutes (automatic)`);
    }

    // 5. Check cron logs
    console.log('\n5️⃣ Checking Recent Sync Activity:');
    const { data: cronLogs } = await supabase
      .from('cron_logs')
      .select('*')
      .eq('job_name', 'fetch-data')
      .order('executed_at', { ascending: false })
      .limit(3);

    if (cronLogs && cronLogs.length > 0) {
      console.log('✅ Recent sync jobs:');
      cronLogs.forEach(log => {
        console.log(`   - ${new Date(log.executed_at).toLocaleString()}: ${log.status}`);
        if (log.metadata?.summary) {
          console.log(`     Processed: ${log.metadata.summary.processed || 0} venues`);
        }
      });
    }

    // 6. Data validation
    console.log('\n6️⃣ Data Validation:');
    console.log('⚠️  IMPORTANT: You are using SANDBOX credentials');
    console.log('   - This connects to Toast\'s demo environment');
    console.log('   - Data is from "Jack\'s on Water Street" (demo restaurant)');
    console.log('   - This is TEST DATA, not real restaurant data');
    console.log('\n📝 To get REAL data:');
    console.log('   1. Contact Toast to get production API credentials');
    console.log('   2. Update TOAST_ENVIRONMENT to "production" in Vercel');
    console.log('   3. Use your actual restaurant\'s location GUID');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyToastData();
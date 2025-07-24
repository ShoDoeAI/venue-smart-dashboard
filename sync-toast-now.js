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

async function syncToastNow() {
  console.log('🔄 Syncing Toast Data to Supabase\n');
  
  try {
    // Step 1: Authenticate with Toast
    console.log('1️⃣ Authenticating with Toast...');
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    console.log('   ✅ Toast authentication successful');
    
    // Step 2: Fetch last 30 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log(`\n2️⃣ Fetching orders from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...`);
    
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };
    
    const response = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk`,
      {
        headers,
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pageSize: 10000
        }
      }
    );
    
    const orders = response.data || [];
    console.log(`   ✅ Found ${orders.length} orders`);
    
    // Step 3: Process and store in Supabase
    console.log('\n3️⃣ Storing in Supabase...');
    const snapshotTimestamp = new Date().toISOString();
    let successCount = 0;
    let errorCount = 0;
    
    for (const order of orders) {
      if (order.checks && Array.isArray(order.checks)) {
        for (let checkIndex = 0; checkIndex < order.checks.length; checkIndex++) {
          const check = order.checks[checkIndex];
          
          // Skip voided checks
          if (check.voided || check.deleted) continue;
          
          const transaction = {
            snapshot_timestamp: snapshotTimestamp,
            transaction_id: `${order.guid}_check_${checkIndex}`,
            location_id: TOAST_LOCATION_ID,
            created_at: order.createdDate,
            
            // Amounts (in cents)
            total_amount: check.totalAmount || 0,
            tax_amount: check.taxAmount || 0,
            tip_amount: check.tipAmount || 0,
            discount_amount: Math.abs(check.discountAmount || 0),
            service_charge_amount: check.serviceChargeAmount || 0,
            
            // Details
            source_type: check.paymentType || 'UNKNOWN',
            status: check.closedDate ? 'COMPLETED' : 'PENDING',
            receipt_number: order.orderNumber || order.guid,
            
            // Staff/customer
            team_member_id: check.employeeId || null,
            device_id: order.deviceId || null,
            
            // Items
            item_count: check.selections ? check.selections.length : 0,
            unique_item_count: check.selections ? 
              new Set(check.selections.map(s => s.guid)).size : 0,
            
            // Complex data
            itemizations: check.selections || [],
            payment_details: check.payments || [],
            refunds: check.refunds || []
          };
          
          try {
            const { error } = await supabase
              .from('toast_transactions')
              .upsert(transaction, { 
                onConflict: 'transaction_id',
                ignoreDuplicates: true 
              });
            
            if (error) {
              console.error(`   ❌ Error inserting ${transaction.transaction_id}:`, error.message);
              errorCount++;
            } else {
              successCount++;
              if (successCount % 100 === 0) {
                console.log(`   ✅ Processed ${successCount} transactions...`);
              }
            }
          } catch (err) {
            console.error(`   ❌ Error:`, err.message);
            errorCount++;
          }
        }
      }
    }
    
    console.log(`\n✅ Sync Complete!`);
    console.log(`   - Successfully stored: ${successCount} transactions`);
    console.log(`   - Errors: ${errorCount}`);
    
    // Step 4: Verify the data
    console.log('\n4️⃣ Verifying data in Supabase...');
    const { count, error: countError } = await supabase
      .from('toast_transactions')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`   ✅ Total transactions in Supabase: ${count}`);
      
      // Get revenue summary
      const { data: recentData } = await supabase
        .from('toast_transactions')
        .select('total_amount, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (recentData && recentData.length > 0) {
        const totalRevenue = recentData.reduce((sum, t) => sum + (t.total_amount / 100), 0);
        console.log(`   💰 Last 30 days revenue: $${totalRevenue.toFixed(2)}`);
      }
    }
    
    console.log('\n✨ Toast data is now in Supabase!');
    console.log('The dashboard will now show this data.');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

syncToastNow();
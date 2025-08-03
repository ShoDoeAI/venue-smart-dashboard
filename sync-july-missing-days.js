require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getToastToken() {
  const response = await fetch(
    'https://ws-api.toasttab.com/authentication/v1/authentication/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.accessToken;
}

async function syncJulyDay(day, token) {
  const businessDate = `2025-07-${day.toString().padStart(2, '0')}`;
  console.log(`\nSyncing ${businessDate}...`);
  
  const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=${businessDate}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_GUID,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.log(`  Failed: ${response.status} ${response.statusText}`);
    return;
  }
  
  const orders = await response.json();
  console.log(`  Found ${orders.length} orders`);
  
  let dayRevenue = 0;
  let checkCount = 0;
  
  for (const order of orders) {
    if (order.checks && Array.isArray(order.checks)) {
      for (const check of order.checks) {
        checkCount++;
        
        // Toast API returns amounts in cents, convert to dollars
        const totalAmount = (check.totalAmount || 0) / 100;
        const amount = (check.amount || 0) / 100;
        const taxAmount = (check.taxAmount || 0) / 100;
        const tipAmount = (check.tipAmount || 0) / 100;
        const discountAmount = (check.discountAmount || 0) / 100;
        
        dayRevenue += totalAmount;
        
        // Upsert check data
        await supabase.from('toast_checks').upsert({
          check_guid: check.guid,
          order_guid: order.guid,
          location_id: process.env.TOAST_LOCATION_GUID,
          total_amount: totalAmount,
          amount: amount,
          tax_amount: taxAmount,
          tip_amount: tipAmount,
          discount_amount: discountAmount,
          payment_status: check.paymentStatus || 'OPEN',
          created_date: check.createdDate || check.openedDate,
          closed_date: check.closedDate,
          is_historical: true,
          synced_at: new Date().toISOString()
        });
      }
    }
  }
  
  console.log(`  Synced ${checkCount} checks, total revenue: $${dayRevenue.toFixed(2)}`);
  return { checks: checkCount, revenue: dayRevenue };
}

async function syncMissingDays() {
  console.log('July 2025 Missing Days Sync');
  console.log('===========================');
  
  const missingDays = [
    2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18,
    20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31
  ];
  
  try {
    // Get auth token
    console.log('\nGetting Toast auth token...');
    const token = await getToastToken();
    console.log('✓ Authentication successful');
    
    let totalRevenue = 0;
    let totalChecks = 0;
    
    // Sync each missing day
    for (const day of missingDays) {
      try {
        const result = await syncJulyDay(day, token);
        if (result) {
          totalRevenue += result.revenue;
          totalChecks += result.checks;
        }
        
        // Rate limit: wait 2 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`  Error syncing day ${day}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Sync Summary:');
    console.log(`- Days synced: ${missingDays.length}`);
    console.log(`- Total checks: ${totalChecks}`);
    console.log(`- Total revenue: $${totalRevenue.toFixed(2)}`);
    
    // Show updated July totals
    const { data: julyData } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .gte('created_date', '2025-07-01')
      .lt('created_date', '2025-08-01');
    
    const grandTotal = julyData?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
    
    console.log(`\nUpdated July 2025 total: $${grandTotal.toFixed(2)} (${julyData?.length || 0} checks)`);
    console.log('\n✓ Sync complete! Check your dashboard to verify the data matches Toast.');
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

syncMissingDays().catch(console.error);
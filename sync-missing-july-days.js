require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Import the Toast connector
const { ToastConnector } = require('./packages/shared/dist/connectors/toast/toast-connector.js');

async function syncMissingJulyDays() {
  console.log('Toast Missing Days Sync');
  console.log('=======================\n');
  
  // Define missing days
  const missingDays = [
    2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18,
    20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31
  ];
  
  console.log(`Will sync ${missingDays.length} missing days from July 2025\n`);
  
  try {
    // Initialize Toast connector
    const credentials = {
      id: 'manual-sync',
      service: 'toast',
      credentials: {
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        locationId: process.env.TOAST_LOCATION_GUID,
        environment: process.env.TOAST_ENVIRONMENT || 'production'
      },
      isActive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const config = {
      rateLimit: {
        requestsPerMinute: 30,
        burstLimit: 10
      },
      retry: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      }
    };
    
    const toastConnector = new ToastConnector(credentials, config, supabase);
    
    // Test connection first
    console.log('Testing Toast connection...');
    const testResult = await toastConnector.testConnection();
    if (!testResult.success) {
      console.error('Connection test failed:', testResult.error);
      return;
    }
    console.log('✓ Connection successful\n');
    
    // Sync each missing day
    for (const day of missingDays) {
      const startDate = new Date(`2025-07-${day.toString().padStart(2, '0')}T00:00:00-04:00`);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      console.log(`Syncing July ${day}...`);
      
      try {
        const result = await toastConnector.fetchOrders(startDate, endDate);
        
        if (result.success && result.data) {
          const orders = result.data;
          console.log(`  Found ${orders.length} orders`);
          
          // Calculate total revenue for the day
          const dayTotal = orders.reduce((sum, order) => {
            const checks = order.checks || [];
            const checkTotal = checks.reduce((checkSum, check) => 
              checkSum + (check.totalAmount || 0), 0
            );
            return sum + checkTotal;
          }, 0);
          
          console.log(`  Total revenue: $${dayTotal.toFixed(2)}`);
          
          // Save to database
          if (orders.length > 0) {
            // Transform and save the data
            for (const order of orders) {
              if (order.checks) {
                for (const check of order.checks) {
                  await supabase.from('toast_checks').upsert({
                    check_guid: check.guid,
                    order_guid: order.guid,
                    location_id: credentials.credentials.locationId,
                    total_amount: check.totalAmount || 0,
                    amount: check.amount || 0,
                    tax_amount: check.taxAmount || 0,
                    tip_amount: check.tipAmount || 0,
                    discount_amount: check.discountAmount || 0,
                    payment_status: check.paymentStatus,
                    created_date: check.createdDate,
                    closed_date: check.closedDate,
                    is_historical: true,
                    synced_at: new Date().toISOString()
                  });
                }
              }
            }
          }
          
        } else {
          console.log(`  Error: ${result.error?.message || 'Unknown error'}`);
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`  Failed to sync July ${day}:`, error.message);
      }
    }
    
    console.log('\n✓ Sync complete!');
    
    // Show updated summary
    const { data: julyData } = await supabase
      .from('toast_checks')
      .select('created_date, total_amount')
      .gte('created_date', '2025-07-01')
      .lt('created_date', '2025-08-01');
    
    const totalRevenue = julyData?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
    
    console.log(`\nUpdated July totals:`);
    console.log(`- Total checks: ${julyData?.length || 0}`);
    console.log(`- Total revenue: $${totalRevenue.toFixed(2)}`);
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

syncMissingJulyDays().catch(console.error);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Sync missing Toast data for specific dates
 * Uses the toast_orders and toast_checks tables
 */

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
    throw new Error(`Toast auth failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.token.accessToken;
}

async function syncToastDate(dateStr) {
  const businessDate = dateStr.replace(/-/g, '');
  const businessDateInt = parseInt(businessDate);
  
  console.log(`\n📅 Syncing ${dateStr} (business date: ${businessDate})...`);
  
  try {
    // Get Toast token
    const token = await getToastToken();
    
    // Delete existing data for this business date
    const { data: existingOrders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', businessDateInt);
    
    if (existingOrders && existingOrders.length > 0) {
      const orderGuids = existingOrders.map(o => o.order_guid);
      
      // Delete checks first
      await supabase
        .from('toast_checks')
        .delete()
        .in('order_guid', orderGuids);
      
      // Then delete orders
      await supabase
        .from('toast_orders')
        .delete()
        .eq('business_date', businessDateInt);
      
      console.log(`   Cleaned up ${existingOrders.length} existing orders`);
    }
    
    // Fetch orders from Toast using businessDate parameter
    const params = new URLSearchParams({
      businessDate: businessDate,
      pageSize: '100',
      page: '1'
    });
    
    const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': process.env.TOAST_RESTAURANT_GUID
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }
    
    const orders = await response.json();
    console.log(`   Found ${orders.length} orders`);
    
    if (orders.length === 0) {
      return { orders: 0, checks: 0, revenue: 0 };
    }
    
    // Process orders
    let totalRevenue = 0;
    let totalChecks = 0;
    
    for (const order of orders) {
      // Insert order
      const orderData = {
        order_guid: order.guid,
        location_id: process.env.TOAST_RESTAURANT_GUID,
        business_date: businessDateInt,
        created_date: order.createdDate || order.openedDate || new Date().toISOString(),
        modified_date: order.modifiedDate || order.createdDate || new Date().toISOString(),
        opened_date: order.openedDate || null,
        closed_date: order.closedDate || null,
        deleted_date: order.deletedDate || null,
        void_date: order.voidDate || null,
        source: order.source || 'POS',
        void_business_date: order.voidBusinessDate || null,
        display_number: order.displayNumber || null,
        external_id: order.externalId || null,
        revenue_center_guid: order.revenueCenter?.guid || null,
        revenue_center_name: order.revenueCenter?.name || null,
        dining_option_guid: order.diningOption?.guid || null,
        dining_option_name: order.diningOption?.name || null,
        server_guid: order.server?.guid || null,
        server_external_id: order.server?.externalId || null,
        server_first_name: order.server?.firstName || null,
        server_last_name: order.server?.lastName || null,
        guest_count: order.numberOfGuests || null,
        approval_status: order.approvalStatus || null,
        paid_date: order.paidDate || null,
        voided: order.voided || false,
        is_historical: false,
        snapshot_timestamp: new Date().toISOString()
      };
      
      const { error: orderError } = await supabase
        .from('toast_orders')
        .insert([orderData]);
      
      if (orderError) {
        console.error(`   Error inserting order: ${orderError.message}`);
        continue;
      }
      
      // Process checks
      if (order.checks && Array.isArray(order.checks)) {
        for (const check of order.checks) {
          const checkData = {
            check_guid: check.guid,
            order_guid: order.guid,
            created_date: check.createdDate || check.openedDate || order.createdDate || new Date().toISOString(),
            opened_date: check.openedDate || null,
            closed_date: check.closedDate || null,
            void_date: check.voidDate || null,
            total_amount: check.totalAmount || 0,
            amount: check.amount || 0,
            tip_amount: check.tipAmount || 0,
            tax_amount: check.taxAmount || 0,
            applied_discount_amount: check.appliedDiscountAmount || 0,
            voided: check.voided || false,
            tab_name: check.tabName || null,
            payment_status: check.paymentStatus || null,
            customer_guid: check.customer?.guid || null,
            customer_first_name: check.customer?.firstName || null,
            customer_last_name: check.customer?.lastName || null,
            customer_phone: check.customer?.phone || null,
            customer_email: check.customer?.email || null,
            customer_company_name: check.customer?.companyName || null,
            applied_service_charges: check.appliedServiceCharges || null,
            applied_discounts: check.appliedDiscounts || null,
            is_historical: false,
            snapshot_timestamp: new Date().toISOString()
          };
          
          const { error: checkError } = await supabase
            .from('toast_checks')
            .insert([checkData]);
          
          if (checkError) {
            console.error(`   Error inserting check: ${checkError.message}`);
          } else {
            if (!check.voided) {
              totalRevenue += check.totalAmount || 0;
              totalChecks++;
            }
          }
        }
      }
    }
    
    console.log(`   ✅ Synced: ${orders.length} orders, ${totalChecks} checks, $${totalRevenue.toFixed(2)} revenue`);
    
    return { orders: orders.length, checks: totalChecks, revenue: totalRevenue };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { orders: 0, checks: 0, revenue: 0, error: error.message };
  }
}

module.exports = async (req, res) => {
  try {
    // Get dates from query params or use missing August dates
    const datesToSync = req.query.dates ? req.query.dates.split(',') : [
      '2025-08-03',
      '2025-08-04', 
      '2025-08-05',
      '2025-08-06',
      '2025-08-07',
      '2025-08-09',
      '2025-08-10'
    ];
    
    console.log('🔄 Starting Toast sync for missing dates...');
    console.log('Dates to sync:', datesToSync);
    
    const results = [];
    
    for (const date of datesToSync) {
      const result = await syncToastDate(date);
      results.push({ date, ...result });
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Calculate totals
    const totals = results.reduce((acc, r) => ({
      orders: acc.orders + r.orders,
      checks: acc.checks + r.checks,
      revenue: acc.revenue + r.revenue
    }), { orders: 0, checks: 0, revenue: 0 });
    
    res.status(200).json({
      success: true,
      message: `Synced ${datesToSync.length} dates`,
      results,
      totals
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
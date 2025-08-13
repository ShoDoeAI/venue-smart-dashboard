import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get Eastern Time business date
function getEasternBusinessDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const dateComponents = {};
  parts.forEach(({ type, value }) => {
    if (type !== 'literal') dateComponents[type] = value;
  });
  
  return `${dateComponents.year}${dateComponents.month}${dateComponents.day}`;
}

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

export default async function handler(req, res) {
  console.log('Starting complete Toast sync...');
  
  try {
    // Get date to sync (default to yesterday in Eastern Time)
    let targetDate;
    if (req.body?.date) {
      targetDate = req.body.date.replace(/-/g, '');
    } else {
      // Default to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = getEasternBusinessDate(yesterday);
    }
    
    console.log(`Syncing business date: ${targetDate}`);
    
    // Get Toast token
    const token = await getToastToken();
    
    // First, clear existing data for this date
    const businessDateInt = parseInt(targetDate);
    console.log(`Clearing existing data for business_date ${businessDateInt}`);
    
    await supabase
      .from('toast_orders')
      .delete()
      .eq('business_date', businessDateInt);
    
    // Fetch ALL orders - no page limit!
    let allOrders = [];
    let totalChecks = 0;
    let totalRevenue = 0;
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`Fetching page ${page}...`);
      
      const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?` +
        `businessDate=${targetDate}&page=${page}&pageSize=100`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID
        }
      });
      
      if (!response.ok) {
        console.log(`Toast API error: ${response.status}`);
        break;
      }
      
      const orders = await response.json();
      console.log(`Page ${page}: ${orders.length} orders`);
      
      if (!orders || orders.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process each order
      for (const order of orders) {
        // Save order
        await supabase
          .from('toast_orders')
          .insert({
            order_guid: order.guid,
            business_date: businessDateInt,
            created_date: order.createdDate || order.openedDate,
            order_data: order
          });
        
        // Process checks
        if (order.checks && Array.isArray(order.checks)) {
          for (const check of order.checks) {
            if (!check.deleted && check.guid) {
              totalChecks++;
              
              const checkAmount = check.totalAmount || 0;
              if (!check.voided) {
                totalRevenue += checkAmount;
              }
              
              // Upsert check
              await supabase
                .from('toast_checks')
                .upsert({
                  check_guid: check.guid,
                  order_guid: order.guid,
                  total_amount: checkAmount,
                  closed_at: check.closedDate,
                  voided: check.voided || false,
                  check_data: check
                }, { onConflict: 'check_guid' });
            }
          }
        }
      }
      
      allOrders = allOrders.concat(orders);
      
      // Continue if we got a full page
      if (orders.length === 100) {
        page++;
      } else {
        hasMore = false;
      }
    }
    
    // Verify the sync
    const { count: finalOrderCount } = await supabase
      .from('toast_orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_date', businessDateInt);
    
    const result = {
      success: true,
      businessDate: targetDate,
      ordersFound: allOrders.length,
      ordersStored: finalOrderCount,
      totalChecks,
      totalRevenue: totalRevenue.toFixed(2),
      pagesProcessed: page - 1,
      message: `Successfully synced ${allOrders.length} orders with $${totalRevenue.toFixed(2)} in revenue`
    };
    
    console.log('Sync complete:', result);
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
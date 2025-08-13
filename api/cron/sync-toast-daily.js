const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Daily Toast Sync Cron Job
 * Runs every day to sync yesterday's data
 * Can be triggered by Vercel Cron or manually
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

async function syncToastDay(dateStr) {
  const businessDate = dateStr ? dateStr.replace(/-/g, '') : getEasternBusinessDate();
  const startOfDay = `${dateStr || new Date().toISOString().split('T')[0]}T00:00:00.000Z`;
  const endOfDay = new Date(new Date(startOfDay).getTime() + 24 * 60 * 60 * 1000).toISOString();
  
  // Get Toast token
  const token = await getToastToken();
  
  // Clear existing data
  const { data: existingChecks } = await supabase
    .from('toast_checks')
    .select('check_guid')
    .gte('created_date', startOfDay)
    .lt('created_date', endOfDay);
  
  if (existingChecks && existingChecks.length > 0) {
    const checkGuids = existingChecks.map(c => c.check_guid);
    
    // Clear selections first
    for (let i = 0; i < checkGuids.length; i += 100) {
      await supabase
        .from('toast_selections')
        .delete()
        .in('check_guid', checkGuids.slice(i, i + 100));
    }
    
    // Then clear checks
    for (let i = 0; i < checkGuids.length; i += 100) {
      await supabase
        .from('toast_checks')
        .delete()
        .in('check_guid', checkGuids.slice(i, i + 100));
    }
  }
  
  // Fetch from Toast - NO PAGE LIMIT!
  let allOrders = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?` +
      `businessDate=${businessDate}&page=${page}&pageSize=100`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID
      }
    });
    
    if (!response.ok) {
      console.log(`Toast API error on page ${page}: ${response.status}`);
      break;
    }
    
    const orders = await response.json();
    console.log(`Page ${page}: ${orders.length} orders`);
    
    if (!orders || orders.length === 0) {
      hasMore = false;
      break;
    }
    
    allOrders = allOrders.concat(orders);
    
    // Continue if we got a full page
    if (orders.length === 100) {
      page++;
    } else {
      hasMore = false;
    }
  }
  
  // Process and save orders and checks
  const snapshotTimestamp = new Date().toISOString();
  const businessDateInt = parseInt(businessDate);
  let savedCount = 0;
  let totalRevenue = 0;
  let checkCount = 0;
  let selectionCount = 0;
  let savedSelections = 0;
  const allSelections = [];
  
  // First, clear existing orders for this date
  await supabase
    .from('toast_orders')
    .delete()
    .eq('business_date', businessDateInt);
  
  for (const order of allOrders) {
    // Save order to toast_orders table
    await supabase
      .from('toast_orders')
      .insert({
        order_guid: order.guid,
        business_date: businessDateInt,
        created_date: order.createdDate || order.openedDate,
        order_data: order
      });
    if (order.checks && Array.isArray(order.checks)) {
      for (const check of order.checks) {
        checkCount++;
        
        // Collect selections for this check
        if (check.selections && Array.isArray(check.selections)) {
          check.selections.forEach(selection => {
            allSelections.push({
              check_guid: check.guid,
              order_guid: order.guid,
              selection
            });
            selectionCount++;
          });
        }
        
        const checkData = {
          check_guid: check.guid,
          order_guid: order.guid,
          snapshot_timestamp: snapshotTimestamp,
          tab_name: check.tabName || null,
          total_amount: check.totalAmount || 0,
          amount: check.amount || 0,
          tax_amount: check.taxAmount || 0,
          tip_amount: check.tipAmount || 0,
          applied_discount_amount: check.appliedDiscountAmount || 0,
          created_date: check.createdDate || check.openedDate,
          opened_date: check.openedDate,
          closed_date: check.closedDate,
          voided: check.voided || false,
          void_date: check.voidDate,
          payment_status: check.paymentStatus || 'OPEN',
          customer_guid: check.customer?.guid || null,
          customer_first_name: check.customer?.firstName || null,
          customer_last_name: check.customer?.lastName || null,
          customer_phone: check.customer?.phone || null,
          customer_email: check.customer?.email || null,
          applied_service_charges: check.appliedServiceCharges || null,
          applied_discounts: check.appliedDiscounts || null,
          is_historical: false
        };
        
        const { error } = await supabase
          .from('toast_checks')
          .insert(checkData);
        
        if (!error) {
          savedCount++;
          if (!check.voided) {
            totalRevenue += checkData.total_amount;
          }
        }
      }
    }
  }
  
  // Save selections in batches
  for (let i = 0; i < allSelections.length; i += 25) {
    const batch = allSelections.slice(i, Math.min(i + 25, allSelections.length));
    const batchData = [];
    
    for (const { check_guid, order_guid, selection } of batch) {
      batchData.push({
        selection_guid: selection.guid,
        check_guid: check_guid,
        order_guid: order_guid,
        snapshot_timestamp: snapshotTimestamp,
        item_guid: selection.item?.guid || null,
        item_name: selection.displayName || selection.item?.entityType || 'Unknown Item',
        item_group_guid: selection.itemGroup?.guid || null,
        item_group_name: selection.itemGroup?.entityType || null,
        quantity: selection.quantity || 1,
        price: (selection.price || 0) * 100, // Convert to cents
        tax: (selection.tax || 0) * 100,
        pre_discount_price: (selection.preDiscountPrice || 0) * 100,
        receipt_line_price: (selection.receiptLinePrice || 0) * 100,
        display_name: selection.displayName || null,
        selection_type: selection.selectionType || null,
        sales_category_guid: selection.salesCategory?.guid || null,
        sales_category_name: selection.salesCategory?.entityType || null,
        voided: selection.voided || false,
        void_date: selection.voidDate || null,
        void_business_date: selection.voidBusinessDate || null,
        fulfillment_status: selection.fulfillmentStatus || null,
        modifiers: selection.modifiers || null,
        applied_discounts: selection.appliedDiscounts || null
      });
    }
    
    const { error } = await supabase
      .from('toast_selections')
      .insert(batchData);
    
    if (!error) {
      savedSelections += batchData.length;
    }
  }
  
  return {
    date: dateStr,
    orders: allOrders.length,
    checks: checkCount,
    saved: savedCount,
    revenue: totalRevenue,
    selections: selectionCount,
    savedSelections: savedSelections
  };
}

module.exports = async (req, res) => {
  // Verify cron secret (if using Vercel Cron)
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  try {
    // Sync yesterday by default
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    console.log(`Starting daily sync for ${dateStr}`);
    
    const result = await syncToastDay(dateStr);
    
    // Update sync status
    await supabase
      .from('api_credentials')
      .update({
        last_successful_fetch: new Date().toISOString(),
        metadata: {
          lastDailySync: {
            ...result,
            timestamp: new Date().toISOString()
          }
        }
      })
      .eq('service', 'toast');
    
    console.log(`Daily sync complete: ${result.saved}/${result.checks} checks, ${result.savedSelections}/${result.selections} items, $${result.revenue.toFixed(2)}`);
    
    res.status(200).json({
      success: true,
      message: `Synced ${dateStr}`,
      ...result
    });
    
  } catch (error) {
    console.error('Daily sync error:', error);
    
    // Log error to database
    await supabase
      .from('api_credentials')
      .update({
        last_error: error.message,
        last_error_at: new Date().toISOString()
      })
      .eq('service', 'toast');
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
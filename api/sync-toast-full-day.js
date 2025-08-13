// API endpoint to sync a complete day from Toast
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date, toastToken } = req.body;
  
  if (!date || !toastToken) {
    return res.status(400).json({ error: 'Date and toastToken required' });
  }

  console.log(`Starting full sync for ${date}`);
  
  const toastConfig = {
    headers: {
      'Authorization': `Bearer ${toastToken}`,
      'Toast-Restaurant-External-ID': process.env.TOAST_RESTAURANT_ID
    }
  };
  
  try {
    // First, clear existing data for this date to avoid duplicates
    const businessDate = parseInt(date.replace(/-/g, ''));
    
    console.log(`Clearing existing data for business_date ${businessDate}`);
    const { error: deleteError } = await supabase
      .from('toast_orders')
      .delete()
      .eq('business_date', businessDate);
      
    if (deleteError) {
      console.error('Error clearing old data:', deleteError);
    }
    
    // Fetch ALL pages from Toast
    let page = 1;
    let totalOrders = 0;
    let totalRevenue = 0;
    let hasMore = true;
    const allOrders = [];
    const allChecks = [];
    
    while (hasMore) {
      console.log(`Fetching page ${page}...`);
      
      const params = new URLSearchParams({
        businessDate: businessDate.toString(),
        pageSize: '100',
        page: page.toString()
      });
      
      const response = await axios.get(
        `https://ws-api.toasttab.com/orders/v2/ordersBulk?${params}`,
        toastConfig
      );
      
      const orders = response.data.orders || [];
      console.log(`Page ${page}: ${orders.length} orders`);
      
      if (orders.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process each order
      for (const order of orders) {
        totalOrders++;
        
        // Store order
        allOrders.push({
          order_guid: order.guid,
          business_date: businessDate,
          created_date: order.createdDate,
          order_data: order
        });
        
        // Process checks
        if (order.checks && order.checks.length > 0) {
          for (const check of order.checks) {
            if (!check.deleted) {
              const checkAmount = check.totalAmount || 0;
              if (!check.voided) {
                totalRevenue += checkAmount;
              }
              
              allChecks.push({
                check_guid: check.guid,
                order_guid: order.guid,
                total_amount: checkAmount,
                closed_at: check.closedDate,
                voided: check.voided || false,
                check_data: check
              });
            }
          }
        }
      }
      
      if (orders.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    console.log(`\nTotal orders found: ${totalOrders}`);
    console.log(`Total revenue: $${totalRevenue.toFixed(2)}`);
    
    // Insert all orders in batches
    console.log('\nInserting orders into database...');
    const ORDER_BATCH_SIZE = 100;
    for (let i = 0; i < allOrders.length; i += ORDER_BATCH_SIZE) {
      const batch = allOrders.slice(i, i + ORDER_BATCH_SIZE);
      const { error } = await supabase
        .from('toast_orders')
        .insert(batch);
        
      if (error) {
        console.error(`Error inserting order batch ${i / ORDER_BATCH_SIZE + 1}:`, error);
      } else {
        console.log(`Inserted order batch ${i / ORDER_BATCH_SIZE + 1} (${batch.length} orders)`);
      }
    }
    
    // Insert all checks in batches
    console.log('\nInserting checks into database...');
    const CHECK_BATCH_SIZE = 100;
    for (let i = 0; i < allChecks.length; i += CHECK_BATCH_SIZE) {
      const batch = allChecks.slice(i, i + CHECK_BATCH_SIZE);
      const { error } = await supabase
        .from('toast_checks')
        .upsert(batch, { onConflict: 'check_guid' });
        
      if (error) {
        console.error(`Error inserting check batch ${i / CHECK_BATCH_SIZE + 1}:`, error);
      } else {
        console.log(`Inserted check batch ${i / CHECK_BATCH_SIZE + 1} (${batch.length} checks)`);
      }
    }
    
    // Verify the sync
    const { count: finalOrderCount } = await supabase
      .from('toast_orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_date', businessDate);
      
    const { data: revenueCheck } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', businessDate);
      
    let verifiedRevenue = 0;
    if (revenueCheck && revenueCheck.length > 0) {
      const { data: checks } = await supabase
        .from('toast_checks')
        .select('total_amount')
        .in('order_guid', revenueCheck.map(o => o.order_guid))
        .eq('voided', false);
        
      verifiedRevenue = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    }
    
    const result = {
      success: true,
      date: date,
      ordersFound: totalOrders,
      ordersStored: finalOrderCount,
      totalRevenue: totalRevenue.toFixed(2),
      verifiedRevenue: verifiedRevenue.toFixed(2),
      message: `Successfully synced ${totalOrders} orders with $${totalRevenue.toFixed(2)} in revenue for ${date}`
    };
    
    console.log('\nSync complete:', result);
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'Unknown error'
    });
  }
}
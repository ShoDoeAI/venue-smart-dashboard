const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Toast credentials from environment variables
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID;
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET;
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID;

// Helper function for delays
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getToastToken() {
  const response = await axios.post(
    'https://ws-api.toasttab.com/authentication/v1/authentication/login',
    {
      clientId: TOAST_CLIENT_ID,
      clientSecret: TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    },
  );
  return response.data.token.accessToken;
}

async function processOrderBatch(orders, snapshotTimestamp) {
  let ordersProcessed = 0;
  let checksCreated = 0;
  let paymentsCreated = 0;
  let totalRevenue = 0;

  for (const order of orders) {
    try {
      // Extract server names from the server object
      const serverFirstName = order.server?.firstName || null;
      const serverLastName = order.server?.lastName || null;

      // 1. Insert into toast_orders
      const orderData = {
        snapshot_timestamp: snapshotTimestamp,
        order_guid: order.guid,
        location_id: TOAST_LOCATION_ID,
        external_id: order.externalId || null,
        display_number: order.displayNumber || null,
        order_number: order.orderNumber || null,
        source: order.source || null,
        business_date: order.businessDate || null,
        revenue_center_guid: order.revenueCenter?.guid || null,
        revenue_center_name: order.revenueCenter?.name || null,
        created_date: order.createdDate || null,
        modified_date: order.modifiedDate || null,
        opened_date: order.openedDate || null,
        closed_date: order.closedDate || null,
        paid_date: order.paidDate || null,
        deleted_date: order.deletedDate || null,
        voided: order.voided || false,
        void_date: order.voidDate || null,
        void_business_date: order.voidBusinessDate || null,
        approval_status: order.approvalStatus || null,
        guest_count: order.guestCount || null,
        dining_option_guid: order.diningOption?.guid || null,
        dining_option_name: order.diningOption?.name || null,
        server_guid: order.server?.guid || null,
        server_first_name: serverFirstName,
        server_last_name: serverLastName,
        server_external_id: order.server?.externalId || null,
        delivery_info: order.deliveryInfo || null,
        curbside_pickup_info: order.curbsidePickupInfo || null,
      };

      const { error: orderError } = await supabase
        .from('toast_orders')
        .upsert(orderData, { onConflict: 'order_guid,snapshot_timestamp' });

      if (orderError) {
        console.error('Error inserting order:', orderError);
        continue;
      }

      ordersProcessed++;

      // 2. Process checks
      if (order.checks && Array.isArray(order.checks)) {
        for (const check of order.checks) {
          const checkData = {
            snapshot_timestamp: snapshotTimestamp,
            check_guid: check.guid,
            order_guid: order.guid,
            tab_name: check.tabName || null,
            // Store dollar amounts directly (no conversion needed)
            amount: check.amount || 0,
            tax_amount: check.taxAmount || 0,
            tip_amount: check.tipAmount || 0,
            total_amount: check.totalAmount || 0,
            applied_discount_amount: check.appliedDiscountAmount || 0,
            created_date: check.createdDate || null,
            opened_date: check.openedDate || null,
            closed_date: check.closedDate || null,
            voided: check.voided || false,
            void_date: check.voidDate || null,
            payment_status: check.paymentStatus || null,
            customer_guid: check.customer?.guid || null,
            customer_first_name: check.customer?.firstName || null,
            customer_last_name: check.customer?.lastName || null,
            customer_phone: check.customer?.phone || null,
            customer_email: check.customer?.email || null,
            customer_company_name: check.customer?.companyName || null,
            applied_service_charges: check.appliedServiceCharges || [],
            applied_discounts: check.appliedDiscounts || [],
          };

          const { error: checkError } = await supabase
            .from('toast_checks')
            .upsert(checkData, { onConflict: 'check_guid,snapshot_timestamp' });

          if (checkError) {
            console.error('Error inserting check:', checkError);
            continue;
          }

          checksCreated++;
          // Toast API returns amounts in dollars already
          totalRevenue += check.totalAmount || 0;

          // 3. Process payments
          if (check.payments && Array.isArray(check.payments)) {
            for (const payment of check.payments) {
              const paymentData = {
                snapshot_timestamp: snapshotTimestamp,
                payment_guid: payment.guid,
                check_guid: check.guid,
                order_guid: order.guid,
                // Store dollar amounts directly (no conversion needed)
                amount: payment.amount || 0,
                tip_amount: payment.tipAmount || 0,
                amount_tendered: payment.amountTendered || null,
                type: payment.type || null,
                card_type: payment.cardType || null,
                last_4_digits: payment.last4Digits || null,
                external_payment_guid: payment.externalPaymentGuid || null,
                paid_date: payment.paidDate || null,
                paid_business_date: payment.paidBusinessDate || null,
                house: payment.house || false,
                refund_status: payment.refundStatus || null,
                voided: payment.voided || false,
                void_date: payment.voidDate || null,
                refund: payment.refund || null,
                mca_repayment_amount: payment.mcaRepaymentAmount || null,
              };

              const { error: paymentError } = await supabase
                .from('toast_payments')
                .upsert(paymentData, { onConflict: 'payment_guid,snapshot_timestamp' });

              if (paymentError) {
                console.error('Error inserting payment:', paymentError);
                continue;
              }

              paymentsCreated++;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing order ${order.guid}:`, error);
    }
  }

  return { ordersProcessed, checksCreated, paymentsCreated, totalRevenue };
}

async function fetchOrdersForDateRange(token, headers, startDate, endDate, maxOrders = 10000) {
  const orders = [];
  let page = 1;
  const pageSize = 100;
  
  console.log(`Fetching orders from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  while (orders.length < maxOrders) {
    try {
      const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
        headers,
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pageSize,
          page,
        },
        timeout: 10000,
      });

      const pageOrders = response.data || [];
      if (pageOrders.length === 0) break;
      
      orders.push(...pageOrders);
      console.log(`  Page ${page}: ${pageOrders.length} orders (total: ${orders.length})`);
      
      if (pageOrders.length < pageSize) break; // Last page
      
      page++;
      await sleep(200); // Rate limiting
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  return orders;
}

// API endpoint handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  // Parse request parameters
  const { 
    startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000), // 2 years ago
    endDate = new Date(),
    monthsToFetch = 24, // Default 2 years
    specificMonth = null // e.g., '2025-07' to fetch just July 2025
  } = req.body;

  try {
    const token = await getToastToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };

    const snapshotTimestamp = new Date().toISOString();
    const allResults = [];

    if (specificMonth) {
      // Fetch specific month
      const [year, month] = specificMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      
      console.log(`Fetching data for ${specificMonth}`);
      const orders = await fetchOrdersForDateRange(token, headers, monthStart, monthEnd);
      
      if (orders.length > 0) {
        const results = await processOrderBatch(orders, snapshotTimestamp);
        allResults.push({
          month: specificMonth,
          ordersFound: orders.length,
          ...results
        });
      }
    } else {
      // Fetch multiple months
      const endDateObj = new Date(endDate);
      const startDateObj = new Date(startDate);
      
      // Process month by month, starting from most recent
      const currentDate = new Date(endDateObj);
      let monthsProcessed = 0;
      
      while (currentDate >= startDateObj && monthsProcessed < monthsToFetch) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
        
        // Skip if month end is in the future
        const now = new Date();
        if (monthEnd > now) {
          monthEnd.setTime(now.getTime());
        }
        
        const monthStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
        console.log(`\nProcessing ${monthStr}...`);
        
        const orders = await fetchOrdersForDateRange(token, headers, monthStart, monthEnd);
        
        if (orders.length > 0) {
          const results = await processOrderBatch(orders, snapshotTimestamp);
          allResults.push({
            month: monthStr,
            ordersFound: orders.length,
            ...results
          });
        } else {
          allResults.push({
            month: monthStr,
            ordersFound: 0,
            ordersProcessed: 0,
            checksCreated: 0,
            paymentsCreated: 0,
            totalRevenue: 0
          });
        }
        
        // Move to previous month
        currentDate.setMonth(currentDate.getMonth() - 1);
        monthsProcessed++;
        
        // Add delay between months to avoid rate limits
        await sleep(1000);
      }
    }

    // Calculate totals
    const summary = allResults.reduce((acc, result) => ({
      totalOrders: acc.totalOrders + result.ordersProcessed,
      totalChecks: acc.totalChecks + result.checksCreated,
      totalPayments: acc.totalPayments + result.paymentsCreated,
      totalRevenue: acc.totalRevenue + result.totalRevenue,
      monthsWithData: acc.monthsWithData + (result.ordersFound > 0 ? 1 : 0)
    }), {
      totalOrders: 0,
      totalChecks: 0,
      totalPayments: 0,
      totalRevenue: 0,
      monthsWithData: 0
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);

    res.status(200).json({
      success: true,
      message: `Successfully synced ${summary.totalOrders} orders from ${allResults.length} months`,
      summary: {
        ...summary,
        totalRevenue: summary.totalRevenue.toFixed(2),
        averageOrderValue: summary.totalOrders > 0 
          ? (summary.totalRevenue / summary.totalOrders).toFixed(2) 
          : '0.00',
        executionTime: `${executionTime}s`
      },
      monthlyBreakdown: allResults.map(r => ({
        ...r,
        totalRevenue: r.totalRevenue.toFixed(2)
      })),
      dateRange: {
        start: startDate,
        end: endDate
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);

    res.status(500).json({
      success: false,
      error: error.message,
      executionTime: `${executionTime}s`,
    });
  }
};
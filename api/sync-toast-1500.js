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

          // 4. Process selections (items)
          if (check.selections && Array.isArray(check.selections)) {
            const selectionsData = check.selections.map((selection) => ({
              snapshot_timestamp: snapshotTimestamp,
              selection_guid: selection.guid,
              check_guid: check.guid,
              order_guid: order.guid,
              item_guid: selection.item?.guid,
              item_name: selection.displayName,
              quantity: selection.quantity || 1,
              unit_price: selection.price,
              total_price: (selection.price || 0) * (selection.quantity || 1),
              tax_amount: selection.tax || 0,
              voided: selection.voided || false,
              void_date: selection.voidDate,
              void_reason_guid: selection.voidReasonGuid,
              created_date: selection.createdDate,
              modifier_selections: selection.modifiers || [],
              raw_data: selection,
            }));

            const { error: selectionsError } = await supabase
              .from('toast_selections')
              .upsert(selectionsData, { onConflict: 'selection_guid,snapshot_timestamp' });

            if (selectionsError) {
              console.error('Error inserting selections:', selectionsError);
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
  const targetOrderCount = req.body?.limit || 1500;
  const pageSize = 100; // Toast API maximum
  const maxPages = Math.ceil(targetOrderCount / pageSize);

  try {
    const token = await getToastToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };

    // Date range: use provided dates or default to last 90 days
    const endDate = req.body?.endDate ? new Date(req.body.endDate) : new Date();
    const startDate = req.body?.startDate ? new Date(req.body.startDate) : (() => {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      return date;
    })();

    console.log(`Starting sync for ${targetOrderCount} orders (${maxPages} pages max)`);
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const snapshotTimestamp = new Date().toISOString();
    const progressData = {
      totalRequested: targetOrderCount,
      totalFetched: 0,
      totalRevenue: 0,
      pagesProcessed: 0,
      failedPages: [],
      pageDetails: [],
      ordersProcessed: 0,
      checksCreated: 0,
      paymentsCreated: 0,
    };

    let allOrdersFetched = 0;
    let shouldContinue = true;

    // Fetch and process pages
    for (let page = 1; page <= maxPages && shouldContinue; page++) {
      const pageStartTime = Date.now();

      // Add delay between requests (except for first page)
      if (page > 1) {
        await sleep(500);
      }

      // Check if we're approaching timeout (120 second limit for local run)
      if (Date.now() - startTime > 120000) {
        console.log('Approaching timeout limit, stopping pagination');
        break;
      }

      try {
        console.log(`Fetching page ${page}...`);

        const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
          headers,
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            pageSize,
            page,
          },
          timeout: 10000, // 10 second timeout per request
        });

        const pageOrders = response.data || [];
        console.log(`Page ${page}: Retrieved ${pageOrders.length} orders`);

        if (pageOrders.length === 0) {
          console.log('No more orders available, stopping pagination');
          shouldContinue = false;
          break;
        }

        // Process this page's orders
        const batchResults = await processOrderBatch(pageOrders, snapshotTimestamp);

        // Update progress
        allOrdersFetched += pageOrders.length;
        progressData.totalFetched = allOrdersFetched;
        progressData.pagesProcessed++;
        progressData.ordersProcessed += batchResults.ordersProcessed;
        progressData.checksCreated += batchResults.checksCreated;
        progressData.paymentsCreated += batchResults.paymentsCreated;
        progressData.totalRevenue += batchResults.totalRevenue;

        // Track page details
        progressData.pageDetails.push({
          page,
          ordersRetrieved: pageOrders.length,
          ordersProcessed: batchResults.ordersProcessed,
          revenue: batchResults.totalRevenue.toFixed(2),
          duration: Date.now() - pageStartTime,
        });

        // Check if we've reached our target
        if (allOrdersFetched >= targetOrderCount) {
          console.log(`Reached target of ${targetOrderCount} orders`);
          shouldContinue = false;
        }

        // If we got less than a full page, we've likely reached the end
        if (pageOrders.length < pageSize) {
          console.log('Received partial page, likely end of data');
          shouldContinue = false;
        }
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error.message);
        progressData.failedPages.push({
          page,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        // For auth errors, stop completely
        if (error.response?.status === 401) {
          throw new Error('Authentication failed');
        }

        // For other errors, continue to next page
        continue;
      }
    }

    // Update last successful fetch
    await supabase
      .from('api_credentials')
      .update({
        last_successful_fetch: new Date().toISOString(),
        last_error: null,
        metadata: {
          lastBulkSync: {
            timestamp: snapshotTimestamp,
            ordersProcessed: progressData.ordersProcessed,
            totalRevenue: progressData.totalRevenue,
          },
        },
      })
      .eq('service', 'toast');

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);

    res.status(200).json({
      success: true,
      message: `Successfully synced ${progressData.ordersProcessed} orders`,
      summary: {
        totalOrdersRequested: targetOrderCount,
        totalOrdersFetched: progressData.totalFetched,
        totalOrdersProcessed: progressData.ordersProcessed,
        totalChecks: progressData.checksCreated,
        totalPayments: progressData.paymentsCreated,
        totalRevenue: progressData.totalRevenue.toFixed(2),
        averageOrderValue:
          progressData.ordersProcessed > 0
            ? (progressData.totalRevenue / progressData.ordersProcessed).toFixed(2)
            : '0.00',
        pagesProcessed: progressData.pagesProcessed,
        failedPages: progressData.failedPages.length,
        executionTime: `${executionTime}s`,
      },
      pageDetails: progressData.pageDetails,
      failedPages: progressData.failedPages,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Update error in api_credentials
    await supabase
      .from('api_credentials')
      .update({
        last_error: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('service', 'toast');

    res.status(500).json({
      success: false,
      error: error.message,
      executionTime: `${executionTime}s`,
    });
  }
};

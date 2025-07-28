const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET =
  process.env.TOAST_CLIENT_SECRET ||
  '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

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

async function syncToastData(startDate, endDate) {
  const token = await getToastToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
  };

  console.log(`Fetching Toast data from ${startDate} to ${endDate}...`);

  // Fetch orders from Toast
  const response = await axios.get(`https://ws-api.toasttab.com/orders/v2/ordersBulk`, {
    headers,
    params: {
      startDate: startDate,
      endDate: endDate,
      pageSize: 100,
    },
  });

  const orders = response.data || [];
  console.log(`Found ${orders.length} orders to sync`);

  const snapshotTimestamp = new Date().toISOString();
  let ordersProcessed = 0;
  let paymentsCreated = 0;
  let checksCreated = 0;

  // Process each order
  for (const order of orders) {
    try {
      // 1. Insert into toast_orders
      const orderData = {
        snapshot_timestamp: snapshotTimestamp,
        order_guid: order.guid,
        location_id: TOAST_LOCATION_ID,
        order_number: order.displayNumber,
        created_date: order.createdDate,
        paid_date: order.paidDate,
        paid_business_date: order.paidBusinessDate,
        server_guid: order.server?.guid || null,
        server_name: order.server ? `${order.server.firstName} ${order.server.lastName}` : null,
        source: order.source || 'POS',
        voided: order.voided || false,
        void_date: order.voidDate,
        revenue_center_guid: order.revenueCenter?.guid,
        dining_option_guid: order.diningOption?.guid,
        dining_option_name: order.diningOption?.name,
        raw_data: order,
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
            check_number: check.displayNumber,
            opened_date: check.openedDate,
            closed_date: check.closedDate,
            amount: check.amount || 0,
            tax_amount: check.taxAmount || 0,
            tax_exempt: check.taxExempt || false,
            applied_discount_amount: check.appliedDiscountAmount || 0,
            applied_service_charges: check.appliedServiceCharges || [],
            customer_guid: check.customer?.guid,
            customer_first_name: check.customer?.firstName,
            customer_last_name: check.customer?.lastName,
            customer_email: check.customer?.email,
            customer_phone: check.customer?.phone,
            voided: check.voided || false,
            void_date: check.voidDate,
            tab_name: check.tabName,
            raw_data: check,
          };

          const { error: checkError } = await supabase
            .from('toast_checks')
            .upsert(checkData, { onConflict: 'check_guid,snapshot_timestamp' });

          if (checkError) {
            console.error('Error inserting check:', checkError);
            continue;
          }

          checksCreated++;

          // 3. Process payments
          if (check.payments && Array.isArray(check.payments)) {
            for (const payment of check.payments) {
              const paymentData = {
                snapshot_timestamp: snapshotTimestamp,
                payment_guid: payment.guid,
                check_guid: check.guid,
                order_guid: order.guid,
                amount: payment.amount || 0,
                tip_amount: payment.tipAmount || 0,
                amount_tendered: payment.amountTendered,
                type: payment.type,
                card_type: payment.cardType,
                last_4_digits: payment.last4Digits,
                external_payment_guid: payment.externalPaymentGuid,
                paid_date: payment.paidDate,
                paid_business_date: payment.paidBusinessDate,
                house: payment.house || false,
                refund_status: payment.refundStatus,
                voided: payment.voided || false,
                void_date: payment.voidDate,
                refund: payment.refund,
                mca_repayment_amount: payment.mcaRepaymentAmount,
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

  // Update last successful fetch
  await supabase
    .from('api_credentials')
    .update({
      last_successful_fetch: new Date().toISOString(),
      last_error: null,
    })
    .eq('service', 'toast');

  return {
    ordersProcessed,
    checksCreated,
    paymentsCreated,
    dateRange: { start: startDate, end: endDate },
  };
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

  try {
    const { startDate, endDate } = req.body;

    // Default to last 24 hours if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const result = await syncToastData(start.toISOString(), end.toISOString());

    res.status(200).json({
      success: true,
      message: 'Toast data synced successfully',
      ...result,
    });
  } catch (error) {
    console.error('Sync error:', error);

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
    });
  }
};

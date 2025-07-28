const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID;
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET;
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID;

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const diagnosis = {
    toastApi: {},
    supabaseDb: {},
    syncAttempt: {},
  };

  try {
    // 1. TEST TOAST API
    console.log('Testing Toast API...');
    const token = await getToastToken();
    diagnosis.toastApi.authSuccess = true;

    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };

    // Get just 1 order
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const toastResponse = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
      headers,
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pageSize: 1,
      },
    });

    const orders = toastResponse.data || [];
    diagnosis.toastApi.orderCount = orders.length;

    if (orders.length > 0) {
      const order = orders[0];
      diagnosis.toastApi.firstOrder = {
        guid: order.guid,
        displayNumber: order.displayNumber,
        createdDate: order.createdDate,
        hasChecks: !!order.checks,
        checksCount: order.checks?.length || 0,
        topLevelKeys: Object.keys(order),
      };

      // Show structure of nested data
      if (order.checks && order.checks.length > 0) {
        const check = order.checks[0];
        diagnosis.toastApi.firstCheck = {
          guid: check.guid,
          totalAmount: check.totalAmount,
          amount: check.amount,
          hasPayments: !!check.payments,
          paymentsCount: check.payments?.length || 0,
          checkKeys: Object.keys(check),
        };
      }
    }

    // 2. TEST SUPABASE CONNECTION
    console.log('Testing Supabase connection...');

    // Check existing toast_orders
    const { data: existingOrders, error: queryError } = await supabase
      .from('toast_orders')
      .select('order_guid, created_date')
      .limit(5)
      .order('created_date', { ascending: false });

    diagnosis.supabaseDb.querySuccess = !queryError;
    diagnosis.supabaseDb.queryError = queryError?.message || null;
    diagnosis.supabaseDb.existingOrderCount = existingOrders?.length || 0;

    // 3. ATTEMPT TO INSERT ONE ORDER
    if (orders.length > 0) {
      console.log('Attempting to insert one order...');
      const order = orders[0];
      const snapshotTimestamp = new Date().toISOString();

      // Try to insert just the order (no checks/payments)
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

      diagnosis.syncAttempt.orderData = {
        ...orderData,
        raw_data: '[truncated]', // Don't send full raw data in response
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('toast_orders')
        .upsert(orderData, { onConflict: 'order_guid,snapshot_timestamp' })
        .select();

      diagnosis.syncAttempt.insertSuccess = !insertError;
      diagnosis.syncAttempt.insertError = insertError?.message || null;
      diagnosis.syncAttempt.insertedData = insertResult?.[0] || null;

      // If order insert succeeded, try check
      if (!insertError && order.checks?.length > 0) {
        const check = order.checks[0];
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

        diagnosis.syncAttempt.checkInsertSuccess = !checkError;
        diagnosis.syncAttempt.checkInsertError = checkError?.message || null;
      }
    }

    // 4. CHECK COLUMN MISMATCH
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
      table_name: 'toast_orders',
    });

    if (!columnsError && columns) {
      diagnosis.supabaseDb.tableColumns = columns.map((col) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable,
      }));
    }

    res.status(200).json({
      success: true,
      diagnosis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      diagnosis,
    });
  }
};

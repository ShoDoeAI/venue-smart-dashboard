const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getToastToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };

    // Get recent orders
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
      headers,
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pageSize: 10,
        page: 1,
      },
    });

    const orders = response.data || [];

    // Analyze order structure
    const analysis = {
      totalOrders: orders.length,
      ordersWithChecks: 0,
      ordersWithPayments: 0,
      totalChecks: 0,
      totalPayments: 0,
      totalRevenue: 0,
      orderDetails: [],
    };

    orders.forEach((order, index) => {
      const hasChecks = order.checks && order.checks.length > 0;
      const checkCount = order.checks ? order.checks.length : 0;
      let paymentCount = 0;
      let orderRevenue = 0;

      if (hasChecks) {
        analysis.ordersWithChecks++;
        analysis.totalChecks += checkCount;

        order.checks.forEach((check) => {
          if (check.payments && check.payments.length > 0) {
            paymentCount += check.payments.length;
            analysis.totalPayments += check.payments.length;
          }
          if (check.totalAmount) {
            orderRevenue += check.totalAmount;
            analysis.totalRevenue += check.totalAmount;
          }
        });
      }

      if (paymentCount > 0) {
        analysis.ordersWithPayments++;
      }

      // Add details for first 5 orders
      if (index < 5) {
        analysis.orderDetails.push({
          orderGuid: order.guid,
          displayNumber: order.displayNumber,
          paidDate: order.paidDate,
          hasChecks,
          checkCount,
          paymentCount,
          revenue: orderRevenue,
          checkData: hasChecks
            ? order.checks.map((c) => ({
                checkGuid: c.guid,
                totalAmount: c.totalAmount,
                amount: c.amount,
                taxAmount: c.taxAmount,
                paymentCount: c.payments ? c.payments.length : 0,
                payments: c.payments
                  ? c.payments.map((p) => ({
                      type: p.type,
                      amount: p.amount,
                      tipAmount: p.tipAmount,
                    }))
                  : [],
              }))
            : [],
        });
      }
    });

    // Also check what's in the database
    const { count: dbOrderCount } = await supabase
      .from('toast_orders')
      .select('*', { count: 'exact', head: true });

    const { count: dbCheckCount } = await supabase
      .from('toast_checks')
      .select('*', { count: 'exact', head: true });

    const { count: dbPaymentCount } = await supabase
      .from('toast_payments')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      apiAnalysis: analysis,
      databaseCounts: {
        orders: dbOrderCount,
        checks: dbCheckCount,
        payments: dbPaymentCount,
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

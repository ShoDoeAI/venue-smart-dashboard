const axios = require('axios');

module.exports = async (req, res) => {
  try {
    // Toast credentials
    const clientId = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
    const clientSecret =
      process.env.TOAST_CLIENT_SECRET ||
      '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
    const locationId = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

    // Authenticate with Toast
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      { clientId, clientSecret, userAccessType: 'TOAST_MACHINE_CLIENT' },
    );
    const token = authResponse.data.token.accessToken;

    // Fetch today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersResponse = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
      params: {
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
        pageSize: 5, // Just get 5 orders for analysis
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'Toast-Restaurant-External-ID': locationId,
      },
    });

    const orders = ordersResponse.data || [];

    // Analyze the structure
    const analysis = {
      orderCount: orders.length,
      firstOrder: orders[0] || null,
      secondOrder: orders[1] || null,
      fieldMapping: null,
      simpleTransactionExample: null,
    };

    if (orders.length > 0) {
      const firstOrder = orders[0];
      const firstCheck = firstOrder.checks?.[0];

      // Show field mapping
      analysis.fieldMapping = {
        'order.guid': firstOrder.guid,
        'order.createdDate': firstOrder.createdDate,
        'order.paidDate': firstOrder.paidDate,
        'order.businessDate': firstOrder.businessDate,
        'order.voided': firstOrder.voided,
        'order.checks': firstOrder.checks?.length || 0,
        'check.guid': firstCheck?.guid,
        'check.totalAmount': firstCheck?.totalAmount,
        'check.customer': firstCheck?.customer,
        'check.selections': firstCheck?.selections?.length || 0,
        'check.displayNumber': firstCheck?.displayNumber,
      };

      // Show what we would insert into simple_transactions
      analysis.simpleTransactionExample = {
        source: 'toast',
        transaction_id: firstCheck?.guid || 'missing',
        transaction_date: firstOrder.paidDate || firstOrder.createdDate,
        amount: (firstCheck?.totalAmount || 0) / 100, // Convert cents to dollars
        customer_name: firstCheck?.customer
          ? `${firstCheck.customer.firstName || ''} ${firstCheck.customer.lastName || ''}`.trim()
          : null,
        customer_email: firstCheck?.customer?.email || null,
        items: firstCheck?.selections?.length || 0,
        status: firstOrder.voided ? 'voided' : 'completed',
        raw_data: {
          orderId: firstOrder.guid,
          orderNumber: firstOrder.displayNumber,
          checkNumber: firstCheck?.displayNumber,
          businessDate: firstOrder.businessDate,
        },
      };
    }

    return res.status(200).json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching Toast data:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.response?.data || 'No additional details',
    });
  }
};

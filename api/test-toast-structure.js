const axios = require('axios');

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

  try {
    const token = await getToastToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };

    // Get recent orders
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Just last 7 days

    const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
      headers,
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pageSize: 5, // Just 5 orders
      },
    });

    const orders = response.data || [];

    // Analyze the structure
    const analysis = {
      totalOrders: orders.length,
      firstOrder: orders[0]
        ? {
            hasGuid: !!orders[0].guid,
            guid: orders[0].guid,
            hasDisplayNumber: !!orders[0].displayNumber,
            displayNumber: orders[0].displayNumber,
            hasCreatedDate: !!orders[0].createdDate,
            createdDate: orders[0].createdDate,
            hasChecks: !!orders[0].checks,
            checksLength: orders[0].checks?.length || 0,
            hasServer: !!orders[0].server,
            serverInfo: orders[0].server
              ? {
                  hasGuid: !!orders[0].server.guid,
                  hasFirstName: !!orders[0].server.firstName,
                  hasLastName: !!orders[0].server.lastName,
                }
              : null,
            topLevelKeys: Object.keys(orders[0]),
          }
        : null,
      // Show raw structure of first order (limited)
      rawFirstOrder: orders[0] ? JSON.stringify(orders[0]).substring(0, 1000) + '...' : null,
    };

    res.status(200).json({
      success: true,
      analysis,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
};

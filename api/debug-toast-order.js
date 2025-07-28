const axios = require('axios');

// Toast credentials from environment variables
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

    // Get just 1 order to debug
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
      headers,
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pageSize: 1,
        page: 1,
      },
    });

    const order = response.data?.[0];

    res.status(200).json({
      success: true,
      orderFound: !!order,
      order: order
        ? {
            guid: order.guid,
            displayNumber: order.displayNumber,
            createdDate: order.createdDate,
            hasChecks: !!order.checks,
            checkCount: order.checks?.length || 0,
            firstCheck: order.checks?.[0]
              ? {
                  guid: order.checks[0].guid,
                  amount: order.checks[0].amount,
                  totalAmount: order.checks[0].totalAmount,
                  hasPayments: !!order.checks[0].payments,
                  paymentCount: order.checks[0].payments?.length || 0,
                }
              : null,
            // Show full structure of first order
            fullStructure: order,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

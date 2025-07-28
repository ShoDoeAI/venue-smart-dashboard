const axios = require('axios');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getToastToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };

    // Get 1 order from bulk endpoint
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const bulkResponse = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
      headers,
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pageSize: 1,
        page: 1,
      },
    });

    const bulkOrder = bulkResponse.data?.[0];

    // If we got an order, also fetch it individually to compare
    let individualOrder = null;
    if (bulkOrder?.guid) {
      try {
        const individualResponse = await axios.get(
          `https://ws-api.toasttab.com/orders/v2/orders/${bulkOrder.guid}`,
          { headers },
        );
        individualOrder = individualResponse.data;
      } catch (err) {
        console.error('Failed to fetch individual order:', err.message);
      }
    }

    // Analyze the data structure
    const analysis = {
      bulkEndpoint: {
        hasOrder: !!bulkOrder,
        orderGuid: bulkOrder?.guid,
        hasChecks: !!bulkOrder?.checks,
        checksCount: bulkOrder?.checks?.length || 0,
        firstCheck: bulkOrder?.checks?.[0]
          ? {
              hasPayments: !!bulkOrder.checks[0].payments,
              paymentsCount: bulkOrder.checks[0].payments?.length || 0,
              totalAmount: bulkOrder.checks[0].totalAmount,
              amount: bulkOrder.checks[0].amount,
              taxAmount: bulkOrder.checks[0].taxAmount,
            }
          : null,
      },
      individualEndpoint: individualOrder
        ? {
            hasOrder: true,
            orderGuid: individualOrder.guid,
            hasChecks: !!individualOrder.checks,
            checksCount: individualOrder.checks?.length || 0,
            firstCheck: individualOrder.checks?.[0]
              ? {
                  hasPayments: !!individualOrder.checks[0].payments,
                  paymentsCount: individualOrder.checks[0].payments?.length || 0,
                  totalAmount: individualOrder.checks[0].totalAmount,
                  amount: individualOrder.checks[0].amount,
                  taxAmount: individualOrder.checks[0].taxAmount,
                }
              : null,
          }
        : null,
      comparison: {
        sameStructure: JSON.stringify(bulkOrder) === JSON.stringify(individualOrder),
        bulkHasFullData: bulkOrder?.checks?.[0]?.payments?.length > 0,
      },
    };

    return res.status(200).json({
      success: true,
      analysis,
      sampleBulkOrder: bulkOrder,
      sampleIndividualOrder: individualOrder,
    });
  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

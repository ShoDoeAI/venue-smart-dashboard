import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const clientId = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
    const clientSecret = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
    const locationId = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

    // Step 1: Authenticate
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId,
        clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );

    const token = authResponse.data.token.accessToken;

    // Step 2: Fetch today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk`,
      {
        params: {
          startDate: today.toISOString(),
          endDate: new Date().toISOString(),
          pageSize: 100
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': locationId
        }
      }
    );

    const orders = ordersResponse.data || [];
    let totalRevenue = 0;
    let transactionCount = 0;

    orders.forEach((order: any) => {
      if (order.checks) {
        order.checks.forEach((check: any) => {
          totalRevenue += (check.totalAmount || 0) / 100;
          transactionCount++;
        });
      }
    });

    return res.status(200).json({
      success: true,
      stats: {
        orderCount: orders.length,
        transactionCount,
        totalRevenue: totalRevenue.toFixed(2),
        averageCheck: transactionCount > 0 ? (totalRevenue / transactionCount).toFixed(2) : '0.00'
      },
      sampleOrder: orders[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Toast test error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      timestamp: new Date().toISOString()
    });
  }
}
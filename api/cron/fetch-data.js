const axios = require('axios');

// Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

module.exports = async (req, res) => {
  console.log('Cron job: Fetching data from APIs...');
  
  try {
    // Authenticate with Toast
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    
    // Fetch today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}&pageSize=1000`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
        }
      }
    );
    
    const orders = ordersResponse.data || [];
    let totalRevenue = 0;
    
    orders.forEach(order => {
      if (order.checks) {
        order.checks.forEach(check => {
          totalRevenue += (check.totalAmount || 0) / 100;
        });
      }
    });
    
    console.log(`Fetched ${orders.length} orders, total revenue: $${totalRevenue.toFixed(2)}`);
    
    // Store in database (simplified for now)
    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: {
        orders: orders.length,
        revenue: totalRevenue,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Cron error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
const axios = require('axios');

const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const debug = {
    env: {
      hasClientId: !!process.env.TOAST_CLIENT_ID,
      hasClientSecret: !!process.env.TOAST_CLIENT_SECRET,
      hasLocationId: !!process.env.TOAST_LOCATION_ID,
      clientIdLength: TOAST_CLIENT_ID?.length,
      locationId: TOAST_LOCATION_ID
    },
    authAttempt: null,
    ordersAttempt: null
  };
  
  try {
    // Try authentication
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );
    
    debug.authAttempt = {
      success: true,
      hasToken: !!authResponse.data?.token?.accessToken,
      tokenLength: authResponse.data?.token?.accessToken?.length
    };
    
    const token = authResponse.data.token.accessToken;
    
    // Try to fetch orders
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endDate = now.toISOString();
    const startDate = startOfDay.toISOString();
    
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
        }
      }
    );
    
    debug.ordersAttempt = {
      success: true,
      ordersCount: ordersResponse.data?.length || 0,
      status: ordersResponse.status
    };
    
  } catch (error) {
    if (error.response?.status === 401) {
      debug.authAttempt = {
        success: false,
        error: 'Authentication failed',
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.response) {
      debug[error.config?.url?.includes('authentication') ? 'authAttempt' : 'ordersAttempt'] = {
        success: false,
        error: error.message,
        status: error.response.status,
        data: error.response.data
      };
    } else {
      debug.error = error.message;
    }
  }
  
  res.status(200).json(debug);
};
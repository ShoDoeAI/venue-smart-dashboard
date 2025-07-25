// Status endpoint to verify deployment and environment
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    deployment: 'v2',
    
    // Check which environment variables are present (not the values)
    environment: {
      hasToastClientId: !!process.env.TOAST_CLIENT_ID,
      hasToastClientSecret: !!process.env.TOAST_CLIENT_SECRET,
      hasToastLocationId: !!process.env.TOAST_LOCATION_ID,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      
      // Show if we're using defaults (env vars not set)
      usingDefaults: !process.env.TOAST_CLIENT_ID
    },
    
    // Test Toast authentication
    toastTest: 'pending'
  };
  
  // Try Toast auth if we have axios
  try {
    const axios = require('axios');
    const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
    const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
    
    try {
      const response = await axios.post(
        'https://ws-api.toasttab.com/authentication/v1/authentication/login',
        {
          clientId: TOAST_CLIENT_ID,
          clientSecret: TOAST_CLIENT_SECRET,
          userAccessType: 'TOAST_MACHINE_CLIENT'
        }
      );
      
      status.toastTest = {
        success: true,
        hasToken: !!response.data?.token?.accessToken
      };
    } catch (error) {
      status.toastTest = {
        success: false,
        error: error.response?.status || error.message
      };
    }
  } catch (e) {
    status.toastTest = {
      success: false,
      error: 'axios not available'
    };
  }
  
  res.status(200).json(status);
};
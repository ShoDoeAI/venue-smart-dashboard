module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  let axios;
  try {
    axios = require('axios');
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load axios', message: e.message });
  }
  
  const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
  const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
  
  try {
    // Try Toast authentication
    const response = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );
    
    res.status(200).json({
      success: true,
      hasToken: !!response.data?.token?.accessToken,
      tokenLength: response.data?.token?.accessToken?.length || 0,
      usingEnvVars: !!process.env.TOAST_CLIENT_ID
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      usingEnvVars: !!process.env.TOAST_CLIENT_ID,
      clientIdLength: TOAST_CLIENT_ID?.length
    });
  }
};
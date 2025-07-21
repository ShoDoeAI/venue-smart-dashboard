// Simple health check endpoint
module.exports = async (req, res) => {
  // Test basic functionality
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    
    // Check if we can load modules
    modules: {
      axios: false,
      supabase: false
    },
    
    // Check environment
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      hasToastCreds: !!(process.env.TOAST_CLIENT_ID && process.env.TOAST_CLIENT_SECRET),
      hasSupabase: !!process.env.SUPABASE_URL
    },
    
    // Check working directory
    cwd: process.cwd(),
    dirname: __dirname
  };
  
  // Try to load axios
  try {
    const axios = require('axios');
    health.modules.axios = true;
    
    // If axios loads, try a simple request
    try {
      const response = await axios.get('https://api.github.com/zen');
      health.testRequest = {
        success: true,
        data: response.data
      };
    } catch (e) {
      health.testRequest = {
        success: false,
        error: e.message
      };
    }
  } catch (e) {
    health.axiosError = e.message;
  }
  
  // Try to load supabase
  try {
    require('@supabase/supabase-js');
    health.modules.supabase = true;
  } catch (e) {
    health.supabaseError = e.message;
  }
  
  res.status(200).json(health);
};
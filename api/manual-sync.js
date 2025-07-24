const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, service = 'all' } = req.body;
    
    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30); // Default to last 30 days
      return d;
    })();
    
    console.log(`Manual sync requested for ${service} from ${start.toISOString()} to ${end.toISOString()}`);
    
    const results = {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      services: {}
    };
    
    // Get base URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : req.headers.host 
      ? `${req.protocol || 'https'}://${req.headers.host}`
      : 'https://venue-smart-dashboard.vercel.app';
    
    // Sync Toast data
    if (service === 'all' || service === 'toast') {
      try {
        const toastResponse = await axios.post(
          `${baseUrl}/api/sync-toast-to-supabase`,
          {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          }
        );
        
        results.services.toast = {
          success: true,
          ...toastResponse.data
        };
      } catch (error) {
        console.error('Toast sync error:', error.message);
        results.services.toast = {
          success: false,
          error: error.message
        };
      }
    }
    
    // Run the general cron sync to update KPIs
    try {
      await axios.get(`${baseUrl}/api/cron/sync-all-data`);
      results.kpisUpdated = true;
    } catch (error) {
      console.error('KPI update error:', error.message);
      results.kpisUpdated = false;
    }
    
    res.status(200).json({
      success: true,
      message: 'Manual sync completed',
      ...results
    });
    
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
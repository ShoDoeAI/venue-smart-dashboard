module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const envCheck = {
    hasToastClientId: !!process.env.TOAST_CLIENT_ID,
    hasToastClientSecret: !!process.env.TOAST_CLIENT_SECRET,
    hasToastLocationId: !!process.env.TOAST_LOCATION_ID,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    
    // Check if using defaults (which means env vars aren't loaded)
    usingDefaults: {
      clientId: process.env.TOAST_CLIENT_ID === undefined,
      locationId: process.env.TOAST_LOCATION_ID === undefined
    },
    
    // Get first few chars to verify (safely)
    clientIdPrefix: process.env.TOAST_CLIENT_ID ? process.env.TOAST_CLIENT_ID.substring(0, 6) + '...' : 'NOT SET',
    locationIdPrefix: process.env.TOAST_LOCATION_ID ? process.env.TOAST_LOCATION_ID.substring(0, 8) + '...' : 'NOT SET',
    
    nodeVersion: process.version,
    vercelRegion: process.env.VERCEL_REGION || 'unknown'
  };
  
  res.status(200).json(envCheck);
};
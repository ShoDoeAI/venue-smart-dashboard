module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const envCheck = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Missing',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    timestamp: new Date().toISOString(),
  };

  console.log('Environment check:', envCheck);

  res.status(200).json({
    success: true,
    environment: envCheck,
    chatEndpointReady:
      envCheck.ANTHROPIC_API_KEY === 'Set' &&
      envCheck.SUPABASE_URL === 'Set' &&
      envCheck.SUPABASE_SERVICE_KEY === 'Set',
  });
};

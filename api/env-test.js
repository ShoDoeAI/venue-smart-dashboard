module.exports = (req, res) => {
  // Direct test of environment variables
  const result = {
    timestamp: new Date().toISOString(),
    env: {
      // Check if ANY environment variables are set
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL: process.env.VERCEL || 'not set',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set',

      // Check our specific variables (just existence, not values)
      TOAST_CLIENT_ID: process.env.TOAST_CLIENT_ID ? 'SET' : 'NOT SET',
      TOAST_CLIENT_SECRET: process.env.TOAST_CLIENT_SECRET ? 'SET' : 'NOT SET',
      TOAST_LOCATION_ID: process.env.TOAST_LOCATION_ID ? 'SET' : 'NOT SET',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET',
    },

    // Show if we're using defaults
    usingDefaults: !process.env.TOAST_CLIENT_ID,
  };

  res.status(200).json(result);
};

module.exports = async (req, res) => {
  try {
    // Log environment info
    const debug = {
      method: req.method,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      anthropicKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
      nodeVersion: process.version,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString(),
    };

    console.log('Chat debug:', JSON.stringify(debug, null, 2));

    // Try to load the SDK
    let sdkLoaded = false;
    let sdkError = null;

    try {
      const Anthropic = require('@anthropic-ai/sdk');
      sdkLoaded = true;
    } catch (e) {
      sdkError = e.message;
    }

    return res.status(200).json({
      success: true,
      debug: {
        ...debug,
        sdkLoaded,
        sdkError,
        envVars: {
          hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
          hasToastClientId: !!process.env.TOAST_CLIENT_ID,
          hasToastSecret: !!process.env.TOAST_CLIENT_SECRET,
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
};

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  console.log('[CRON] fetch-data-simple called');
  
  // Check auth
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get Toast credentials
    const { data: creds, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('service', 'toast')
      .single();

    if (credError || !creds) {
      console.error('[CRON] No Toast credentials found');
      return res.status(200).json({ 
        error: 'No Toast credentials', 
        details: credError 
      });
    }

    console.log('[CRON] Found Toast credentials:', {
      service: creds.service,
      environment: creds.credentials?.environment,
      hasClientId: !!creds.credentials?.clientId
    });

    // Update last_successful_fetch to prove it's working
    const { error: updateError } = await supabase
      .from('api_credentials')
      .update({ 
        last_successful_fetch: new Date().toISOString(),
        last_error: null 
      })
      .eq('service', 'toast');

    if (updateError) {
      console.error('[CRON] Failed to update timestamp:', updateError);
    }

    return res.status(200).json({
      success: true,
      message: 'Cron job is working! Check last_successful_fetch in database.',
      credentials: {
        found: true,
        environment: creds.credentials?.environment
      }
    });

  } catch (error) {
    console.error('[CRON] Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
};
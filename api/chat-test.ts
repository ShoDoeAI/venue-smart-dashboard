import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Simple test endpoint to verify API is working
  console.log('Chat test endpoint called');
  console.log('Environment check:', {
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    nodeEnv: process.env.NODE_ENV
  });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { message } = req.body;
  
  // Check if we have the required API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY not configured',
      message: 'The Claude API key is not set in the environment variables. Please add it in Vercel dashboard.',
      debug: {
        hasKey: false,
        suggestion: 'Go to Vercel Dashboard > Settings > Environment Variables and add ANTHROPIC_API_KEY'
      }
    });
  }
  
  return res.status(200).json({
    success: true,
    receivedMessage: message,
    timestamp: new Date().toISOString(),
    environment: {
      hasAnthropicKey: true,
      keyPrefix: process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...'
    }
  });
}
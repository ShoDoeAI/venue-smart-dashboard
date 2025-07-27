import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ClaudeAI } from '../packages/backend/src/services/claude-ai';
import { AIContextAggregator } from '../packages/backend/src/services/ai-context-aggregator';
import type { Database } from '@venuesync/shared';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const debugInfo: any = {
    step: 'start',
    errors: []
  };

  try {
    debugInfo.step = 'parsing_body';
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    debugInfo.step = 'creating_supabase_client';
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    debugInfo.step = 'initializing_services';
    const contextAggregator = new AIContextAggregator(supabase);
    const aiService = new ClaudeAI(
      supabase,
      process.env.ANTHROPIC_API_KEY!
    );

    const venueId = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
    debugInfo.venueId = venueId;

    debugInfo.step = 'building_context';
    const context = await contextAggregator.buildContext(venueId);
    debugInfo.contextBuilt = true;
    debugInfo.contextVenue = context.venue;

    debugInfo.step = 'querying_claude';
    const response = await aiService.query({
      message,
      context,
      conversationId
    });
    debugInfo.responseReceived = true;

    return res.status(200).json({
      success: true,
      response: response.message,
      debug: debugInfo
    });
  } catch (error) {
    debugInfo.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    debugInfo.errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Chat API debug error:', {
      ...debugInfo,
      error
    });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      debug: debugInfo
    });
  }
}
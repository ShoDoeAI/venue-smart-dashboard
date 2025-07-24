import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ClaudeAI } from '../src/services/claude-ai';
import { AIContextAggregator } from '../src/services/ai-context-aggregator';
import type { Database } from '@venuesync/shared';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Initialize services
    const contextAggregator = new AIContextAggregator(supabase);
    const aiService = new ClaudeAI(
      supabase,
      process.env.ANTHROPIC_API_KEY!
    );

    // Get venue ID from query params or use Jack's on Water Street
    const venueId = req.query?.venueId as string || req.body?.venueId || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

    // Generate context
    const context = await contextAggregator.buildContext(venueId);

    // Send message to Claude
    const response = await aiService.query({
      message,
      context,
      conversationId
    });

    return res.status(200).json({
      success: true,
      response: response.message,
      conversationId: conversationId || 'default',
      messageId: Date.now().toString(),
      actions: response.suggestedActions || []
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
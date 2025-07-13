import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ClaudeAI } from '../../src/services/claude-ai';
import { AIContextAggregator } from '../../src/services/ai-context-aggregator';
import type { Database } from '@venuesync/shared/types/database.generated';

/**
 * AI Query endpoint
 * POST /api/ai/query
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { venueId, message, conversationId, contextOverride } = req.body;

    if (!venueId || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: venueId and message' 
      });
    }

    // Initialize services
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const claudeAI = new ClaudeAI(supabase);
    const contextAggregator = new AIContextAggregator(supabase);

    // Build context
    const context = contextOverride || await contextAggregator.buildContext(venueId);

    // Query Claude
    const response = await claudeAI.query({
      message,
      context,
      conversationId,
      maxTokens: 2048,
    });

    return res.status(200).json({
      success: true,
      response,
      context: {
        venue: context.venue,
        alertCount: context.activeAlerts.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('AI query error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'AI query failed',
    });
  }
}
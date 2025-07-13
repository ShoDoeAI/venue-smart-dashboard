import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ClaudeAI } from '../../src/services/claude-ai';
import { AIContextAggregator } from '../../src/services/ai-context-aggregator';
import { AIPromptTemplates } from '../../src/services/ai-prompt-templates';
import type { Database } from '@venuesync/shared/types/database.generated';

/**
 * AI Analysis endpoint - uses predefined templates
 * POST /api/ai/analyze
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { venueId, templateId, parameters, timeRange } = req.body;

    if (!venueId || !templateId) {
      return res.status(400).json({ 
        error: 'Missing required fields: venueId and templateId' 
      });
    }

    // Initialize services
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const claudeAI = new ClaudeAI(supabase);
    const contextAggregator = new AIContextAggregator(supabase);
    const promptTemplates = new AIPromptTemplates();

    // Get template
    const template = promptTemplates.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Build context
    let context;
    if (timeRange) {
      context = await contextAggregator.getTimeRangeContext(
        venueId,
        new Date(timeRange.start),
        new Date(timeRange.end)
      );
    } else {
      context = await contextAggregator.buildContext(venueId);
    }

    // Validate context
    if (!promptTemplates.validateContext(templateId, context)) {
      return res.status(400).json({ 
        error: 'Insufficient context for this template' 
      });
    }

    // Generate prompt from template
    const prompt = promptTemplates.generatePrompt(
      templateId,
      context as any,
      parameters
    );

    // Query Claude
    const response = await claudeAI.query({
      message: prompt,
      context: context as any,
      maxTokens: 3000,
    });

    return res.status(200).json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
      },
      response,
      context: {
        venue: context.venue,
        alertCount: context.activeAlerts?.length || 0,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'AI analysis failed',
    });
  }
}
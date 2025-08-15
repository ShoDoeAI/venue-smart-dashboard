import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { AIContextAggregator } from '../../src/services/ai-context-aggregator';
import { AIPromptTemplates } from '../../src/services/ai-prompt-templates';


/**
 * AI Templates endpoint
 * GET /api/ai/templates - List available templates
 * GET /api/ai/templates/suggestions - Get template suggestions based on context
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const promptTemplates = new AIPromptTemplates();

    if (req.query.suggestions === 'true') {
      // Get template suggestions based on venue context
      const { venueId } = req.query;
      if (!venueId) {
        return res.status(400).json({ error: 'venueId required for suggestions' });
      }

      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      const contextAggregator = new AIContextAggregator(supabase);
      const context = await contextAggregator.buildContext(venueId as string);
      
      const suggestions = promptTemplates.suggestTemplates(context);

      return res.status(200).json({
        success: true,
        suggestions,
        reason: {
          hasAlerts: context.activeAlerts.length > 0,
          revenueDown: context.historicalTrends.revenueGrowth < 0,
          customerDown: context.historicalTrends.customerGrowth < 0,
          activeEvents: context.currentMetrics.activeEvents > 0,
        },
      });
    }

    // Get templates by category
    const { category } = req.query;
    let templates;

    if (category) {
      templates = promptTemplates.getTemplatesByCategory(category as any);
    } else {
      // Get all templates
      templates = [
        ...promptTemplates.getTemplatesByCategory('analysis'),
        ...promptTemplates.getTemplatesByCategory('recommendation'),
        ...promptTemplates.getTemplatesByCategory('forecast'),
        ...promptTemplates.getTemplatesByCategory('diagnostic'),
      ];
    }

    return res.status(200).json({
      success: true,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        parameters: t.parameters,
      })),
    });

  } catch (error) {
    console.error('Templates error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get templates',
    });
  }
}
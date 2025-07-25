"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const ai_prompt_templates_1 = require("../../src/services/ai-prompt-templates");
const ai_context_aggregator_1 = require("../../src/services/ai-context-aggregator");
/**
 * AI Templates endpoint
 * GET /api/ai/templates - List available templates
 * GET /api/ai/templates/suggestions - Get template suggestions based on context
 */
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const promptTemplates = new ai_prompt_templates_1.AIPromptTemplates();
        if (req.query.suggestions === 'true') {
            // Get template suggestions based on venue context
            const { venueId } = req.query;
            if (!venueId) {
                return res.status(400).json({ error: 'venueId required for suggestions' });
            }
            const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            const contextAggregator = new ai_context_aggregator_1.AIContextAggregator(supabase);
            const context = await contextAggregator.buildContext(venueId);
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
            templates = promptTemplates.getTemplatesByCategory(category);
        }
        else {
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
    }
    catch (error) {
        console.error('Templates error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get templates',
        });
    }
}
//# sourceMappingURL=templates.js.map
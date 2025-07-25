"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const claude_ai_1 = require("../../src/services/claude-ai");
const ai_context_aggregator_1 = require("../../src/services/ai-context-aggregator");
const ai_prompt_templates_1 = require("../../src/services/ai-prompt-templates");
/**
 * AI Analysis endpoint - uses predefined templates
 * POST /api/ai/analyze
 */
async function handler(req, res) {
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
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const claudeAI = new claude_ai_1.ClaudeAI(supabase);
        const contextAggregator = new ai_context_aggregator_1.AIContextAggregator(supabase);
        const promptTemplates = new ai_prompt_templates_1.AIPromptTemplates();
        // Get template
        const template = promptTemplates.getTemplate(templateId);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        // Build context
        let context;
        if (timeRange) {
            context = await contextAggregator.getTimeRangeContext(venueId, new Date(timeRange.start), new Date(timeRange.end));
        }
        else {
            context = await contextAggregator.buildContext(venueId);
        }
        // Validate context
        if (!promptTemplates.validateContext(templateId, context)) {
            return res.status(400).json({
                error: 'Insufficient context for this template'
            });
        }
        // Generate prompt from template
        const prompt = promptTemplates.generatePrompt(templateId, context, parameters);
        // Query Claude
        const response = await claudeAI.query({
            message: prompt,
            context: context,
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
    }
    catch (error) {
        console.error('AI analysis error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'AI analysis failed',
        });
    }
}
//# sourceMappingURL=analyze.js.map
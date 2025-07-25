"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const claude_ai_1 = require("../../src/services/claude-ai");
const ai_context_aggregator_1 = require("../../src/services/ai-context-aggregator");
/**
 * AI Query endpoint
 * POST /api/ai/query
 */
async function handler(req, res) {
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
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const claudeAI = new claude_ai_1.ClaudeAI(supabase);
        const contextAggregator = new ai_context_aggregator_1.AIContextAggregator(supabase);
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
    }
    catch (error) {
        console.error('AI query error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'AI query failed',
        });
    }
}
//# sourceMappingURL=query.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const claude_ai_1 = require("../src/services/claude-ai");
const ai_context_aggregator_1 = require("../src/services/ai-context-aggregator");
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { message, conversationId } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        // Initialize services
        const contextAggregator = new ai_context_aggregator_1.AIContextAggregator(supabase);
        const aiService = new claude_ai_1.ClaudeAI(supabase, process.env.ANTHROPIC_API_KEY);
        // Get venue ID from query params or use Jack's on Water Street
        const venueId = req.query?.venueId || req.body?.venueId || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
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
    }
    catch (error) {
        console.error('Chat API error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
//# sourceMappingURL=chat.js.map
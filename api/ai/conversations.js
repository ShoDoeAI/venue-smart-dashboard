"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const claude_ai_1 = require("../../src/services/claude-ai");
/**
 * AI Conversations endpoint
 * GET /api/ai/conversations - List conversations
 * POST /api/ai/conversations - Create new conversation
 * GET /api/ai/conversations/:id - Get conversation messages
 */
async function handler(req, res) {
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const claudeAI = new claude_ai_1.ClaudeAI(supabase);
    try {
        switch (req.method) {
            case 'GET': {
                if (req.query.id) {
                    // Get specific conversation messages
                    const { data, error } = await supabase
                        .from('ai_messages')
                        .select('*')
                        .eq('conversation_id', req.query.id)
                        .order('created_at', { ascending: true });
                    if (error) {
                        return res.status(500).json({ error: error.message });
                    }
                    return res.status(200).json({
                        success: true,
                        messages: data,
                    });
                }
                else {
                    // List conversations for venue
                    const { venueId } = req.query;
                    if (!venueId) {
                        return res.status(400).json({ error: 'venueId required' });
                    }
                    const { data, error } = await supabase
                        .from('ai_conversations')
                        .select('*')
                        .eq('venue_id', venueId)
                        .order('updated_at', { ascending: false })
                        .limit(50);
                    if (error) {
                        return res.status(500).json({ error: error.message });
                    }
                    return res.status(200).json({
                        success: true,
                        conversations: data,
                    });
                }
            }
            case 'POST': {
                // Create new conversation
                const { venueId, title } = req.body;
                if (!venueId) {
                    return res.status(400).json({ error: 'venueId required' });
                }
                const conversationId = await claudeAI.createConversation(venueId, title);
                return res.status(201).json({
                    success: true,
                    conversationId,
                });
            }
            case 'DELETE': {
                // Delete conversation
                const { id } = req.query;
                if (!id) {
                    return res.status(400).json({ error: 'Conversation ID required' });
                }
                // Delete messages first
                await supabase
                    .from('ai_messages')
                    .delete()
                    .eq('conversation_id', id);
                // Delete conversation
                const { error } = await supabase
                    .from('ai_conversations')
                    .delete()
                    .eq('id', id);
                if (error) {
                    return res.status(500).json({ error: error.message });
                }
                return res.status(200).json({
                    success: true,
                    message: 'Conversation deleted',
                });
            }
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('Conversation error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Operation failed',
        });
    }
}
//# sourceMappingURL=conversations.js.map
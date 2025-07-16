import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ClaudeAI } from '../../src/services/claude-ai';
import type { Database } from '@venuesync/shared';

/**
 * AI Conversations endpoint
 * GET /api/ai/conversations - List conversations
 * POST /api/ai/conversations - Create new conversation
 * GET /api/ai/conversations/:id - Get conversation messages
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const claudeAI = new ClaudeAI(supabase);

  try {
    switch (req.method) {
      case 'GET': {
        if (req.query.id) {
          // Get specific conversation messages
          const { data, error } = await supabase
            .from('ai_messages')
            .select('*')
            .eq('conversation_id', req.query.id as string)
            .order('created_at', { ascending: true });

          if (error) {
            return res.status(500).json({ error: error.message });
          }

          return res.status(200).json({
            success: true,
            messages: data,
          });
        } else {
          // List conversations for venue
          const { venueId } = req.query;
          if (!venueId) {
            return res.status(400).json({ error: 'venueId required' });
          }

          const { data, error } = await supabase
            .from('ai_conversations')
            .select('*')
            .eq('venue_id', venueId as string)
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
          .eq('conversation_id', id as string);

        // Delete conversation
        const { error } = await supabase
          .from('ai_conversations')
          .delete()
          .eq('id', id as string);

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
  } catch (error) {
    console.error('Conversation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Operation failed',
    });
  }
}
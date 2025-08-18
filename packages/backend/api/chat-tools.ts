import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ClaudeAI } from '../src/services/claude-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[CHAT-TOOLS] Request received:', { method: req.method, body: req.body });
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationId, venueId } = req.body as {
      message: unknown;
      conversationId?: string;
      venueId?: string;
    };

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Initialize Claude AI with tools
    const claudeAI = new ClaudeAI(supabase);

    // Determine venue ID if not provided
    let actualVenueId: string | undefined = venueId;
    if (!actualVenueId) {
      const { data: venues } = await supabase.from('venues').select('id').limit(1);
      if (venues && venues.length > 0) {
        actualVenueId = venues[0]?.id as string;
      }
    }

    // Create conversation if needed
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId = await claudeAI.createConversation(
        actualVenueId || 'default',
        `Chat: ${new Date().toLocaleDateString()}`
      );
    }

    console.log('[CHAT-TOOLS] Processing with tools:', {
      message: message.substring(0, 100),
      venueId: actualVenueId,
      conversationId: activeConversationId
    });

    // Process message with tools
    const response = await claudeAI.processMessageWithTools(
      message,
      actualVenueId,
      activeConversationId
    );

    console.log('[CHAT-TOOLS] Response received:', {
      hasMessage: !!response.message,
      messageLength: response.message?.length,
      hasActions: !!response.suggestedActions
    });

    // Format response for frontend
    const enhancedResponse = {
      success: true,
      response: response.message, // Frontend expects 'response' not 'message'
      messageId: `msg-${Date.now()}`,
      conversationId: activeConversationId,
      actions: response.suggestedActions,
      insights: response.insights,
      followUpQuestions: response.followUpQuestions,
      // Add metadata about tool usage
      metadata: {
        usedTools: true,
        queryType: 'revenue' // Could be detected from message
      }
    };

    return res.status(200).json(enhancedResponse);
  } catch (error) {
    console.error('Chat tools API error:', error);
    return res.status(500).json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
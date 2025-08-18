import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ClaudeAI } from '../src/services/claude-ai';
import { ClaudeRevenueTool } from '../src/services/claude-revenue-tool';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[CHAT-SIMPLE] Request received:', { method: req.method });
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    // Initialize services
    const claudeAI = new ClaudeAI(supabase);
    const revenueTool = new ClaudeRevenueTool(supabase);

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

    // Check if this is a revenue query
    const isRevenueQuery = /revenue|sales|money|earnings|income/.test(message.toLowerCase());
    let enhancedMessage = message;
    
    if (isRevenueQuery) {
      console.log('[CHAT-SIMPLE] Detected revenue query, fetching data...');
      
      // Use the revenue tool to fetch data
      const revenueResult = await revenueTool.queryRevenue({
        query: message,
        venueId: actualVenueId
      });
      
      console.log('[CHAT-SIMPLE] Revenue tool result:', {
        success: revenueResult.success,
        hasData: !!revenueResult.data,
        totalRevenue: revenueResult.data?.totalRevenue
      });
      
      if (revenueResult.success && revenueResult.data) {
        // Append the revenue data to the message
        enhancedMessage = `${message}

REVENUE DATA QUERY RESULT:
- Period: ${revenueResult.data.periodStart} to ${revenueResult.data.periodEnd}
- Total Revenue: $${revenueResult.data.totalRevenue.toFixed(2)}
- Query Interpretation: ${revenueResult.data.queryInterpretation}

Daily Breakdown:
${revenueResult.data.dailyBreakdown?.map(day => 
  `- ${day.date}: $${day.revenue.toFixed(2)} (${day.transactions} transactions)${day.hasOverride ? ' [verified]' : ''}`
).join('\n') || 'No daily data available'}

${revenueResult.data.insights?.join('\n') || ''}

Please use ONLY the revenue data provided above when answering the user's question.`;
      }
    }

    console.log('[CHAT-SIMPLE] Sending to Claude with enhanced message');

    // Process with Claude using the regular query method
    const response = await claudeAI.query({
      message: enhancedMessage,
      context: {
        venue: {
          id: actualVenueId || 'default',
          name: 'Water Street Music Hall',
          type: 'restaurant'
        },
        currentMetrics: {
          todayRevenue: 0,
          todayTransactions: 0,
          todayCustomers: 0,
          lastHourRevenue: 0,
          activeEvents: 0
        },
        historicalTrends: {
          revenueGrowth: 0,
          customerGrowth: 0,
          averageTicketPrice: 0,
          peakHours: []
        },
        activeAlerts: [],
        availableActions: []
      },
      conversationId: activeConversationId
    });

    console.log('[CHAT-SIMPLE] Claude response received');

    // Format response for frontend
    const enhancedResponse = {
      success: true,
      response: response.message,
      messageId: `msg-${Date.now()}`,
      conversationId: activeConversationId,
      actions: response.suggestedActions,
      insights: response.insights,
      followUpQuestions: response.followUpQuestions
    };

    return res.status(200).json(enhancedResponse);
  } catch (error) {
    console.error('Chat simple API error:', error);
    return res.status(500).json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
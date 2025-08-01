import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ClaudeAI } from '../src/services/claude-ai';
import { AIContextAggregator } from '../src/services/ai-context-aggregator';
import type { Database } from '@venuesync/shared';

// Date parsing utilities for natural language date queries
function parseDateQuery(message: string): { startDate?: Date; endDate?: Date; timeRange?: string } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Common date patterns
  const patterns = [
    // Specific dates
    { regex: /yesterday/i, handler: () => {
      const date = new Date(today);
      date.setDate(date.getDate() - 1);
      return { startDate: date, endDate: new Date(date.getTime() + 24 * 60 * 60 * 1000), timeRange: 'yesterday' };
    }},
    
    // Last week
    { regex: /last week/i, handler: () => {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      return { startDate, endDate: today, timeRange: 'last week' };
    }},
    
    // This week
    { regex: /this week/i, handler: () => {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Go to Sunday
      return { startDate, endDate: today, timeRange: 'this week' };
    }},
    
    // Last month
    { regex: /last month/i, handler: () => {
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate, endDate, timeRange: 'last month' };
    }},
    
    // This month
    { regex: /this month/i, handler: () => {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate, endDate: today, timeRange: 'this month' };
    }},
    
    // Last year
    { regex: /last year/i, handler: () => {
      const startDate = new Date(today.getFullYear() - 1, 0, 1);
      const endDate = new Date(today.getFullYear(), 0, 1);
      return { startDate, endDate, timeRange: 'last year' };
    }},
    
    // Specific date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
    { regex: /(\d{4}-\d{2}-\d{2})/i, handler: (match: RegExpMatchArray) => {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return { startDate: date, endDate: new Date(date.getTime() + 24 * 60 * 60 * 1000), timeRange: match[1] };
      }
      return null;
    }},
    
    // Last N days
    { regex: /last (\d+) days?/i, handler: (match: RegExpMatchArray) => {
      const days = parseInt(match[1]);
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days);
      return { startDate, endDate: today, timeRange: `last ${days} days` };
    }},
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      const result = pattern.handler(match);
      if (result) return result;
    }
  }

  return null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Initialize services
    const contextAggregator = new AIContextAggregator(supabase);
    const aiService = new ClaudeAI(
      supabase,
      process.env.ANTHROPIC_API_KEY!
    );

    // Get venue ID from query params or use Jack's on Water Street
    const venueId = req.query?.venueId as string || req.body?.venueId || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

    // Check if the message contains date/time queries
    const dateQuery = parseDateQuery(message);
    let context;

    if (dateQuery) {
      console.log(`[CHAT] Detected date query: ${dateQuery.timeRange}`);
      
      // Get historical context for the specified time range
      const historicalContext = await contextAggregator.getTimeRangeContext(
        venueId,
        dateQuery.startDate!,
        dateQuery.endDate!
      );

      // Combine with current context but emphasize historical data
      const currentContext = await contextAggregator.buildContext(venueId);
      context = {
        ...currentContext,
        ...historicalContext,
        isHistoricalQuery: true,
        queryTimeRange: dateQuery.timeRange,
        queryStartDate: dateQuery.startDate?.toISOString(),
        queryEndDate: dateQuery.endDate?.toISOString(),
      };
    } else {
      // Generate regular context for current data
      context = await contextAggregator.buildContext(venueId);
    }

    // Enhance the message with context about available historical data
    let enhancedMessage = message;
    if (dateQuery) {
      enhancedMessage = `${message}

HISTORICAL DATA CONTEXT:
- Query Period: ${dateQuery.timeRange} (${dateQuery.startDate?.toLocaleDateString()} to ${dateQuery.endDate?.toLocaleDateString()})
- You have access to 2 years of Toast POS transaction data
- You can analyze revenue patterns, customer behavior, and operational trends
- Please provide specific insights for the requested time period`;
    } else {
      enhancedMessage = `${message}

AVAILABLE DATA CONTEXT:
- You have access to 2 years of historical Toast POS data for trend analysis
- Current real-time data from Toast POS, Eventbrite, and OpenDate.io
- You can answer questions about specific dates, weeks, months, or periods
- Example queries: "What was last week's revenue?", "How did we do in December?", "Show me yesterday's performance"`;
    }

    // Send message to Claude
    const response = await aiService.query({
      message: enhancedMessage,
      context,
      conversationId
    });

    return res.status(200).json({
      success: true,
      response: response.message,
      conversationId: conversationId || 'default',
      messageId: Date.now().toString(),
      actions: response.suggestedActions || [],
      historicalQuery: !!dateQuery,
      timeRange: dateQuery?.timeRange,
      insights: response.insights || [],
      followUpQuestions: response.followUpQuestions || []
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
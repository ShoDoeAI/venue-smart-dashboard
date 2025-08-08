import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ClaudeAI } from '../src/services/claude-ai';
import { AIContextAggregator } from '../src/services/ai-context-aggregator';
import type { Database } from '@venuesync/shared';

// Query type detection
function detectQueryType(message: string): 'revenue' | 'menu' | 'customers' | 'labor' | 'general' {
  const lowercaseMessage = message.toLowerCase();
  
  // Revenue indicators
  if (/revenue|sales|money|earnings|income|profit|loss|drop|increase|decrease/.test(lowercaseMessage)) {
    return 'revenue';
  }
  
  // Menu/product indicators
  if (/menu|item|dish|drink|pour cost|food cost|best seller|popular|selling/.test(lowercaseMessage)) {
    return 'menu';
  }
  
  // Customer indicators
  if (/customer|guest|patron|loyalty|retention|new vs returning|visits/.test(lowercaseMessage)) {
    return 'customers';
  }
  
  // Labor indicators
  if (/labor|staff|employee|wage|payroll|overtime|scheduling/.test(lowercaseMessage)) {
    return 'labor';
  }
  
  return 'general';
}

// Enhanced date parsing utilities
function parseDateQuery(message: string): { startDate?: Date; endDate?: Date; timeRange?: string } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Common date patterns
  const patterns = [
    // Weekend patterns
    { regex: /last weekend/i, handler: () => {
      const dayOfWeek = now.getDay();
      const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
      const lastSunday = new Date(today);
      lastSunday.setDate(lastSunday.getDate() - daysToLastSunday);
      const lastFriday = new Date(lastSunday);
      lastFriday.setDate(lastFriday.getDate() - 2);
      return { startDate: lastFriday, endDate: lastSunday, timeRange: 'last weekend' };
    }},
    
    { regex: /this weekend/i, handler: () => {
      const dayOfWeek = now.getDay();
      let friday = new Date(today);
      let sunday = new Date(today);
      
      if (dayOfWeek === 0) { // Sunday
        friday.setDate(friday.getDate() - 2);
        sunday = new Date(today);
      } else if (dayOfWeek >= 5) { // Friday or Saturday
        friday.setDate(friday.getDate() - (dayOfWeek - 5));
        sunday.setDate(sunday.getDate() + (7 - dayOfWeek));
      } else { // Monday-Thursday
        friday.setDate(friday.getDate() + (5 - dayOfWeek));
        sunday.setDate(sunday.getDate() + (7 - dayOfWeek));
      }
      
      return { startDate: friday, endDate: sunday, timeRange: 'this weekend' };
    }},
    
    // Specific dates
    { regex: /yesterday/i, handler: () => {
      const date = new Date(today);
      date.setDate(date.getDate() - 1);
      return { startDate: date, endDate: new Date(date.getTime() + 24 * 60 * 60 * 1000), timeRange: 'yesterday' };
    }},
    
    { regex: /today/i, handler: () => {
      return { startDate: today, endDate: now, timeRange: 'today' };
    }},
    
    // Week patterns
    { regex: /last week/i, handler: () => {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7 - today.getDay());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      return { startDate, endDate, timeRange: 'last week' };
    }},
    
    { regex: /this week/i, handler: () => {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      return { startDate, endDate: today, timeRange: 'this week' };
    }},
    
    // Month patterns
    { regex: /last month/i, handler: () => {
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1, 1);
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth(), 0);
      return { startDate, endDate, timeRange: 'last month' };
    }},
    
    { regex: /this month/i, handler: () => {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate, endDate: today, timeRange: 'this month' };
    }},
    
    // Specific month names
    { regex: /(january|february|march|april|may|june|july|august|september|october|november|december)/i, handler: (match: RegExpMatchArray) => {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.indexOf(match[1].toLowerCase());
      const year = monthIndex <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1;
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0);
      return { startDate, endDate, timeRange: `${match[1]} ${year}` };
    }},
    
    // Last N days
    { regex: /last (\d+) days?/i, handler: (match: RegExpMatchArray) => {
      const days = parseInt(match[1]);
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days);
      return { startDate, endDate: today, timeRange: `last ${days} days` };
    }},
    
    // Specific date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
    { regex: /(\d{4}-\d{2}-\d{2})/i, handler: (match: RegExpMatchArray) => {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return { startDate: date, endDate: new Date(date.getTime() + 24 * 60 * 60 * 1000), timeRange: match[1] };
      }
      return null;
    }},
    
    { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/i, handler: (match: RegExpMatchArray) => {
      const date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      if (!isNaN(date.getTime())) {
        return { startDate: date, endDate: new Date(date.getTime() + 24 * 60 * 60 * 1000), timeRange: `${match[1]}/${match[2]}/${match[3]}` };
      }
      return null;
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
    const { message, conversationId, venueId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Initialize services
    const contextAggregator = new AIContextAggregator(supabase);
    const claudeAI = new ClaudeAI(supabase);

    // Parse date from query
    const dateInfo = parseDateQuery(message);
    const queryType = detectQueryType(message);
    
    // Determine venue ID
    let actualVenueId = venueId;
    if (!actualVenueId) {
      // Get default venue or first venue
      const { data: venues } = await supabase
        .from('venues')
        .select('id')
        .limit(1);
      
      if (venues && venues.length > 0) {
        actualVenueId = venues[0].id;
      } else {
        return res.status(400).json({ error: 'No venue found' });
      }
    }

    // Build enhanced context based on query type
    let context;
    if (dateInfo?.startDate && dateInfo?.endDate) {
      // If specific dates mentioned, get historical context
      context = await contextAggregator.buildEnhancedContext(
        actualVenueId,
        queryType,
        dateInfo.startDate,
        dateInfo.endDate
      );
      
      // Add time range info to context
      context.isHistoricalQuery = true;
      context.queryTimeRange = dateInfo.timeRange;
      context.queryStartDate = dateInfo.startDate.toISOString();
      context.queryEndDate = dateInfo.endDate.toISOString();
    } else {
      // Get current/recent context
      context = await contextAggregator.buildEnhancedContext(
        actualVenueId,
        queryType
      );
    }

    // Create or use conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId = await claudeAI.createConversation(
        actualVenueId,
        `Chat: ${new Date().toLocaleDateString()}`
      );
    }

    // Query Claude with enhanced context
    console.log('Querying Claude with context:', {
      venueId: actualVenueId,
      queryType,
      dateRange: dateInfo?.timeRange,
      hasToastData: !!context.toastAnalytics,
      contextKeys: Object.keys(context)
    });
    
    const response = await claudeAI.query({
      message,
      context,
      conversationId: activeConversationId,
    });
    
    console.log('Claude response:', {
      hasMessage: !!response.message,
      messageLength: response.message?.length,
      messagePreview: response.message?.substring(0, 100)
    });

    // Format response with any data visualizations
    const enhancedResponse = {
      ...response,
      conversationId: activeConversationId,
      context: {
        queryType,
        timeRange: dateInfo?.timeRange,
        hasToastData: !!context.toastAnalytics,
      },
      // Add visualization data if relevant
      visualizations: generateVisualizationData(context, queryType),
    };

    return res.status(200).json(enhancedResponse);
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Generate visualization data based on context and query type
function generateVisualizationData(context: any, queryType: string): any[] {
  const visualizations: any[] = [];

  if (queryType === 'revenue' && context.toastAnalytics?.hourlyPattern) {
    visualizations.push({
      type: 'line',
      title: 'Revenue by Hour',
      data: context.toastAnalytics.hourlyPattern,
      xAxis: 'hour',
      yAxis: 'revenue',
    });
  }

  if (queryType === 'menu' && context.toastAnalytics?.menuPerformance) {
    visualizations.push({
      type: 'bar',
      title: 'Top Menu Items by Revenue',
      data: context.toastAnalytics.menuPerformance.slice(0, 10),
      xAxis: 'itemName',
      yAxis: 'revenue',
    });
  }

  if (context.toastAnalytics?.comparative) {
    visualizations.push({
      type: 'comparison',
      title: 'Period Comparison',
      data: {
        current: context.toastAnalytics.comparative.current,
        previous: context.toastAnalytics.comparative.previous,
        change: context.toastAnalytics.comparative.change,
      },
    });
  }

  return visualizations;
}
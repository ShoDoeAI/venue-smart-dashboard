import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ClaudeAI } from '../src/services/claude-ai';
import type { AIContext } from '../src/services/claude-ai';
import { AIContextAggregatorToast } from '../src/services/ai-context-aggregator-toast';
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
  // Get proper Eastern Time components
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(now);
  const dateComponents: Record<string, string> = {};
  parts.forEach(({ type, value }) => {
    if (type !== 'literal') dateComponents[type] = value;
  });
  
  const year = parseInt(dateComponents.year);
  const month = parseInt(dateComponents.month) - 1; // JavaScript months are 0-based
  const day = parseInt(dateComponents.day);
  const today = new Date(year, month, day);
  
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
      return { startDate: date, endDate: date, timeRange: 'yesterday' };
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
    
    // Specific date like "August 1st" or "March 15th" - MUST come before month-only pattern
    { regex: /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i, 
      handler: (match: RegExpMatchArray) => {
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = monthNames.indexOf(match[1].toLowerCase());
        const day = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : 
                     (monthIndex <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1);
        
        const date = new Date(year, monthIndex, day);
        // For single day queries, use the same date for start and end
        
        return { 
          startDate: date, 
          endDate: date,  // Same date for single day
          timeRange: `${match[1]} ${day}, ${year}` 
        };
    }},
    
    // Specific month names (only when not followed by a day)
    { regex: /(january|february|march|april|may|june|july|august|september|october|november|december)(?!\s+\d)/i, handler: (match: RegExpMatchArray) => {
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
        return { startDate: date, endDate: date, timeRange: match[1] };
      }
      return null;
    }},
    
    { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/i, handler: (match: RegExpMatchArray) => {
      const date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      if (!isNaN(date.getTime())) {
        return { startDate: date, endDate: date, timeRange: `${match[1]}/${match[2]}/${match[3]}` };
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
    const contextAggregator = new AIContextAggregatorToast(supabase);
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
    let context: AIContext & { 
      toastAnalytics?: unknown;
      isHistoricalQuery?: boolean;
      queryTimeRange?: string;
      queryStartDate?: string;
      queryEndDate?: string;
    };
    
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
      contextKeys: Object.keys(context),
      version: '2.0' // Force new deployment
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
      success: true,
      response: response.message, // Frontend expects 'response' not 'message'
      messageId: `msg-${Date.now()}`, // Generate a message ID
      conversationId: activeConversationId,
      actions: response.suggestedActions,
      insights: response.insights,
      followUpQuestions: response.followUpQuestions,
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

interface ChartVisualization {
  type: 'line' | 'bar' | 'comparison';
  title: string;
  data: unknown;
  xAxis?: string;
  yAxis?: string;
}

// Generate visualization data based on context and query type
function generateVisualizationData(context: AIContext & { toastAnalytics?: unknown }, queryType: string): ChartVisualization[] {
  const visualizations: ChartVisualization[] = [];

  const analytics = context.toastAnalytics as {
    hourlyPattern?: unknown[];
    menuPerformance?: unknown[];
    comparative?: {
      current: unknown;
      previous: unknown;
      change: unknown;
    };
  };

  if (queryType === 'revenue' && analytics?.hourlyPattern) {
    visualizations.push({
      type: 'line',
      title: 'Revenue by Hour',
      data: analytics.hourlyPattern,
      xAxis: 'hour',
      yAxis: 'revenue',
    });
  }

  if (queryType === 'menu' && analytics?.menuPerformance) {
    visualizations.push({
      type: 'bar',
      title: 'Top Menu Items by Revenue',
      data: analytics.menuPerformance.slice(0, 10),
      xAxis: 'itemName',
      yAxis: 'revenue',
    });
  }

  if (analytics?.comparative) {
    visualizations.push({
      type: 'comparison',
      title: 'Period Comparison',
      data: {
        current: analytics.comparative.current,
        previous: analytics.comparative.previous,
        change: analytics.comparative.change,
      },
    });
  }

  return visualizations;
}
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { AIContextAggregatorToast } from '../src/services/ai-context-aggregator-toast';
import { ClaudeAI } from '../src/services/claude-ai';
import type { AIContext } from '../src/services/claude-ai';

// Query type detection
function detectQueryType(message: string): 'revenue' | 'menu' | 'customers' | 'labor' | 'general' {
  const lowercaseMessage = message.toLowerCase();

  // Revenue indicators
  if (
    /revenue|sales|money|earnings|income|profit|loss|drop|increase|decrease/.test(lowercaseMessage)
  ) {
    return 'revenue';
  }

  // Menu/product indicators
  if (
    /menu|item|dish|drink|pour cost|food cost|best seller|popular|selling/.test(lowercaseMessage)
  ) {
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
function parseDateQuery(
  message: string,
): { startDate?: Date; endDate?: Date; timeRange?: string } | null {
  // Get proper Eastern Time components
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
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
    {
      regex: /last weekend/i,
      handler: () => {
        const dayOfWeek = now.getDay();
        const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
        const lastSunday = new Date(today);
        lastSunday.setDate(lastSunday.getDate() - daysToLastSunday);
        const lastFriday = new Date(lastSunday);
        lastFriday.setDate(lastFriday.getDate() - 2);
        return { startDate: lastFriday, endDate: lastSunday, timeRange: 'last weekend' };
      },
    },

    {
      regex: /this weekend/i,
      handler: () => {
        const dayOfWeek = now.getDay();
        const friday = new Date(today);
        let sunday = new Date(today);

        if (dayOfWeek === 0) {
          // Sunday
          friday.setDate(friday.getDate() - 2);
          sunday = new Date(today);
        } else if (dayOfWeek >= 5) {
          // Friday or Saturday
          friday.setDate(friday.getDate() - (dayOfWeek - 5));
          sunday.setDate(sunday.getDate() + (7 - dayOfWeek));
        } else {
          // Monday-Thursday
          friday.setDate(friday.getDate() + (5 - dayOfWeek));
          sunday.setDate(sunday.getDate() + (7 - dayOfWeek));
        }

        return { startDate: friday, endDate: sunday, timeRange: 'this weekend' };
      },
    },

    // Specific dates
    {
      regex: /yesterday/i,
      handler: () => {
        const date = new Date(today);
        date.setDate(date.getDate() - 1);
        return { startDate: date, endDate: date, timeRange: 'yesterday' };
      },
    },

    {
      regex: /today/i,
      handler: () => {
        return { startDate: today, endDate: now, timeRange: 'today' };
      },
    },

    // Relative day patterns (last Monday, last Friday, etc)
    {
      regex: /last (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      handler: (match: RegExpMatchArray) => {
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const targetDay = dayNames.indexOf(match[1].toLowerCase());
        const date = new Date(today);
        const currentDay = date.getDay();

        // Calculate days to go back
        let daysBack = currentDay - targetDay;
        if (daysBack <= 0) daysBack += 7;

        date.setDate(date.getDate() - daysBack);
        return { startDate: date, endDate: date, timeRange: `last ${match[1]}` };
      },
    },

    // Week patterns
    {
      regex: /last week/i,
      handler: () => {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7 - today.getDay());
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        return { startDate, endDate, timeRange: 'last week' };
      },
    },

    {
      regex: /this week/i,
      handler: () => {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        return { startDate, endDate: today, timeRange: 'this week' };
      },
    },

    // Month patterns
    {
      regex: /last month/i,
      handler: () => {
        const startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1, 1);
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth(), 0);
        return { startDate, endDate, timeRange: 'last month' };
      },
    },

    {
      regex: /this month/i,
      handler: () => {
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate, endDate: today, timeRange: 'this month' };
      },
    },

    // Month with year pattern (e.g., "July 2025", "June 2024") - MUST come before specific date pattern
    {
      regex:
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
      handler: (match: RegExpMatchArray) => {
        const monthMap: Record<string, number> = {
          jan: 0,
          january: 0,
          feb: 1,
          february: 1,
          mar: 2,
          march: 2,
          apr: 3,
          april: 3,
          may: 4,
          jun: 5,
          june: 5,
          jul: 6,
          july: 6,
          aug: 7,
          august: 7,
          sep: 8,
          sept: 8,
          september: 8,
          oct: 9,
          october: 9,
          nov: 10,
          november: 10,
          dec: 11,
          december: 11,
        };
        const monthIndex = monthMap[match[1].toLowerCase()];
        const day = parseInt(match[2]);
        const year = match[3]
          ? parseInt(match[3])
          : monthIndex <= today.getMonth()
            ? today.getFullYear()
            : today.getFullYear() - 1;

        const date = new Date(year, monthIndex, day);
        // For single day queries, use the same date for start and end

        return {
          startDate: date,
          endDate: date, // Same date for single day
          timeRange: `${match[1]} ${day}, ${year}`,
        };
      },
    },

    // Specific date like "August 1st" or "Aug 8th" - must be 1-31, not part of year
    {
      regex:
        /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i,
      handler: (match: RegExpMatchArray) => {
        const monthNames = [
          'january',
          'february',
          'march',
          'april',
          'may',
          'june',
          'july',
          'august',
          'september',
          'october',
          'november',
          'december',
        ];
        const monthIndex = monthNames.indexOf(match[1].toLowerCase());
        const year = parseInt(match[2]);
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);
        return { startDate, endDate, timeRange: `${match[1]} ${year}` };
      },
    },

    // Specific month names (only when not followed by a day or year)
    {
      regex:
        /(january|february|march|april|may|june|july|august|september|october|november|december)(?!\s+\d)/i,
      handler: (match: RegExpMatchArray) => {
        const monthNames = [
          'january',
          'february',
          'march',
          'april',
          'may',
          'june',
          'july',
          'august',
          'september',
          'october',
          'november',
          'december',
        ];
        const monthIndex = monthNames.indexOf(match[1].toLowerCase());
        const year = monthIndex <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1;
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);
        return { startDate, endDate, timeRange: `${match[1]} ${year}` };
      },
    },

    // Last N days
    {
      regex: /last (\d+) days?/i,
      handler: (match: RegExpMatchArray) => {
        const days = parseInt(match[1]);
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - days);
        return { startDate, endDate: today, timeRange: `last ${days} days` };
      },
    },

    // Specific date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
    {
      regex: /(\d{4}-\d{2}-\d{2})/i,
      handler: (match: RegExpMatchArray) => {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return { startDate: date, endDate: date, timeRange: match[1] };
        }
        return null;
      },
    },

    {
      regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
      handler: (match: RegExpMatchArray) => {
        const date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
        if (!isNaN(date.getTime())) {
          return {
            startDate: date,
            endDate: date,
            timeRange: `${match[1]}/${match[2]}/${match[3]}`,
          };
        }
        return null;
      },
    },
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = message.match(pattern.regex);
    if (match) {
      console.log(`[DATE PARSING] Pattern ${i} matched:`, pattern.regex.toString());
      const result = pattern.handler(match);
      if (result) {
        console.log('[DATE PARSING] Result:', result);
        return result;
      }
    }
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[HANDLER] Request received:', { method: req.method, body: req.body });
  
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

    // Initialize services
    const contextAggregator = new AIContextAggregatorToast(supabase);
    const claudeAI = new ClaudeAI(supabase);

    // Parse date from query
    console.log('[DATE PARSING] About to parse message:', message);
    const dateInfo = parseDateQuery(message);
    const queryType = detectQueryType(message);
    
    console.log('[DATE PARSING] Input message:', message);
    console.log('[DATE PARSING] Parsed result:', dateInfo);
    console.log('[DATE PARSING] Query type:', queryType);

    // Determine venue ID
    let actualVenueId: string | undefined = venueId;
    if (!actualVenueId) {
      // Get default venue or first venue
      const { data: venues } = await supabase.from('venues').select('id').limit(1);

      if (venues && venues.length > 0) {
        actualVenueId = venues[0]?.id as string;
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

    console.log('[CONTEXT 1] Building AI context...', {
      hasDateInfo: !!dateInfo,
      dateRange: dateInfo ? { start: dateInfo.startDate?.toISOString(), end: dateInfo.endDate?.toISOString() } : null,
      queryType,
      venueId: actualVenueId
    });

    if (dateInfo?.startDate && dateInfo?.endDate) {
      // If specific dates mentioned, get historical context
      context = await contextAggregator.buildEnhancedContext(
        actualVenueId,
        queryType,
        dateInfo.startDate,
        dateInfo.endDate,
      );

      // Add time range info to context
      context.isHistoricalQuery = true;
      context.queryTimeRange = dateInfo.timeRange;
      context.queryStartDate = dateInfo.startDate.toISOString();
      context.queryEndDate = dateInfo.endDate.toISOString();
    } else {
      // Get current/recent context
      context = await contextAggregator.buildEnhancedContext(actualVenueId, queryType);
    }
    
    console.log('[CONTEXT 2] Context received from aggregator:', {
      hasContext: !!context,
      contextKeys: Object.keys(context),
      hasToastAnalytics: !!context.toastAnalytics,
      toastAnalyticsKeys: context.toastAnalytics ? Object.keys(context.toastAnalytics) : null,
      toastAnalyticsSnapshot: context.toastAnalytics ? JSON.stringify(context.toastAnalytics).substring(0, 300) : null
    });

    // Create or use conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId = await claudeAI.createConversation(
        actualVenueId,
        `Chat: ${new Date().toLocaleDateString()}`,
      );
    }

    // Query Claude with enhanced context
    console.log('[CONTEXT 3] Final AI context before Claude query:', {
      venueId: actualVenueId,
      queryType,
      dateRange: dateInfo?.timeRange,
      hasToastData: !!context.toastAnalytics,
      contextKeys: Object.keys(context),
      toastTotalRevenue: (context.toastAnalytics as any)?.totalRevenue,
      toastDailyBreakdownCount: (context.toastAnalytics as any)?.dailyBreakdown?.length,
      contextSize: JSON.stringify(context).length,
      version: '2.1' // Force new deployment
    });

    const response = await claudeAI.query({
      message,
      context,
      conversationId: activeConversationId,
    });
    
    console.log('[CONTEXT 4] Claude response received:', {
      hasResponse: !!response,
      hasMessage: !!response?.message,
      messagePreview: response?.message?.substring(0, 100)
    });

    // console.log('Claude response:', {
    //   hasMessage: !!response.message,
    //   messageLength: response.message?.length,
    //   messagePreview: response.message?.substring(0, 100)
    // });

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

interface ToastAnalyticsData {
  hourlyPattern?: Array<{ hour: number; revenue: number }>;
  menuPerformance?: Array<{ itemName: string; revenue: number }>;
  dailyBreakdown?: Array<{
    date: string;
    revenue: number;
    orders: number;
    checks: number;
    dayOfWeek: string;
  }>;
  totalRevenue?: number;
  comparative?: {
    current: { revenue: number; transactions: number };
    previous: { revenue: number; transactions: number };
    change: { revenue: number; transactions: number; avgCheck: number };
  };
}

// Generate visualization data based on context and query type
function generateVisualizationData(
  context: AIContext & { toastAnalytics?: unknown },
  queryType: string,
): ChartVisualization[] {
  const visualizations: ChartVisualization[] = [];

  const analytics = context.toastAnalytics as ToastAnalyticsData | undefined;

  // Add daily breakdown visualization for revenue queries with multiple days
  if (queryType === 'revenue' && analytics?.dailyBreakdown && analytics.dailyBreakdown.length > 1) {
    visualizations.push({
      type: 'bar',
      title: `Total Revenue: $${analytics.totalRevenue?.toFixed(2) || '0.00'}`,
      data: analytics.dailyBreakdown.map((day) => ({
        date: day.date,
        dayLabel: `${day.dayOfWeek} ${day.date.split('-')[1]}/${day.date.split('-')[2]}`,
        revenue: day.revenue,
        checks: day.checks,
      })),
      xAxis: 'dayLabel',
      yAxis: 'revenue',
    });
  } else if (
    queryType === 'revenue' &&
    analytics?.dailyBreakdown &&
    analytics.dailyBreakdown.length === 1
  ) {
    // Single day - show hourly pattern if available
    if (analytics?.hourlyPattern) {
      visualizations.push({
        type: 'line',
        title: `${analytics.dailyBreakdown[0].date} Revenue: $${analytics.totalRevenue?.toFixed(2) || '0.00'}`,
        data: analytics.hourlyPattern,
        xAxis: 'hour',
        yAxis: 'revenue',
      });
    }
  } else if (queryType === 'revenue' && analytics?.hourlyPattern) {
    // Fallback to hourly pattern
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

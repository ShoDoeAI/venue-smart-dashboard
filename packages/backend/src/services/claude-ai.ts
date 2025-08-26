import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import { ClaudeRevenueTool } from './claude-revenue-tool';
import { ClaudeMenuTool } from './claude-menu-tool';

export interface AIContext {
  venue: {
    id: string;
    name: string;
    type: string;
  };
  currentMetrics: {
    todayRevenue: number;
    todayTransactions: number;
    todayCustomers: number;
    lastHourRevenue: number;
    activeEvents: number;
  };
  historicalTrends: {
    revenueGrowth: number;
    customerGrowth: number;
    averageTicketPrice: number;
    peakHours: number[];
  };
  activeAlerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    metric: string;
    currentValue: number;
    threshold: number;
  }>;
  availableActions: Array<{
    service: string;
    actionType: string;
    description: string;
  }>;
  // Enhanced fields for historical queries
  isHistoricalQuery?: boolean;
  queryTimeRange?: string;
  queryStartDate?: string;
  queryEndDate?: string;
  timeRangeSummary?: {
    startDate: string;
    endDate: string;
    totalDays: number;
    totalRevenue: number;
    totalTransactions: number;
    totalCustomers: number;
    avgDailyRevenue: number;
    bestDay: {
      date: string;
      revenue_total: number;
      transaction_count: number;
    };
    worstDay: {
      date: string;
      revenue_total: number;
      transaction_count: number;
    };
  };
}

export interface AIQuery {
  message: string;
  context: AIContext;
  conversationId?: string;
  maxTokens?: number;
}

export interface AIResponse {
  message: string;
  suggestedActions?: Array<{
    service: string;
    actionType: string;
    parameters: Record<string, unknown>;
    reason: string;
    impact: string;
    confidence: number;
  }>;
  insights?: Array<{
    type: string;
    finding: string;
    importance: 'low' | 'medium' | 'high';
    evidence: string[];
  }>;
  followUpQuestions?: string[];
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    context?: AIContext;
    suggestedActions?: AIResponse['suggestedActions'];
    insights?: AIResponse['insights'];
  };
  createdAt: string;
}

export class ClaudeAI {
  private anthropic: Anthropic;
  private systemPrompt: string;
  private revenueTool: ClaudeRevenueTool;
  private menuTool: ClaudeMenuTool;

  constructor(
    private supabase: SupabaseClient<Database>,
    apiKey?: string
  ) {
    const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY is not set!');
      throw new Error('Claude API key is required but not configured');
    }
    
    this.anthropic = new Anthropic({
      apiKey: anthropicKey,
    });

    this.systemPrompt = this.buildSystemPrompt();
    this.revenueTool = new ClaudeRevenueTool(this.supabase);
    this.menuTool = new ClaudeMenuTool(this.supabase);
  }

  /**
   * Process a message with tools enabled
   */
  async processMessageWithTools(
    message: string,
    venueId?: string,
    conversationId?: string
  ): Promise<AIResponse> {
    try {
      console.log('[CLAUDE TOOLS] Processing message with tools:', { 
        messageLength: message.length,
        hasVenueId: !!venueId,
        hasConversationId: !!conversationId
      });

      // Get conversation history if provided
      let conversationHistory: Anthropic.MessageParam[] = [];
      if (conversationId) {
        conversationHistory = await this.getConversationHistory(conversationId);
      }

      // Build messages with user query
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory,
        {
          role: 'user',
          content: message
        }
      ];

      // Call Claude with tools
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: this.systemPrompt,
        messages,
        tools: [
          ClaudeRevenueTool.getToolDefinition(),
          ClaudeMenuTool.getToolDefinition()
        ] as any
      });

      console.log('[CLAUDE TOOLS] Initial response:', {
        stopReason: response.stop_reason,
        hasToolUse: response.content.some(c => c.type === 'tool_use')
      });

      // Handle tool use if requested
      if (response.stop_reason === 'tool_use') {
        const toolUseBlock = response.content.find(c => c.type === 'tool_use') as Anthropic.ToolUseBlock;
        
        if (toolUseBlock) {
          console.log('[CLAUDE TOOLS] Executing tool:', toolUseBlock.name, toolUseBlock.input);
          
          let toolResult: unknown;
          
          // Execute the appropriate tool
          switch (toolUseBlock.name) {
            case 'query_venue_revenue':
              const revenueInput = toolUseBlock.input as { query: string; venueId?: string };
              toolResult = await this.revenueTool.queryRevenue({
                query: revenueInput.query,
                venueId: revenueInput.venueId || venueId
              });
              const revenueResult = toolResult as { success: boolean; data?: { totalRevenue?: number; dailyBreakdown?: unknown[] } };
              console.log('[CLAUDE TOOLS] Revenue tool result:', {
                success: revenueResult.success,
                totalRevenue: revenueResult.data?.totalRevenue,
                daysCount: revenueResult.data?.dailyBreakdown?.length
              });
              break;
              
            case 'query_menu_items':
              const menuInput = toolUseBlock.input as { query: string; venueId?: string };
              toolResult = await this.menuTool.queryMenu({
                query: menuInput.query,
                venueId: menuInput.venueId || venueId
              });
              const menuResult = toolResult as { success: boolean; data?: { totalItems?: number; topSellingItems?: unknown[] } };
              console.log('[CLAUDE TOOLS] Menu tool result:', {
                success: menuResult.success,
                totalItems: menuResult.data?.totalItems,
                topItemsCount: menuResult.data?.topSellingItems?.length
              });
              break;
              
            default:
              console.warn('[CLAUDE TOOLS] Unknown tool:', toolUseBlock.name);
              toolResult = { success: false, error: 'Unknown tool' };
          }

          // Send tool result back to Claude
          const followUpMessages: Anthropic.MessageParam[] = [
            ...messages,
            {
              role: 'assistant',
              content: response.content
            },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUseBlock.id,
                  content: JSON.stringify(toolResult)
                }
              ]
            }
          ];

          // Get final response with tool results
          const finalResponse = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            temperature: 0.7,
            system: this.systemPrompt,
            messages: followUpMessages
          });

          console.log('[CLAUDE TOOLS] Final response after tool use');
          
          // Parse and return the final response
          const aiResponse = this.parseResponse(finalResponse.content[0]);

          // Store conversation if needed
          if (conversationId) {
            await this.storeConversation(conversationId, message, aiResponse, {} as AIContext);
          }

          return aiResponse;
        }
      }

      // No tool use, return direct response
      const aiResponse = this.parseResponse(response.content[0]);
      
      if (conversationId) {
        await this.storeConversation(conversationId, message, aiResponse, {} as AIContext);
      }

      return aiResponse;

    } catch (error) {
      console.error('Claude tools query error:', error);
      throw error;
    }
  }

  /**
   * Process a query with Claude
   */
  async query(query: AIQuery): Promise<AIResponse> {
    console.log('[CLAUDE 1] Query received:', {
      messageLength: query.message.length,
      hasContext: !!query.context,
      contextKeys: Object.keys(query.context),
      hasToastAnalytics: !!(query.context as any).toastAnalytics,
      toastAnalyticsKeys: (query.context as any).toastAnalytics ? Object.keys((query.context as any).toastAnalytics) : null
    });
    
    try {
      // Get conversation history if conversationId provided
      let conversationHistory: Anthropic.MessageParam[] = [];
      if (query.conversationId) {
        conversationHistory = await this.getConversationHistory(query.conversationId);
      }

      // Build context message
      const contextMessage = this.buildContextMessage(query.context);
      
      console.log('[CLAUDE 2] Context message built:', {
        contextMessageLength: contextMessage.length,
        contextMessagePreview: contextMessage.substring(0, 500)
      });
      
      // CRITICAL: Log Toast analytics portion of context
      const toastSection = contextMessage.split('🎯 TOAST POS ANALYTICS')[1];
      if (toastSection) {
        console.log('[CLAUDE 2.5] TOAST ANALYTICS SECTION:', toastSection.substring(0, 1000));
      } else {
        console.log('[CLAUDE 2.5] NO TOAST ANALYTICS SECTION FOUND IN CONTEXT');
      }

      // Create messages array
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory,
        {
          role: 'user',
          content: `${contextMessage}\n\nUser Query: ${query.message}`,
        },
      ];

      // Call Claude API
      console.log('Calling Claude API with:', {
        model: 'claude-3-5-sonnet-20241022',
        systemPromptLength: this.systemPrompt.length,
        messagesCount: messages.length,
        maxTokens: query.maxTokens || 4096
      });
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: query.maxTokens || 4096,
        temperature: 0.7,
        system: this.systemPrompt,
        messages,
      });
      
      console.log('Claude API response:', {
        hasContent: !!response.content,
        contentLength: response.content?.length,
        firstContentType: response.content?.[0]?.type,
        usage: response.usage
      });

      // Parse response
      const aiResponse = this.parseResponse(response.content[0]);

      // Store conversation
      if (query.conversationId) {
        await this.storeConversation(
          query.conversationId,
          query.message,
          aiResponse,
          query.context
        );
      }

      return aiResponse;
    } catch (error) {
      console.error('Claude AI query error:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(venueId: string, title?: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('ai_conversations')
        .insert({
          venue_id: venueId,
          title: title || 'New Conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Conversation creation error:', error);
        // If table doesn't exist or other error, return a temporary ID
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('AI conversations table not found, using temporary conversation ID');
          return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      return data.id;
    } catch (err) {
      console.error('Error in createConversation:', err);
      // Return temporary ID to allow chat to continue
      return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Analyze real-time data and generate insights
   */
  async analyzeMetrics(context: AIContext): Promise<AIResponse> {
    const analysisPrompt = `Please analyze the current venue metrics and provide insights:

Current Performance:
- Today's Revenue: $${context.currentMetrics.todayRevenue.toFixed(2)}
- Transactions: ${context.currentMetrics.todayTransactions}
- Unique Customers: ${context.currentMetrics.todayCustomers}
- Last Hour Revenue: $${context.currentMetrics.lastHourRevenue.toFixed(2)}
- Active Events: ${context.currentMetrics.activeEvents}

Historical Trends:
- Revenue Growth: ${context.historicalTrends.revenueGrowth.toFixed(1)}%
- Customer Growth: ${context.historicalTrends.customerGrowth.toFixed(1)}%
- Average Ticket Price: $${context.historicalTrends.averageTicketPrice.toFixed(2)}
- Peak Hours: ${context.historicalTrends.peakHours.join(', ')}

Active Alerts: ${context.activeAlerts.length}

Please provide:
1. Key insights about current performance
2. Potential issues or opportunities
3. Recommended actions to improve performance
4. Questions to ask for deeper analysis`;

    return this.query({
      message: analysisPrompt,
      context,
    });
  }

  /**
   * Get action recommendations based on alerts
   */
  async getActionRecommendations(
    alerts: AIContext['activeAlerts'],
    context: AIContext
  ): Promise<AIResponse> {
    const alertsDescription = alerts
      .map(a => `- ${a.type}: ${a.message} (${a.severity} severity)`)
      .join('\n');

    const recommendationPrompt = `Based on these active alerts, please recommend specific actions:

${alertsDescription}

Available actions include:
${context.availableActions.map(a => `- ${a.service}: ${a.actionType} - ${a.description}`).join('\n')}

For each recommended action, please provide:
1. The specific action to take
2. Expected impact
3. Reasoning
4. Confidence level (0-1)`;

    return this.query({
      message: recommendationPrompt,
      context,
    });
  }

  /**
   * Build the system prompt
   */
  private buildSystemPrompt(): string {
    // Use Eastern Time for the business
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/New_York'
    });
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    });
    
    // Get proper Eastern Time components using Intl API
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
    
    const currentMonth = parseInt(dateComponents.month);
    const currentDay = parseInt(dateComponents.day);
    const currentYear = parseInt(dateComponents.year);
    
    return `You are a highly experienced venue operator with 20 years of hands-on experience managing successful restaurants, bars, nightclubs, and live music venues. You hold an MBA from Harvard Business School with a concentration in hospitality management and operations. Your expertise spans both the creative and analytical sides of venue management.

AVAILABLE TOOLS - USE THEM PROACTIVELY:
1. query_menu_items - For ALL questions about items, menu, food, drinks, products, best sellers
2. query_venue_revenue - For total revenue and daily breakdowns

RULE: When someone asks about "best seller", "top items", "popular", "menu", "food", "drinks" - IMMEDIATELY use query_menu_items tool without hesitation.

CRITICAL DATE AND TIME CONTEXT - YOU MUST UNDERSTAND THIS:
- Current date and time: ${currentDate} at ${currentTime} (Eastern Time - venue's local time)
- The venue operates in Eastern Time Zone (EST/EDT)
- Business hours typically run until 2 AM, so evening hours (9 PM) are peak business time
- The current year is ${currentYear}
- The current month is ${now.toLocaleString('en-US', { month: 'long', timeZone: 'America/New_York' })} (month ${currentMonth} of 12)
- Today is day ${currentDay} of the month
- Any date in ${currentYear} that is before ${currentMonth}/${currentDay}/${currentYear} is IN THE PAST and you HAVE DATA for it
- For example, if today is August 7, 2025, then August 1, 2025 is 6 days ago (IN THE PAST)
- You have access to historical data for the past 2 years (back to ${currentYear - 2})
- NEVER tell users that dates in ${currentYear} are "in the future" if they are before today's date

When users ask about dates:
- If the date is before today (${currentMonth}/${currentDay}/${currentYear}), you HAVE that data
- If the date is after today, then it is future data you cannot provide
- Always calculate whether a date is past or future relative to TODAY'S DATE
- Remember that venues operate late - 9 PM is prime business hours, not "early in the day"

Your background includes:
- Starting as a bartender and working your way up to multi-venue ownership
- Managing venues ranging from intimate 100-capacity cocktail bars to 2,000-capacity music venues
- Implementing data-driven strategies that increased revenues by 35-200% across different properties
- Deep expertise in POS systems (especially Toast), event management, inventory control, and staff optimization
- Teaching hospitality management as an adjunct professor at Cornell's Hotel School

Your personality and communication style:
- Direct and practical, but warm and encouraging
- You share specific examples from your experience when relevant
- You use industry terminology naturally (covers, turns, pour cost, RevPASH, etc.)
- You understand the emotional and human side of hospitality, not just the numbers
- You're equally comfortable discussing craft cocktail programs and P&L statements

When providing advice:
- Draw from your real-world experience with similar situations
- Share what worked (and what didn't) at venues you've managed
- Consider both immediate fixes and long-term strategic improvements
- Always think about the guest experience alongside profitability
- Recognize that every venue has its own culture and community

Your analytical approach:
- You immediately spot patterns that less experienced operators might miss
- You know which metrics actually matter vs vanity metrics
- You understand seasonal patterns, local events, and market dynamics
- You can quickly identify when numbers don't add up or indicate deeper issues
- You balance data analysis with gut instinct from years of experience

Communication guidelines:
- Speak as a peer and mentor, not a consultant
- Use "I've seen this before..." or "In my experience..." when sharing insights
- Be honest about challenges - you've dealt with difficult staff, bad months, and failed concepts
- Celebrate wins but always look for the next opportunity to improve
- Remember that behind every number is a guest experience and a team member's effort

Available data sources you're expertly familiar with:
- Toast POS: You've used it for 8+ years across multiple venues
- Eventbrite: You've promoted hundreds of events and understand ticket buyer psychology
- OpenDate.io: You've booked emerging artists who became headliners
- Financial data: You can read a P&L in your sleep and spot issues immediately
- Guest feedback: You know how to read between the lines of reviews

Your goal: Help fellow venue operators succeed by sharing your hard-won knowledge, identifying opportunities they might miss, and providing actionable advice that balances profitability with creating memorable experiences. You're their experienced friend in the business who's been there, done that, and genuinely wants to see them succeed.

MENU ANALYTICS CAPABILITIES:
You have access to detailed menu item sales data through the Toast POS integration.

IMPORTANT - ALWAYS USE THE MENU TOOL WHEN USERS ASK ABOUT:
- Best sellers, top sellers, popular items, what's selling
- Menu items, food items, drinks, beverages, specific dishes
- Item sales, item performance, menu performance
- What sold well/poorly, bestselling food/drinks
- Product mix, menu mix, sales by category
- Any question containing: "item", "menu", "food", "drink", "dish", "product", "selling", "sold"

You have the 'query_menu_items' tool that provides:
- Individual item sales quantities and revenue
- Menu category breakdowns (appetizers, entrees, beverages, etc.)
- Best sellers by quantity or revenue
- Item-level metrics over any date range
- Complete product mix analysis

When responding about menu items:
- ALWAYS use the query_menu_items tool first to get accurate data
- Report exact item names and numbers from the tool results
- Never say you don't have access to menu data - you DO have access via the tool
- If the tool returns no data, then explain the date range has no sales

TOOL USAGE PRIORITY:
1. For ANY menu/item/food/drink question → Use query_menu_items tool IMMEDIATELY
2. For revenue totals → Use query_venue_revenue tool
3. The tools provide the accurate data - trust their results
4. If a tool fails, mention the error but don't claim you lack access

CRITICAL DATA ACCURACY RULES - 100% ACCURACY REQUIRED:
- ONLY use the exact revenue and metrics data provided in the context
- NEVER make up or imagine revenue numbers, sales figures, or metrics
- If specific data is not provided in the context, say "I don't have that specific data"
- Always refer to the visualization data when available as it contains the accurate totals
- If you see hourly data but not daily totals, acknowledge you only have partial data
- DO NOT invent categories like "Food: $X" or "Beverage: $Y" unless explicitly provided
- When Toast Analytics shows a total revenue, that is the ONLY number you should cite

REVENUE REPORTING ACCURACY:
- When reporting revenue, ALWAYS use the exact totalRevenue value from toastAnalytics
- Format revenue with proper currency: $X,XXX.XX (with commas and two decimal places)
- If dailyBreakdown is provided, the sum MUST equal totalRevenue
- NEVER round revenue numbers - report them exactly as provided
- If a date range has no data, explicitly state "No revenue data for [date range]"
- When reporting daily revenue, use the exact values from dailyBreakdown
- VERIFICATION: Your reported total MUST match what appears in the Toast POS dashboard

HANDLING ZERO OR NO DATA:
- If revenue is $0.00 or no data exists, simply state: "No revenue data available for [date range]"
- DO NOT speculate about why there's no data (closures, issues, etc.)
- DO NOT offer to investigate or troubleshoot - just report the facts
- Keep responses brief and factual when there's no data
- If user asks why there's no data, say "I don't have information about why there's no data for this period"`;
  }

  /**
   * Build context message for Claude
   */
  private buildContextMessage(context: AIContext & { toastAnalytics?: any }): string {
    // Use Eastern Time for the business
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    });
    
    let contextMessage = `CURRENT DATE AND TIME: ${currentDateTime} (Venue's Local Time)
Business Context: 9 PM on Sunday is PEAK business hours, not "early in the day".

Current Venue Context:
Venue: ${context.venue.name} (${context.venue.type})

Real-time Metrics:
- Revenue Today: $${context.currentMetrics.todayRevenue.toFixed(2)}
- Transactions: ${context.currentMetrics.todayTransactions}
- Customers: ${context.currentMetrics.todayCustomers}
- Last Hour: $${context.currentMetrics.lastHourRevenue.toFixed(2)}
- Active Events: ${context.currentMetrics.activeEvents}

Trends:
- Revenue Growth: ${context.historicalTrends.revenueGrowth.toFixed(1)}%
- Customer Growth: ${context.historicalTrends.customerGrowth.toFixed(1)}%
- Avg Ticket: $${context.historicalTrends.averageTicketPrice.toFixed(2)}
- Peak Hours: ${context.historicalTrends.peakHours.join(', ')}

${context.activeAlerts.length > 0 ? `Active Alerts (${context.activeAlerts.length}):
${context.activeAlerts.map(a => `- ${a.type}: ${a.message}`).join('\n')}` : 'No active alerts'}`;

    // Add Toast Analytics data if available
    console.log('[CLAUDE 3] Checking toastAnalytics:', {
      hasToastAnalytics: !!context.toastAnalytics,
      toastAnalyticsType: typeof context.toastAnalytics,
      toastAnalyticsKeys: context.toastAnalytics ? Object.keys(context.toastAnalytics) : null,
      totalRevenue: (context.toastAnalytics as any)?.totalRevenue,
      queryPeriod: (context.toastAnalytics as any)?.queryPeriod
    });
    
    if (context.toastAnalytics) {
      const ta = context.toastAnalytics;
      contextMessage += '\n\n🎯 TOAST POS ANALYTICS (USE ONLY THESE NUMBERS):';
      
      // Check if this is a "no data" response
      if (ta.noDataFound) {
        contextMessage += `\n\n** NO DATA FOUND for the requested period ${ta.queryPeriod?.startDate} to ${ta.queryPeriod?.endDate} **`;
        contextMessage += '\nThe venue was likely closed on these dates, or no transactions were recorded.';
      } else {
        // Show total revenue FIRST and PROMINENTLY
        if (ta.totalRevenue !== undefined) {
          contextMessage += `\n\n** TOTAL REVENUE: $${ta.totalRevenue.toFixed(2)} **`;
          if (ta.queryPeriod) {
            contextMessage += ` (for ${ta.queryPeriod.startDate} to ${ta.queryPeriod.endDate})`;
          }
          contextMessage += '\n';
        }
      }
      
      // Daily breakdown if available
      if (ta.dailyBreakdown && ta.dailyBreakdown.length > 0) {
        contextMessage += '\nDaily Revenue Breakdown:';
        contextMessage += '\n[IMPORTANT: These are the ACTUAL revenue numbers from Toast POS. Use ONLY these numbers when answering questions about specific dates.]';
        
        // For single-day queries, make it VERY clear
        if (ta.dailyBreakdown.length === 1) {
          const day = ta.dailyBreakdown[0];
          contextMessage += `\n\n>>> ${day.date}: $${day.revenue.toFixed(2)} (${day.checks || 0} checks) <<<\n`;
          contextMessage += `This is the ONLY data available for the requested date.`;
        } else {
          ta.dailyBreakdown.forEach((day: any) => {
            contextMessage += `\n- ${day.date} (${day.dayOfWeek}): $${day.revenue.toFixed(2)} with ${day.checks || 0} checks`;
          });
        }
        contextMessage += '\n';
      }
      
      // Day of Week Analysis
      if (ta.dayOfWeekAnalysis) {
        contextMessage += '\nDay of Week Analysis:';
        Object.entries(ta.dayOfWeekAnalysis).forEach(([day, data]: [string, any]) => {
          contextMessage += `\n- ${day}: Avg $${data.avgRevenue.toFixed(2)} (${data.percentOfWeek.toFixed(1)}% of weekly revenue)`;
        });
        contextMessage += '\n';
      }
      
      // Year over Year Comparison
      if (ta.yearOverYear) {
        const yoy = ta.yearOverYear;
        contextMessage += `\nYear-over-Year Comparison:
- ${yoy.currentPeriod.year}: $${yoy.currentPeriod.revenue.toFixed(2)} (${yoy.currentPeriod.orders} orders, avg $${yoy.currentPeriod.avgCheck.toFixed(2)})
- ${yoy.previousPeriod.year}: $${yoy.previousPeriod.revenue.toFixed(2)} (${yoy.previousPeriod.orders} orders, avg $${yoy.previousPeriod.avgCheck.toFixed(2)})
- Revenue Growth: ${yoy.growth.revenue >= 0 ? '+' : ''}${yoy.growth.revenue.toFixed(1)}%
- Order Growth: ${yoy.growth.orders >= 0 ? '+' : ''}${yoy.growth.orders.toFixed(1)}%
- Avg Check Growth: ${yoy.growth.avgCheck >= 0 ? '+' : ''}${yoy.growth.avgCheck.toFixed(1)}%\n`;
      }
      
      // Insights
      if (ta.insights) {
        contextMessage += '\nKey Insights:';
        if (ta.insights.trends.length > 0) {
          contextMessage += '\nTrends:';
          ta.insights.trends.forEach((trend: string) => {
            contextMessage += `\n- ${trend}`;
          });
        }
        if (ta.insights.peakDays.length > 0) {
          contextMessage += '\nTop 3 Days:';
          ta.insights.peakDays.forEach((day: string) => {
            contextMessage += `\n- ${day}`;
          });
        }
        contextMessage += '\n';
      }
      
      // Period summary (most important!)
      if (context.toastAnalytics.periodSummary) {
        const ps = context.toastAnalytics.periodSummary;
        contextMessage += `\n
Revenue Summary for ${ps.startDate} to ${ps.endDate}:
- Total Revenue: $${ps.totalRevenue.toFixed(2)}
- Total Transactions: ${ps.totalTransactions}
- Average Daily Revenue: $${ps.avgDailyRevenue.toFixed(2)}`;
        
        if (ps.dailyBreakdown && ps.dailyBreakdown.length > 0) {
          contextMessage += '\n\nDaily Breakdown:';
          ps.dailyBreakdown.forEach((day: any) => {
            contextMessage += `\n- ${day.date}: $${day.revenue.toFixed(2)} (${day.transactions} transactions)${day.hasOverride ? ' [verified]' : ''}`;
          });
        }
      }
      
      // Comparative metrics
      if (context.toastAnalytics.comparative) {
        const comp = context.toastAnalytics.comparative;
        contextMessage += `\n
Period Comparison:
- Current Revenue: $${comp.current.revenue.toFixed(2)} (${comp.current.transactions} transactions)
- Previous Revenue: $${comp.previous.revenue.toFixed(2)} (${comp.previous.transactions} transactions)
- Revenue Change: ${comp.change.revenue > 0 ? '+' : ''}${comp.change.revenue.toFixed(1)}%
- Transaction Change: ${comp.change.transactions > 0 ? '+' : ''}${comp.change.transactions.toFixed(1)}%
- Avg Check Change: ${comp.change.avgCheck > 0 ? '+' : ''}${comp.change.avgCheck.toFixed(1)}%`;
      }
      
      // Menu performance
      if (context.toastAnalytics.menuPerformance) {
        const topItems = context.toastAnalytics.menuPerformance.slice(0, 5);
        contextMessage += `\n
Top Menu Items:`;
        topItems.forEach((item: any, i: number) => {
          contextMessage += `\n${i + 1}. ${item.itemName}: $${item.revenue.toFixed(2)} (${item.quantity} sold, ${item.percentOfRevenue.toFixed(1)}% of revenue, trend: ${item.trend})`;
        });
      }
      
      // Pour cost
      if (context.toastAnalytics.pourCost) {
        const pc = context.toastAnalytics.pourCost;
        contextMessage += `\n
Pour Cost Analysis:
- Current Pour Cost: ${pc.currentPourCost.toFixed(1)}%
- Previous Pour Cost: ${pc.previousPourCost.toFixed(1)}%
- Change: ${pc.change > 0 ? '+' : ''}${pc.change.toFixed(1)}%`;
        
        if (pc.topSpillers.length > 0) {
          contextMessage += '\nTop Variance Items:';
          pc.topSpillers.slice(0, 3).forEach((item: any) => {
            contextMessage += `\n- ${item.itemName}: ${item.variance.toFixed(1)}% over target`;
          });
        }
      }
      
      // Customer analysis
      if (context.toastAnalytics.customers) {
        const cust = context.toastAnalytics.customers;
        contextMessage += `\n
Customer Analysis:
- New Customers: ${cust.newCustomers}
- Returning Customers: ${cust.returningCustomers}
- Avg Visits per Customer: ${cust.averageVisitsPerCustomer.toFixed(1)}`;
        
        if (cust.topCustomers.length > 0) {
          contextMessage += '\nTop Customers:';
          cust.topCustomers.slice(0, 3).forEach((c: any) => {
            contextMessage += `\n- ${c.name}: ${c.visits} visits, $${c.totalSpent.toFixed(2)} total`;
          });
        }
      }
      
      // Labor analysis
      if (context.toastAnalytics.labor) {
        const labor = context.toastAnalytics.labor;
        contextMessage += `\n
Labor Analysis:
- Labor Cost: $${labor.laborCost.toFixed(2)} (${labor.laborPercentage.toFixed(1)}% of revenue)
- Sales per Labor Hour: $${labor.salesPerLaborHour.toFixed(2)}`;
        
        if (labor.overstaffedHours.length > 0) {
          contextMessage += `\n- Potentially overstaffed hours: ${labor.overstaffedHours.join(', ')}`;
        }
        if (labor.understaffedHours.length > 0) {
          contextMessage += `\n- Potentially understaffed hours: ${labor.understaffedHours.join(', ')}`;
        }
      }
      
      // Hourly patterns
      if (context.toastAnalytics.hourlyPattern) {
        const pattern = context.toastAnalytics.hourlyPattern;
        const topHours = pattern
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .slice(0, 3);
        contextMessage += `\n
Top Revenue Hours:`;
        topHours.forEach((h: any) => {
          const hour = h.hour > 12 ? `${h.hour - 12}PM` : `${h.hour}AM`;
          contextMessage += `\n- ${hour}: $${h.revenue.toFixed(2)}`;
        });
      }
    }
    
    // Add time range context if it's a historical query
    if (context.isHistoricalQuery) {
      contextMessage += `\n\nQuery Time Range: ${context.queryTimeRange} (${context.queryStartDate} to ${context.queryEndDate})`;
    }

    return contextMessage;
  }

  /**
   * Parse Claude's response into structured format
   */
  private parseResponse(content: Anthropic.ContentBlock): AIResponse {
    console.log('Parsing Claude response:', {
      contentType: content?.type,
      hasText: !!(content as any)?.text
    });
    
    if (!content) {
      console.error('No content block received from Claude');
      return { message: 'No response received from AI. Please check the API configuration.' };
    }
    
    if (content.type !== 'text') {
      console.error('Unexpected content type:', content.type);
      return { message: 'Unexpected response format from AI.' };
    }

    const text = content.text;
    
    if (!text || text.trim() === '') {
      console.error('Empty text response from Claude');
      return { message: 'Received empty response from AI. Please try again.' };
    }
    
    console.log('Claude text response length:', text.length);

    // Extract suggested actions if present
    const suggestedActions = this.extractSuggestedActions(text);

    // Extract insights
    const insights = this.extractInsights(text);

    // Extract follow-up questions
    const followUpQuestions = this.extractFollowUpQuestions(text);

    // Clean message text
    const message = this.cleanMessageText(text, suggestedActions, insights, followUpQuestions);

    return {
      message,
      suggestedActions,
      insights,
      followUpQuestions,
    };
  }

  /**
   * Extract suggested actions from response
   */
  private extractSuggestedActions(text: string): AIResponse['suggestedActions'] {
    const actions: AIResponse['suggestedActions'] = [];
    
    // Look for action patterns in the text
    const actionRegex = /(?:recommend|suggest|action):[^.]+\./gi;
    const matches = text.match(actionRegex);

    if (matches) {
      matches.forEach(match => {
        // Parse action details (simplified for now)
        // In production, use more sophisticated parsing or structured output
        actions.push({
          service: 'toast', // Would be determined from context
          actionType: 'update_price',
          parameters: {},
          reason: match,
          impact: 'Medium',
          confidence: 0.8,
        });
      });
    }

    return actions.length > 0 ? actions : undefined;
  }

  /**
   * Extract insights from response
   */
  private extractInsights(text: string): AIResponse['insights'] {
    const insights: AIResponse['insights'] = [];
    
    // Look for insight patterns
    const insightRegex = /(?:insight|finding|observation):[^.]+\./gi;
    const matches = text.match(insightRegex);

    if (matches) {
      matches.forEach(match => {
        insights.push({
          type: 'performance',
          finding: match,
          importance: 'medium',
          evidence: [],
        });
      });
    }

    return insights.length > 0 ? insights : undefined;
  }

  /**
   * Extract follow-up questions
   */
  private extractFollowUpQuestions(text: string): string[] {
    const questions: string[] = [];
    
    // Look for questions in the text
    const questionRegex = /[^.!?]*\?/g;
    const matches = text.match(questionRegex);

    if (matches) {
      questions.push(...matches.map(q => q.trim()));
    }

    return questions.length > 0 ? questions : [];
  }

  /**
   * Clean message text
   */
  private cleanMessageText(
    text: string,
    _actions?: AIResponse['suggestedActions'],
    _insights?: AIResponse['insights'],
    _questions?: string[]
  ): string {
    // For now, return the full text
    // In production, you might want to remove extracted sections
    return text;
  }

  /**
   * Get conversation history
   */
  private async getConversationHistory(conversationId: string): Promise<Anthropic.MessageParam[]> {
    // Return empty history for temporary conversations
    if (conversationId.startsWith('temp-')) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch conversation history:', error);
        return [];
      }

      return data.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      return [];
    }
  }

  /**
   * Store conversation message
   */
  private async storeConversation(
    conversationId: string,
    userMessage: string,
    aiResponse: AIResponse,
    context: AIContext
  ): Promise<void> {
    // Skip storing if using temporary conversation ID
    if (conversationId.startsWith('temp-')) {
      console.log('Skipping conversation storage for temporary ID');
      return;
    }

    try {
      // Store user message
      await this.supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        metadata: { context },
        created_at: new Date().toISOString(),
      });

      // Store AI response
      await this.supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.message,
        metadata: {
          suggestedActions: aiResponse.suggestedActions,
          insights: aiResponse.insights,
        },
        created_at: new Date().toISOString(),
      });

      // Update conversation timestamp
      await this.supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error storing conversation:', error);
      // Continue without throwing - don't break the chat
    }
  }

  /**
   * Get token count for a message
   */
  async getTokenCount(text: string): Promise<number> {
    // Rough estimation: 1 token ≈ 4 characters
    // For production, use proper tokenizer
    return Math.ceil(text.length / 4);
  }

  /**
   * Manage context size to stay within limits
   */
  async optimizeContext(context: AIContext, maxTokens: number = 4000): Promise<AIContext> {
    const contextString = JSON.stringify(context);
    const estimatedTokens = await this.getTokenCount(contextString);

    if (estimatedTokens <= maxTokens) {
      return context;
    }

    // Reduce context size by removing less important data
    const optimizedContext = { ...context };

    // Remove low-severity alerts
    if (optimizedContext.activeAlerts.length > 5) {
      optimizedContext.activeAlerts = optimizedContext.activeAlerts
        .filter(a => a.severity !== 'low')
        .slice(0, 5);
    }

    // Limit available actions
    if (optimizedContext.availableActions.length > 10) {
      optimizedContext.availableActions = optimizedContext.availableActions.slice(0, 10);
    }

    return optimizedContext;
  }
}
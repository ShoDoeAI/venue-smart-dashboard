import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

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
    parameters: Record<string, any>;
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

  constructor(
    private supabase: SupabaseClient<Database>,
    apiKey?: string
  ) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY!,
    });

    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * Process a query with Claude
   */
  async query(query: AIQuery): Promise<AIResponse> {
    try {
      // Get conversation history if conversationId provided
      let conversationHistory: Anthropic.MessageParam[] = [];
      if (query.conversationId) {
        conversationHistory = await this.getConversationHistory(query.conversationId);
      }

      // Build context message
      const contextMessage = this.buildContextMessage(query.context);

      // Create messages array
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory,
        {
          role: 'user',
          content: `${contextMessage}\n\nUser Query: ${query.message}`,
        },
      ];

      // Call Claude API
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: query.maxTokens || 4096,
        temperature: 0.7,
        system: this.systemPrompt,
        messages,
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
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return data.id;
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
    return `You are an AI assistant for VenueSync, a platform that helps venue managers optimize their operations across multiple systems including POS (Toast), events (Eventbrite), and ticketing (OpenDate.io).

Your role is to:
1. Analyze venue performance data and identify trends, issues, and opportunities
2. Provide actionable insights based on real-time and historical data
3. Recommend specific actions to improve revenue, customer satisfaction, and operational efficiency
4. Answer questions about venue performance in a clear, data-driven manner

When analyzing data:
- Focus on actionable insights rather than just describing the data
- Consider seasonality, day of week, and time of day patterns
- Look for correlations between different metrics
- Identify both problems and opportunities

When recommending actions:
- Be specific about what action to take and why
- Estimate the potential impact (revenue, customer experience, efficiency)
- Consider any potential negative effects
- Provide confidence levels for recommendations

Response format:
- Structure responses with clear sections
- Use bullet points for lists
- Include specific numbers and percentages
- Keep language professional but conversational

Available data sources:
- Toast POS: Transaction data, menu items, payment methods
- Eventbrite: Event attendance, ticket sales, capacity utilization
- OpenDate.io: Live music shows, fan data, artist information

Remember: Your goal is to help venue managers make data-driven decisions that improve their business performance.`;
  }

  /**
   * Build context message for Claude
   */
  private buildContextMessage(context: AIContext): string {
    return `Current Venue Context:
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
  }

  /**
   * Parse Claude's response into structured format
   */
  private parseResponse(content: Anthropic.ContentBlock): AIResponse {
    if (content.type !== 'text') {
      return { message: 'Unexpected response format' };
    }

    const text = content.text;

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
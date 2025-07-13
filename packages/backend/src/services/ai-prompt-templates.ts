import type { AIContext } from './claude-ai';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'recommendation' | 'forecast' | 'diagnostic';
  template: string;
  requiredContext: Array<keyof AIContext>;
  parameters?: Record<string, any>;
}

export class AIPromptTemplates {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Get a prompt template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates in a category
   */
  getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Generate prompt from template
   */
  generatePrompt(templateId: string, context: AIContext, parameters?: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let prompt = template.template;

    // Replace context placeholders
    prompt = prompt.replace(/\{\{venue\.name\}\}/g, context.venue.name);
    prompt = prompt.replace(/\{\{venue\.type\}\}/g, context.venue.type);
    prompt = prompt.replace(/\{\{revenue\.today\}\}/g, context.currentMetrics.todayRevenue.toFixed(2));
    prompt = prompt.replace(/\{\{transactions\.today\}\}/g, context.currentMetrics.todayTransactions.toString());
    prompt = prompt.replace(/\{\{customers\.today\}\}/g, context.currentMetrics.todayCustomers.toString());
    prompt = prompt.replace(/\{\{revenue\.lastHour\}\}/g, context.currentMetrics.lastHourRevenue.toFixed(2));
    prompt = prompt.replace(/\{\{events\.active\}\}/g, context.currentMetrics.activeEvents.toString());
    prompt = prompt.replace(/\{\{trends\.revenueGrowth\}\}/g, context.historicalTrends.revenueGrowth.toFixed(1));
    prompt = prompt.replace(/\{\{trends\.customerGrowth\}\}/g, context.historicalTrends.customerGrowth.toFixed(1));
    prompt = prompt.replace(/\{\{trends\.avgTicket\}\}/g, context.historicalTrends.averageTicketPrice.toFixed(2));
    prompt = prompt.replace(/\{\{trends\.peakHours\}\}/g, context.historicalTrends.peakHours.join(', '));
    prompt = prompt.replace(/\{\{alerts\.count\}\}/g, context.activeAlerts.length.toString());

    // Replace alert details
    const alertsList = context.activeAlerts.map(a => 
      `- ${a.type}: ${a.message} (${a.severity} severity)`
    ).join('\n');
    prompt = prompt.replace(/\{\{alerts\.list\}\}/g, alertsList);

    // Replace action details
    const actionsList = context.availableActions.map(a => 
      `- ${a.service}: ${a.actionType} - ${a.description}`
    ).join('\n');
    prompt = prompt.replace(/\{\{actions\.list\}\}/g, actionsList);

    // Replace custom parameters
    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{params\\.${key}\\}\\}`, 'g');
        prompt = prompt.replace(regex, value.toString());
      });
    }

    return prompt;
  }

  /**
   * Initialize all prompt templates
   */
  private initializeTemplates() {
    // Revenue Analysis Templates
    this.addTemplate({
      id: 'revenue-analysis',
      name: 'Revenue Performance Analysis',
      description: 'Comprehensive revenue analysis with trends and insights',
      category: 'analysis',
      requiredContext: ['currentMetrics', 'historicalTrends'],
      template: `Analyze the revenue performance for {{venue.name}}:

Current Performance:
- Today's Revenue: ${{revenue.today}} ({{transactions.today}} transactions)
- Last Hour: ${{revenue.lastHour}}
- Revenue Growth: {{trends.revenueGrowth}}%
- Average Transaction: ${{trends.avgTicket}}

Please provide:
1. Assessment of current revenue performance
2. Comparison to historical averages
3. Identification of any concerning trends
4. Opportunities for revenue improvement
5. Specific recommendations based on the data

Focus on actionable insights that can be implemented today.`,
    });

    this.addTemplate({
      id: 'hourly-revenue-forecast',
      name: 'Hourly Revenue Forecast',
      description: 'Predict revenue for the next few hours',
      category: 'forecast',
      requiredContext: ['currentMetrics', 'historicalTrends'],
      template: `Based on current performance and historical patterns for {{venue.name}}:

Current Status:
- Last Hour Revenue: ${{revenue.lastHour}}
- Today's Total: ${{revenue.today}}
- Peak Hours: {{trends.peakHours}}

Please forecast:
1. Expected revenue for the next 3 hours
2. Confidence level for each hour
3. Factors that could impact the forecast
4. Recommendations to maximize revenue during peak periods`,
    });

    // Customer Analysis Templates
    this.addTemplate({
      id: 'customer-behavior',
      name: 'Customer Behavior Analysis',
      description: 'Analyze customer patterns and trends',
      category: 'analysis',
      requiredContext: ['currentMetrics', 'historicalTrends'],
      template: `Analyze customer behavior for {{venue.name}}:

Customer Metrics:
- Today's Customers: {{customers.today}}
- Customer Growth: {{trends.customerGrowth}}%
- Average Spend: ${{trends.avgTicket}}
- Peak Hours: {{trends.peakHours}}

Please analyze:
1. Customer traffic patterns
2. Spending behavior trends
3. New vs returning customer insights
4. Opportunities to increase customer frequency
5. Strategies to improve average ticket size`,
    });

    // Alert Response Templates
    this.addTemplate({
      id: 'alert-response',
      name: 'Alert Response Recommendations',
      description: 'Respond to active alerts with recommendations',
      category: 'recommendation',
      requiredContext: ['activeAlerts', 'availableActions'],
      template: `{{venue.name}} has {{alerts.count}} active alerts:

{{alerts.list}}

Available Actions:
{{actions.list}}

For each alert:
1. Assess the severity and potential impact
2. Recommend specific actions to address it
3. Provide expected outcome of each action
4. Suggest monitoring metrics
5. Include confidence level (0-1) for each recommendation`,
    });

    // Event Performance Templates
    this.addTemplate({
      id: 'event-optimization',
      name: 'Event Performance Optimization',
      description: 'Optimize ticket sales and event performance',
      category: 'recommendation',
      requiredContext: ['currentMetrics', 'activeAlerts'],
      template: `Analyze event performance for {{venue.name}}:

Active Events: {{events.active}}
Event-related Alerts:
{{alerts.list}}

Please provide:
1. Assessment of current ticket sales
2. Capacity utilization analysis
3. Pricing optimization recommendations
4. Marketing suggestions to boost sales
5. Timing recommendations for promotions`,
    });

    // Diagnostic Templates
    this.addTemplate({
      id: 'performance-diagnostic',
      name: 'Performance Diagnostic',
      description: 'Diagnose performance issues',
      category: 'diagnostic',
      requiredContext: ['currentMetrics', 'historicalTrends', 'activeAlerts'],
      template: `Diagnose performance for {{venue.name}}:

Current Metrics:
- Revenue: ${{revenue.today}} (Growth: {{trends.revenueGrowth}}%)
- Customers: {{customers.today}} (Growth: {{trends.customerGrowth}}%)
- Transactions: {{transactions.today}}

Active Issues:
{{alerts.list}}

Please diagnose:
1. Root causes of any performance issues
2. Correlation between different metrics
3. External factors that might be impacting performance
4. Priority order for addressing issues
5. Quick wins vs long-term improvements`,
    });

    // Action Planning Templates
    this.addTemplate({
      id: 'daily-action-plan',
      name: 'Daily Action Plan',
      description: 'Create prioritized action plan for the day',
      category: 'recommendation',
      requiredContext: ['currentMetrics', 'activeAlerts', 'availableActions'],
      template: `Create a daily action plan for {{venue.name}}:

Current Status:
- Revenue: ${{revenue.today}}
- Active Alerts: {{alerts.count}}

Available Actions:
{{actions.list}}

Create a prioritized action plan:
1. Top 3 immediate actions (next 2 hours)
2. Mid-day adjustments (lunch/dinner prep)
3. End-of-day optimizations
4. Expected impact of each action
5. Success metrics to monitor`,
    });

    // Comparative Analysis Templates
    this.addTemplate({
      id: 'period-comparison',
      name: 'Period Comparison Analysis',
      description: 'Compare performance across time periods',
      category: 'analysis',
      requiredContext: ['historicalTrends'],
      parameters: {
        period1: 'This Week',
        period2: 'Last Week',
      },
      template: `Compare performance between {{params.period1}} and {{params.period2}} for {{venue.name}}:

Current Trends:
- Revenue Growth: {{trends.revenueGrowth}}%
- Customer Growth: {{trends.customerGrowth}}%

Analyze:
1. Key differences between periods
2. Factors contributing to changes
3. Successful strategies to repeat
4. Areas needing improvement
5. Recommendations for the upcoming period`,
    });

    // Custom Query Template
    this.addTemplate({
      id: 'custom-analysis',
      name: 'Custom Analysis',
      description: 'Open-ended analysis based on user query',
      category: 'analysis',
      requiredContext: ['currentMetrics', 'historicalTrends'],
      parameters: {
        focus: 'general',
      },
      template: `Analyze {{venue.name}} with focus on {{params.focus}}:

Context:
- Type: {{venue.type}}
- Today's Performance: ${{revenue.today}} revenue, {{customers.today}} customers
- Recent Trends: {{trends.revenueGrowth}}% revenue growth
- Peak Activity: {{trends.peakHours}}

Provide comprehensive analysis addressing the specific focus area.`,
    });
  }

  /**
   * Add a template to the collection
   */
  private addTemplate(template: PromptTemplate) {
    this.templates.set(template.id, template);
  }

  /**
   * Get template suggestions based on context
   */
  suggestTemplates(context: AIContext): PromptTemplate[] {
    const suggestions: PromptTemplate[] = [];

    // Suggest alert response if there are active alerts
    if (context.activeAlerts.length > 0) {
      const alertTemplate = this.templates.get('alert-response');
      if (alertTemplate) suggestions.push(alertTemplate);
    }

    // Suggest revenue analysis if revenue is down
    if (context.historicalTrends.revenueGrowth < 0) {
      const revenueTemplate = this.templates.get('revenue-analysis');
      if (revenueTemplate) suggestions.push(revenueTemplate);
    }

    // Suggest customer analysis if customer growth is negative
    if (context.historicalTrends.customerGrowth < 0) {
      const customerTemplate = this.templates.get('customer-behavior');
      if (customerTemplate) suggestions.push(customerTemplate);
    }

    // Suggest event optimization if there are active events
    if (context.currentMetrics.activeEvents > 0) {
      const eventTemplate = this.templates.get('event-optimization');
      if (eventTemplate) suggestions.push(eventTemplate);
    }

    // Always include daily action plan
    const actionPlanTemplate = this.templates.get('daily-action-plan');
    if (actionPlanTemplate) suggestions.push(actionPlanTemplate);

    return suggestions;
  }

  /**
   * Validate context has required fields for template
   */
  validateContext(templateId: string, context: Partial<AIContext>): boolean {
    const template = this.templates.get(templateId);
    if (!template) return false;

    return template.requiredContext.every(field => field in context);
  }
}
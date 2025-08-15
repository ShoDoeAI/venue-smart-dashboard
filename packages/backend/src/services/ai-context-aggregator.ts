import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

import type { AIContext } from './claude-ai';
import { KPICalculator } from './kpi-calculator';
import { ToastAnalytics } from './toast-analytics';

export interface AlertRule {
  id: string;
  type: string;
  metric: string;
  condition: 'above' | 'below' | 'equals' | 'change';
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export class AIContextAggregator {
  private kpiCalculator: KPICalculator;
  private toastAnalytics: ToastAnalytics;

  constructor(private supabase: SupabaseClient<Database>) {
    this.kpiCalculator = new KPICalculator(supabase);
    this.toastAnalytics = new ToastAnalytics(supabase);
  }

  /**
   * Build complete AI context for a venue
   */
  async buildContext(venueId: string): Promise<AIContext> {
    // Fetch venue details
    const venue = await this.getVenueDetails(venueId);

    // Get current metrics
    const currentMetrics = await this.getCurrentMetrics(venueId);

    // Calculate historical trends
    const historicalTrends = await this.getHistoricalTrends(venueId);

    // Check for active alerts
    const activeAlerts = await this.checkAlerts(venueId, currentMetrics, historicalTrends);

    // Get available actions based on integrated services
    const availableActions = await this.getAvailableActions(venueId);

    return {
      venue,
      currentMetrics,
      historicalTrends,
      activeAlerts,
      availableActions,
    };
  }

  /**
   * Get venue details
   */
  private async getVenueDetails(venueId: string) {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error || !data) {
      throw new Error('Venue not found');
    }

    return {
      id: data.id,
      name: data.name,
      type: 'restaurant', // Default to restaurant
    };
  }

  /**
   * Get current real-time metrics
   */
  private async getCurrentMetrics(venueId: string) {
    const realtimeMetrics = await this.kpiCalculator.calculateRealtimeMetrics(venueId);

    return {
      todayRevenue: realtimeMetrics.todayRevenue,
      todayTransactions: realtimeMetrics.todayTransactions,
      todayCustomers: realtimeMetrics.todayCustomers,
      lastHourRevenue: realtimeMetrics.lastHourRevenue,
      activeEvents: realtimeMetrics.activeEvents,
    };
  }

  /**
   * Calculate historical trends
   */
  private async getHistoricalTrends(venueId: string) {
    // Get last 30 days of daily KPIs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyKPIs, error } = await this.supabase
      .from('daily_kpis')
      .select('*')
      .eq('venue_id', venueId)
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: true });

    if (error || !dailyKPIs || dailyKPIs.length === 0) {
      return {
        revenueGrowth: 0,
        customerGrowth: 0,
        averageTicketPrice: 0,
        peakHours: [12, 18, 19], // Default peak hours
      };
    }

    // Calculate week-over-week revenue growth
    const lastWeekRevenue = dailyKPIs
      .slice(-7)
      .reduce((sum, day) => sum + (day.revenue_total || 0), 0);
    
    const previousWeekRevenue = dailyKPIs
      .slice(-14, -7)
      .reduce((sum, day) => sum + (day.revenue_total || 0), 0);

    const revenueGrowth = previousWeekRevenue > 0
      ? ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
      : 0;

    // Calculate customer growth
    const lastWeekCustomers = dailyKPIs
      .slice(-7)
      .reduce((sum, day) => sum + (day.unique_customers || 0), 0);
    
    const previousWeekCustomers = dailyKPIs
      .slice(-14, -7)
      .reduce((sum, day) => sum + (day.unique_customers || 0), 0);

    const customerGrowth = previousWeekCustomers > 0
      ? ((lastWeekCustomers - previousWeekCustomers) / previousWeekCustomers) * 100
      : 0;

    // Calculate average ticket price
    const totalRevenue = dailyKPIs.reduce((sum, day) => sum + (day.revenue_total || 0), 0);
    const totalTransactions = dailyKPIs.reduce((sum, day) => sum + (day.transaction_count || 0), 0);
    const averageTicketPrice = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Find peak hours from metadata
    const hourlyData = new Map<number, number>();
    dailyKPIs.forEach(day => {
      if (day.metadata?.revenue?.byHour) {
        day.metadata.revenue.byHour.forEach((hourData: any) => {
          hourlyData.set(
            hourData.hour,
            (hourlyData.get(hourData.hour) || 0) + hourData.amount
          );
        });
      }
    });

    const peakHours = Array.from(hourlyData.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour)
      .sort((a, b) => a - b);

    return {
      revenueGrowth,
      customerGrowth,
      averageTicketPrice,
      peakHours: peakHours.length > 0 ? peakHours : [12, 18, 19],
    };
  }

  /**
   * Check for active alerts based on rules
   */
  private async checkAlerts(
    venueId: string,
    currentMetrics: any,
    historicalTrends: any
  ): Promise<AIContext['activeAlerts']> {
    const alerts: AIContext['activeAlerts'] = [];

    // Define alert rules
    const alertRules: AlertRule[] = [
      {
        id: 'low-revenue',
        type: 'Revenue Alert',
        metric: 'hourly_revenue',
        condition: 'below',
        threshold: 100, // $100 per hour minimum
        severity: 'medium',
        description: 'Hourly revenue below threshold',
      },
      {
        id: 'negative-growth',
        type: 'Growth Alert',
        metric: 'revenue_growth',
        condition: 'below',
        threshold: -10, // More than 10% decline
        severity: 'high',
        description: 'Significant revenue decline',
      },
      {
        id: 'low-transactions',
        type: 'Transaction Alert',
        metric: 'transaction_count',
        condition: 'below',
        threshold: 5, // Less than 5 transactions in last hour
        severity: 'low',
        description: 'Low transaction volume',
      },
      {
        id: 'customer-decline',
        type: 'Customer Alert',
        metric: 'customer_growth',
        condition: 'below',
        threshold: -5, // More than 5% decline
        severity: 'medium',
        description: 'Customer count declining',
      },
    ];

    // Check each rule
    for (const rule of alertRules) {
      let currentValue: number = 0;
      let triggered = false;

      switch (rule.metric) {
        case 'hourly_revenue':
          currentValue = currentMetrics.lastHourRevenue;
          triggered = rule.condition === 'below' && currentValue < rule.threshold;
          break;

        case 'revenue_growth':
          currentValue = historicalTrends.revenueGrowth;
          triggered = rule.condition === 'below' && currentValue < rule.threshold;
          break;

        case 'transaction_count':
          // Calculate transactions in last hour
          const { data: recentTransactions } = await this.supabase
            .from('toast_transactions')
            .select('id', { count: 'exact', head: true })
            .gte('transaction_date', new Date(Date.now() - 60 * 60 * 1000).toISOString());
          
          currentValue = recentTransactions?.length || 0;
          triggered = rule.condition === 'below' && currentValue < rule.threshold;
          break;

        case 'customer_growth':
          currentValue = historicalTrends.customerGrowth;
          triggered = rule.condition === 'below' && currentValue < rule.threshold;
          break;
      }

      if (triggered) {
        alerts.push({
          type: rule.type,
          severity: rule.severity,
          message: `${rule.description}: ${currentValue.toFixed(1)} (threshold: ${rule.threshold})`,
          metric: rule.metric,
          currentValue,
          threshold: rule.threshold,
        });
      }
    }

    // Check for event-specific alerts
    const upcomingEvents = await this.checkEventAlerts(venueId);
    alerts.push(...upcomingEvents);

    return alerts;
  }

  /**
   * Check for event-specific alerts
   */
  private async checkEventAlerts(_venueId: string): Promise<AIContext['activeAlerts']> {
    const alerts: AIContext['activeAlerts'] = [];

    // Check Eventbrite events
    const { data: eventbriteEvents } = await this.supabase
      .from('eventbrite_transactions')
      .select('event_id, event_name')
      .gte('transaction_date', new Date().toISOString())
      .limit(10);

    // Check OpenDate shows
    const { data: _opendateShows } = await this.supabase
      .from('opendate_transactions')
      .select('confirm_id, event_name')
      .gte('transaction_date', new Date().toISOString())
      .limit(10);

    // Analyze event performance
    // (Simplified for demo - would have more complex logic in production)
    if (eventbriteEvents && eventbriteEvents.length > 0) {
      const eventMap = new Map<string, number>();
      eventbriteEvents.forEach(e => {
        if (e.event_id) {
          eventMap.set(e.event_id, (eventMap.get(e.event_id) || 0) + 1);
        }
      });

      // Check for low ticket sales
      eventMap.forEach((count, _eventId) => {
        if (count < 10) {
          alerts.push({
            type: 'Event Alert',
            severity: 'medium',
            message: `Low ticket sales for upcoming event`,
            metric: 'event_tickets',
            currentValue: count,
            threshold: 10,
          });
        }
      });
    }

    return alerts;
  }

  /**
   * Get available actions based on integrated services
   */
  private async getAvailableActions(venueId: string): Promise<AIContext['availableActions']> {
    const actions: AIContext['availableActions'] = [];

    // Check which services are integrated
    const { data: credentials } = await this.supabase
      .from('api_credentials')
      .select('service')
      .eq('venue_id', venueId);

    const integratedServices = new Set(credentials?.map(c => c.service) || []);

    // Toast POS actions
    if (integratedServices.has('toast')) {
      actions.push(
        {
          service: 'toast',
          actionType: 'update_item_price',
          description: 'Update menu item price',
        },
        {
          service: 'toast',
          actionType: 'toggle_item_availability',
          description: 'Enable or disable menu item',
        },
        {
          service: 'toast',
          actionType: 'create_discount',
          description: 'Create a discount or promotion',
        }
      );
    }

    // Eventbrite actions
    if (integratedServices.has('eventbrite')) {
      actions.push(
        {
          service: 'eventbrite',
          actionType: 'update_capacity',
          description: 'Change event capacity',
        },
        {
          service: 'eventbrite',
          actionType: 'adjust_ticket_price',
          description: 'Modify ticket pricing',
        },
        {
          service: 'eventbrite',
          actionType: 'create_promo_code',
          description: 'Create promotional discount code',
        },
        {
          service: 'eventbrite',
          actionType: 'extend_sale_period',
          description: 'Extend ticket sale deadline',
        }
      );
    }

    // OpenDate.io actions
    if (integratedServices.has('opendate')) {
      actions.push(
        {
          service: 'opendate',
          actionType: 'update_show_capacity',
          description: 'Adjust venue capacity for show',
        },
        {
          service: 'opendate',
          actionType: 'modify_ticket_tiers',
          description: 'Change ticket tier pricing',
        },
        {
          service: 'opendate',
          actionType: 'send_fan_message',
          description: 'Send targeted message to fans',
        }
      );
    }

    return actions;
  }

  /**
   * Get summarized context for specific time period with detailed historical data
   */
  async getTimeRangeContext(
    venueId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Partial<AIContext>> {
    // First try to get pre-calculated daily KPIs
    const { data: dailyKPIs } = await this.supabase
      .from('daily_kpis')
      .select('*')
      .eq('venue_id', venueId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    // If no pre-calculated KPIs, calculate from raw transactions
    if (!dailyKPIs || dailyKPIs.length === 0) {
      const rawMetrics = await this.calculateRawMetricsForPeriod(venueId, startDate, endDate);
      return rawMetrics;
    }

    // Calculate summary metrics from daily KPIs
    const totalRevenue = dailyKPIs.reduce((sum, day) => sum + (day.revenue_total || 0), 0);
    const totalTransactions = dailyKPIs.reduce((sum, day) => sum + (day.transaction_count || 0), 0);
    const totalCustomers = dailyKPIs.reduce((sum, day) => sum + (day.unique_customers || 0), 0);
    const avgDailyRevenue = totalRevenue / dailyKPIs.length;

    // Calculate period-over-period growth
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const comparisonStartDate = new Date(startDate);
    comparisonStartDate.setDate(comparisonStartDate.getDate() - periodDays);
    
    const { data: comparisonKPIs } = await this.supabase
      .from('daily_kpis')
      .select('*')
      .eq('venue_id', venueId)
      .gte('date', comparisonStartDate.toISOString())
      .lt('date', startDate.toISOString());

    const comparisonRevenue = comparisonKPIs ? 
      comparisonKPIs.reduce((sum, day) => sum + (day.revenue_total || 0), 0) : 0;
    const comparisonCustomers = comparisonKPIs ? 
      comparisonKPIs.reduce((sum, day) => sum + (day.unique_customers || 0), 0) : 0;

    const revenueGrowth = comparisonRevenue > 0 ? 
      ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100 : 0;
    const customerGrowth = comparisonCustomers > 0 ? 
      ((totalCustomers - comparisonCustomers) / comparisonCustomers) * 100 : 0;

    return {
      historicalTrends: {
        revenueGrowth,
        customerGrowth,
        averageTicketPrice: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        peakHours: [12, 18, 19], // Would analyze from hourly data
      },
      currentMetrics: {
        todayRevenue: totalRevenue,
        todayTransactions: totalTransactions,
        todayCustomers: totalCustomers,
        lastHourRevenue: 0, // Not applicable for historical periods
        activeEvents: 0, // Not applicable for historical periods
      },
      timeRangeSummary: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays: periodDays,
        totalRevenue,
        totalTransactions,
        totalCustomers,
        avgDailyRevenue,
        bestDay: dailyKPIs.reduce((best, day) => 
          (day.revenue_total || 0) > (best.revenue_total || 0) ? day : best
        ),
        worstDay: dailyKPIs.reduce((worst, day) => 
          (day.revenue_total || 0) < (worst.revenue_total || 0) ? day : worst
        ),
      },
    };
  }

  /**
   * Calculate metrics directly from raw transaction data when KPIs aren't available
   */
  private async calculateRawMetricsForPeriod(
    venueId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Partial<AIContext>> {
    // Get venue's location ID for Toast transactions
    const { data: credentials } = await this.supabase
      .from('api_credentials')
      .select('credentials')
      .eq('venue_id', venueId)
      .eq('service_name', 'toast')
      .eq('is_active', true)
      .single();

    if (!credentials?.credentials?.locationGuid) {
      return {};
    }

    const locationId = credentials.credentials.locationGuid;

    // Query Toast transactions directly using the new views
    const { data: dailySummary } = await this.supabase
      .from('daily_revenue_summary')
      .select('*')
      .eq('location_id', locationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!dailySummary || dailySummary.length === 0) {
      return {};
    }

    // Calculate aggregated metrics
    const totalRevenue = dailySummary.reduce((sum, day) => sum + (day.total_revenue || 0), 0);
    const totalTransactions = dailySummary.reduce((sum, day) => sum + (day.transaction_count || 0), 0);
    const totalCustomers = dailySummary.reduce((sum, day) => sum + (day.unique_customers || 0), 0);
    const avgDailyRevenue = totalRevenue / dailySummary.length;

    // Find best and worst performing days
    const bestDay = dailySummary.reduce((best, day) => 
      (day.total_revenue || 0) > (best.total_revenue || 0) ? day : best
    );
    const worstDay = dailySummary.reduce((worst, day) => 
      (day.total_revenue || 0) < (worst.total_revenue || 0) ? day : worst
    );

    return {
      currentMetrics: {
        todayRevenue: totalRevenue,
        todayTransactions: totalTransactions,
        todayCustomers: totalCustomers,
        lastHourRevenue: 0,
        activeEvents: 0,
      },
      historicalTrends: {
        revenueGrowth: 0, // Would need comparison period
        customerGrowth: 0,
        averageTicketPrice: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        peakHours: [12, 18, 19],
      },
      timeRangeSummary: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays: dailySummary.length,
        totalRevenue,
        totalTransactions,
        totalCustomers,
        avgDailyRevenue,
        bestDay: {
          date: bestDay.date,
          revenue_total: bestDay.total_revenue,
          transaction_count: bestDay.transaction_count,
        },
        worstDay: {
          date: worstDay.date,
          revenue_total: worstDay.total_revenue,
          transaction_count: worstDay.transaction_count,
        },
      },
    };
  }

  /**
   * Build enhanced context with Toast analytics based on query type
   */
  async buildEnhancedContext(
    venueId: string,
    queryType: 'revenue' | 'menu' | 'customers' | 'labor' | 'general',
    startDate?: Date,
    endDate?: Date
  ): Promise<AIContext & { toastAnalytics?: any }> {
    // Get base context
    const baseContext = await this.buildContext(venueId);
    
    // Get location ID for Toast data
    const { data: credentials } = await this.supabase
      .from('api_credentials')
      .select('credentials')
      .eq('venue_id', venueId)
      .eq('service', 'toast')
      .single();
    
    if (!credentials?.credentials?.locationGuid) {
      return baseContext;
    }
    
    const locationId = credentials.credentials.locationGuid;
    const now = new Date();
    const defaultStart = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defaultEnd = endDate || now;
    
    const toastAnalytics: any = {};
    
    switch (queryType) {
      case 'revenue':
        // Get comparative metrics
        const comparative = await this.toastAnalytics.getComparativeMetrics(
          locationId,
          defaultStart,
          defaultEnd,
          'previous_period'
        );
        toastAnalytics.comparative = comparative;
        
        // Get hourly patterns
        const { data: hourlyRevenue } = await this.supabase
          .from('toast_checks')
          .select('created_date, total_amount')
          .gte('created_date', defaultStart.toISOString())
          .lte('created_date', defaultEnd.toISOString())
          .eq('voided', false);
        
        const hourlyPattern = new Map<number, number>();
        hourlyRevenue?.forEach(check => {
          const hour = new Date(check.created_date).getHours();
          hourlyPattern.set(hour, (hourlyPattern.get(hour) || 0) + (check.total_amount || 0));
        });
        
        toastAnalytics.hourlyPattern = Array.from(hourlyPattern.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([hour, revenue]) => ({ hour, revenue }));
        break;
        
      case 'menu':
        // Get menu performance
        const menuPerformance = await this.toastAnalytics.analyzeMenuPerformance(
          locationId,
          defaultStart,
          defaultEnd
        );
        toastAnalytics.menuPerformance = menuPerformance;
        
        // Get pour cost analysis if asking about drinks
        const pourCost = await this.toastAnalytics.analyzePourCost(
          locationId,
          defaultStart,
          defaultEnd
        );
        toastAnalytics.pourCost = pourCost;
        break;
        
      case 'customers':
        // Get customer analysis
        const customerAnalysis = await this.toastAnalytics.analyzeCustomers(
          locationId,
          defaultStart,
          defaultEnd
        );
        toastAnalytics.customers = customerAnalysis;
        break;
        
      case 'labor':
        // Get labor analysis
        const laborAnalysis = await this.toastAnalytics.analyzeLaborCost(
          locationId,
          defaultStart
        );
        toastAnalytics.labor = laborAnalysis;
        break;
        
      case 'general':
      default:
        // Get a bit of everything for general context
        const generalComparative = await this.toastAnalytics.getComparativeMetrics(
          locationId,
          defaultStart,
          defaultEnd,
          'previous_period'
        );
        toastAnalytics.comparative = generalComparative;
        
        const topItems = await this.toastAnalytics.analyzeMenuPerformance(
          locationId,
          defaultStart,
          defaultEnd
        );
        toastAnalytics.topMenuItems = topItems.slice(0, 5);
        break;
    }
    
    return {
      ...baseContext,
      toastAnalytics
    };
  }

  /**
   * Get context focused on specific metric
   */
  async getMetricContext(
    venueId: string,
    metric: 'revenue' | 'customers' | 'events' | 'inventory'
  ): Promise<Partial<AIContext>> {
    const baseContext = await this.buildContext(venueId);

    // Filter context based on metric focus
    switch (metric) {
      case 'revenue':
        return {
          venue: baseContext.venue,
          currentMetrics: {
            todayRevenue: baseContext.currentMetrics.todayRevenue,
            todayTransactions: baseContext.currentMetrics.todayTransactions,
            lastHourRevenue: baseContext.currentMetrics.lastHourRevenue,
            todayCustomers: 0,
            activeEvents: 0,
          },
          historicalTrends: {
            revenueGrowth: baseContext.historicalTrends.revenueGrowth,
            averageTicketPrice: baseContext.historicalTrends.averageTicketPrice,
            customerGrowth: 0,
            peakHours: baseContext.historicalTrends.peakHours,
          },
          activeAlerts: baseContext.activeAlerts.filter(a => 
            a.type.includes('Revenue') || a.type.includes('Transaction')
          ),
          availableActions: baseContext.availableActions.filter(a =>
            a.actionType.includes('price') || a.actionType.includes('discount')
          ),
        };

      case 'customers':
        return {
          venue: baseContext.venue,
          currentMetrics: {
            todayCustomers: baseContext.currentMetrics.todayCustomers,
            todayTransactions: baseContext.currentMetrics.todayTransactions,
            todayRevenue: 0,
            lastHourRevenue: 0,
            activeEvents: 0,
          },
          historicalTrends: {
            customerGrowth: baseContext.historicalTrends.customerGrowth,
            revenueGrowth: 0,
            averageTicketPrice: 0,
            peakHours: baseContext.historicalTrends.peakHours,
          },
          activeAlerts: baseContext.activeAlerts.filter(a => 
            a.type.includes('Customer')
          ),
          availableActions: baseContext.availableActions.filter(a =>
            a.actionType.includes('message') || a.actionType.includes('promo')
          ),
        };

      case 'events':
        return {
          venue: baseContext.venue,
          currentMetrics: {
            activeEvents: baseContext.currentMetrics.activeEvents,
            todayRevenue: 0,
            todayTransactions: 0,
            todayCustomers: 0,
            lastHourRevenue: 0,
          },
          historicalTrends: baseContext.historicalTrends,
          activeAlerts: baseContext.activeAlerts.filter(a => 
            a.type.includes('Event')
          ),
          availableActions: baseContext.availableActions.filter(a =>
            a.service === 'eventbrite' || a.service === 'opendate'
          ),
        };

      default:
        return baseContext;
    }
  }
}
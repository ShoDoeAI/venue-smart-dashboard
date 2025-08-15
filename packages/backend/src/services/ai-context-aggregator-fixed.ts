import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

import type { AIContext } from './claude-ai';
import { KPICalculator } from './kpi-calculator';

export class AIContextAggregatorFixed {
  private kpiCalculator: KPICalculator;

  constructor(private supabase: SupabaseClient<Database>) {
    this.kpiCalculator = new KPICalculator(supabase);
  }

  /**
   * Build enhanced context with actual Toast data from database
   */
  async buildEnhancedContext(
    venueId: string,
    queryType: 'revenue' | 'menu' | 'customers' | 'labor' | 'general',
    startDate?: Date,
    endDate?: Date
  ): Promise<AIContext & { toastAnalytics?: any }> {
    // Get base context
    const baseContext = await this.buildBasicContext(venueId);
    
    const now = new Date();
    const defaultStart = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defaultEnd = endDate || now;
    
    // Get actual revenue data from our database (including overrides)
    const toastAnalytics: any = {};
    
    // For any query type, include revenue data
    const startStr = defaultStart.toISOString().split('T')[0];
    const endStr = defaultEnd.toISOString().split('T')[0];
    
    // Get revenue overrides first
    const { data: overrides } = await this.supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });
    
    // Get transactions from simple_transactions
    const { data: transactions } = await this.supabase
      .from('simple_transactions')
      .select('*')
      .gte('transaction_date', defaultStart.toISOString())
      .lte('transaction_date', defaultEnd.toISOString())
      .order('transaction_date', { ascending: true });
    
    // Build daily revenue map with overrides
    const dailyRevenue = new Map<string, { revenue: number; transactions: number; hasOverride: boolean }>();
    
    // First, add transaction data
    transactions?.forEach(t => {
      const date = new Date(t.transaction_date).toISOString().split('T')[0];
      if (!dailyRevenue.has(date)) {
        dailyRevenue.set(date, { revenue: 0, transactions: 0, hasOverride: false });
      }
      const day = dailyRevenue.get(date)!;
      day.revenue += t.amount || 0;
      day.transactions += 1;
    });
    
    // Then apply overrides
    overrides?.forEach(override => {
      dailyRevenue.set(override.date, {
        revenue: override.actual_revenue,
        transactions: override.check_count || dailyRevenue.get(override.date)?.transactions || 0,
        hasOverride: true
      });
    });
    
    // Calculate totals
    let totalRevenue = 0;
    let totalTransactions = 0;
    const dailyBreakdown: any[] = [];
    
    dailyRevenue.forEach((data, date) => {
      totalRevenue += data.revenue;
      totalTransactions += data.transactions;
      dailyBreakdown.push({
        date,
        revenue: data.revenue,
        transactions: data.transactions,
        hasOverride: data.hasOverride
      });
    });
    
    // Add analytics data
    toastAnalytics.periodSummary = {
      startDate: startStr,
      endDate: endStr,
      totalRevenue,
      totalTransactions,
      avgDailyRevenue: dailyBreakdown.length > 0 ? totalRevenue / dailyBreakdown.length : 0,
      dailyBreakdown
    };
    
    // For revenue queries, add more detail
    if (queryType === 'revenue') {
      // Get hourly breakdown for the period
      const { data: checks } = await this.supabase
        .from('toast_checks')
        .select('created_date, total_amount')
        .gte('created_date', defaultStart.toISOString())
        .lte('created_date', defaultEnd.toISOString())
        .eq('voided', false);
      
      const hourlyPattern = new Map<number, number>();
      checks?.forEach(check => {
        const hour = new Date(check.created_date).getHours();
        hourlyPattern.set(hour, (hourlyPattern.get(hour) || 0) + (check.total_amount || 0));
      });
      
      toastAnalytics.hourlyPattern = Array.from(hourlyPattern.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([hour, revenue]) => ({ hour, revenue }));
    }
    
    // For menu queries, get top items
    if (queryType === 'menu') {
      const { data: selections } = await this.supabase
        .from('toast_selections')
        .select('item_name, quantity, price')
        .gte('snapshot_timestamp', defaultStart.toISOString())
        .lte('snapshot_timestamp', defaultEnd.toISOString())
        .not('item_name', 'is', null);
      
      const itemMap = new Map<string, { quantity: number; revenue: number }>();
      selections?.forEach(sel => {
        const name = sel.item_name || 'Unknown';
        if (!itemMap.has(name)) {
          itemMap.set(name, { quantity: 0, revenue: 0 });
        }
        const item = itemMap.get(name)!;
        item.quantity += sel.quantity || 1;
        item.revenue += ((sel.price || 0) / 100) * (sel.quantity || 1);
      });
      
      toastAnalytics.topMenuItems = Array.from(itemMap.entries())
        .map(([name, data]) => ({
          itemName: name,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    }
    
    return {
      ...baseContext,
      toastAnalytics
    };
  }

  /**
   * Build basic context
   */
  private async buildBasicContext(venueId: string): Promise<AIContext> {
    // Simplified version - just return basic structure
    const venue = {
      id: venueId,
      name: "Jack's Bar & Grill",
      type: 'Bar & Restaurant'
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get today's data
    const { data: todayData } = await this.supabase
      .from('simple_transactions')
      .select('amount')
      .gte('transaction_date', todayStart.toISOString());
    
    const todayRevenue = todayData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const todayTransactions = todayData?.length || 0;

    return {
      venue,
      currentMetrics: {
        todayRevenue,
        todayTransactions,
        todayCustomers: todayTransactions, // Simplified
        lastHourRevenue: 0,
        activeEvents: 0,
      },
      historicalTrends: {
        revenueGrowth: 0,
        customerGrowth: 0,
        averageTicketPrice: todayTransactions > 0 ? todayRevenue / todayTransactions : 0,
        peakHours: [18, 19, 20],
      },
      activeAlerts: [],
      availableActions: [],
    };
  }
}
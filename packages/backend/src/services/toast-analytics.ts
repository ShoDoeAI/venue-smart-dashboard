import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

export interface MenuItemPerformance {
  itemName: string;
  quantity: number;
  revenue: number;
  avgPrice: number;
  percentOfRevenue: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PourCostAnalysis {
  currentPourCost: number;
  previousPourCost: number;
  change: number;
  topSpillers: Array<{
    itemName: string;
    theoreticalCost: number;
    actualCost: number;
    variance: number;
  }>;
}

export interface LaborAnalysis {
  laborCost: number;
  laborPercentage: number;
  salesPerLaborHour: number;
  overstaffedHours: number[];
  understaffedHours: number[];
}

export interface CustomerAnalysis {
  newCustomers: number;
  returningCustomers: number;
  averageVisitsPerCustomer: number;
  topCustomers: Array<{
    name: string;
    visits: number;
    totalSpent: number;
    avgCheck: number;
  }>;
}

export class ToastAnalytics {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Analyze menu item performance for a given period
   */
  async analyzeMenuPerformance(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MenuItemPerformance[]> {
    // Get all selections for the period
    const { data: selections } = await this.supabase
      .from('toast_selections')
      .select(`
        *,
        toast_checks!inner(
          total_amount,
          created_date,
          voided
        )
      `)
      .gte('toast_checks.created_date', startDate.toISOString())
      .lte('toast_checks.created_date', endDate.toISOString())
      .eq('toast_checks.voided', false);

    if (!selections || selections.length === 0) {
      return [];
    }

    // Group by item and calculate metrics
    const itemMap = new Map<string, {
      quantity: number;
      revenue: number;
      prices: number[];
    }>();

    let totalRevenue = 0;

    selections.forEach(selection => {
      const itemName = selection.item_name || 'Unknown Item';
      const price = (selection.price || 0) / 100; // Convert cents to dollars
      
      if (!itemMap.has(itemName)) {
        itemMap.set(itemName, { quantity: 0, revenue: 0, prices: [] });
      }
      
      const item = itemMap.get(itemName)!;
      item.quantity += selection.quantity || 1;
      item.revenue += price * (selection.quantity || 1);
      item.prices.push(price);
      totalRevenue += price * (selection.quantity || 1);
    });

    // Get previous period for trend analysis
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - (endDate.getDate() - startDate.getDate()));
    
    const { data: previousSelections } = await this.supabase
      .from('toast_selections')
      .select('item_name, quantity')
      .gte('snapshot_timestamp', previousStartDate.toISOString())
      .lt('snapshot_timestamp', startDate.toISOString());

    const previousQuantities = new Map<string, number>();
    previousSelections?.forEach(sel => {
      const name = sel.item_name || 'Unknown Item';
      previousQuantities.set(name, (previousQuantities.get(name) || 0) + (sel.quantity || 1));
    });

    // Convert to array and calculate trends
    const performance: MenuItemPerformance[] = Array.from(itemMap.entries())
      .map(([itemName, data]) => {
        const avgPrice = data.revenue / data.quantity;
        const percentOfRevenue = (data.revenue / totalRevenue) * 100;
        const previousQty = previousQuantities.get(itemName) || 0;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (previousQty > 0) {
          const change = ((data.quantity - previousQty) / previousQty) * 100;
          if (change > 10) trend = 'up';
          else if (change < -10) trend = 'down';
        }

        return {
          itemName,
          quantity: data.quantity,
          revenue: data.revenue,
          avgPrice,
          percentOfRevenue,
          trend
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50); // Top 50 items

    return performance;
  }

  /**
   * Calculate pour cost and identify variances
   */
  async analyzePourCost(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PourCostAnalysis> {
    // This would integrate with inventory data from WISK
    // For now, we'll estimate based on typical margins
    
    const { data: alcoholSelections } = await this.supabase
      .from('toast_selections')
      .select('*')
      .gte('snapshot_timestamp', startDate.toISOString())
      .lte('snapshot_timestamp', endDate.toISOString())
      .or('sales_category_name.ilike.%alcohol%,sales_category_name.ilike.%beer%,sales_category_name.ilike.%wine%,sales_category_name.ilike.%liquor%');

    if (!alcoholSelections || alcoholSelections.length === 0) {
      return {
        currentPourCost: 0,
        previousPourCost: 0,
        change: 0,
        topSpillers: []
      };
    }

    // Calculate theoretical pour cost (industry standard)
    const totalRevenue = alcoholSelections.reduce((sum, sel) => 
      sum + ((sel.price || 0) / 100) * (sel.quantity || 1), 0
    );
    
    // Estimate based on category
    let totalCost = 0;
    const itemCosts = new Map<string, { theoretical: number; actual: number; revenue: number }>();

    alcoholSelections.forEach(sel => {
      const revenue = ((sel.price || 0) / 100) * (sel.quantity || 1);
      const category = sel.sales_category_name?.toLowerCase() || '';
      
      // Industry standard pour costs
      let targetCost = 0.25; // 25% default
      if (category.includes('beer')) targetCost = 0.20; // 20% for beer
      else if (category.includes('wine')) targetCost = 0.30; // 30% for wine
      else if (category.includes('liquor')) targetCost = 0.18; // 18% for liquor
      
      const theoreticalCost = revenue * targetCost;
      const actualCost = revenue * (targetCost * 1.15); // Assume 15% overpour
      
      totalCost += actualCost;
      
      const itemName = sel.item_name || 'Unknown';
      if (!itemCosts.has(itemName)) {
        itemCosts.set(itemName, { theoretical: 0, actual: 0, revenue: 0 });
      }
      const item = itemCosts.get(itemName)!;
      item.theoretical += theoreticalCost;
      item.actual += actualCost;
      item.revenue += revenue;
    });

    const currentPourCost = (totalCost / totalRevenue) * 100;
    
    // Get previous period pour cost
    const previousPourCost = currentPourCost * 0.95; // Placeholder - would calculate from previous period
    
    // Find top variance items
    const topSpillers = Array.from(itemCosts.entries())
      .map(([itemName, costs]) => ({
        itemName,
        theoreticalCost: costs.theoretical,
        actualCost: costs.actual,
        variance: ((costs.actual - costs.theoretical) / costs.theoretical) * 100
      }))
      .filter(item => item.variance > 5)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 10);

    return {
      currentPourCost,
      previousPourCost,
      change: currentPourCost - previousPourCost,
      topSpillers
    };
  }

  /**
   * Analyze labor costs and efficiency
   */
  async analyzeLaborCost(
    locationId: string,
    date: Date
  ): Promise<LaborAnalysis> {
    // Get hourly revenue for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: hourlyData } = await this.supabase
      .from('toast_checks')
      .select('created_date, total_amount')
      .gte('created_date', startOfDay.toISOString())
      .lte('created_date', endOfDay.toISOString())
      .eq('voided', false);

    if (!hourlyData || hourlyData.length === 0) {
      return {
        laborCost: 0,
        laborPercentage: 0,
        salesPerLaborHour: 0,
        overstaffedHours: [],
        understaffedHours: []
      };
    }

    // Group revenue by hour
    const hourlyRevenue = new Map<number, number>();
    hourlyData.forEach(check => {
      const hour = new Date(check.created_date).getHours();
      hourlyRevenue.set(hour, (hourlyRevenue.get(hour) || 0) + (check.total_amount || 0));
    });

    // Calculate total revenue
    const totalRevenue = Array.from(hourlyRevenue.values()).reduce((sum, rev) => sum + rev, 0);

    // Estimate labor cost (would integrate with scheduling system)
    // For now, use industry standard of 25-30% of revenue
    const laborCost = totalRevenue * 0.28;
    const laborPercentage = 28;

    // Estimate labor hours (average $15/hour)
    const laborHours = laborCost / 15;
    const salesPerLaborHour = totalRevenue / laborHours;

    // Identify staffing issues
    const overstaffedHours: number[] = [];
    const understaffedHours: number[] = [];

    hourlyRevenue.forEach((revenue, hour) => {
      const hourlyLaborTarget = revenue * 0.28;
      const targetStaff = Math.ceil(hourlyLaborTarget / 15);
      
      // Simple heuristic: if revenue < $200/hour, might be overstaffed
      // if revenue > $800/hour, might be understaffed
      if (revenue < 200 && targetStaff > 2) {
        overstaffedHours.push(hour);
      } else if (revenue > 800 && targetStaff < 5) {
        understaffedHours.push(hour);
      }
    });

    return {
      laborCost,
      laborPercentage,
      salesPerLaborHour,
      overstaffedHours,
      understaffedHours
    };
  }

  /**
   * Analyze customer patterns and loyalty
   */
  async analyzeCustomers(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CustomerAnalysis> {
    // Get all checks with customer info
    const { data: checks } = await this.supabase
      .from('toast_checks')
      .select('*')
      .gte('created_date', startDate.toISOString())
      .lte('created_date', endDate.toISOString())
      .eq('voided', false)
      .not('customer_email', 'is', null);

    if (!checks || checks.length === 0) {
      return {
        newCustomers: 0,
        returningCustomers: 0,
        averageVisitsPerCustomer: 0,
        topCustomers: []
      };
    }

    // Group by customer
    const customerMap = new Map<string, {
      name: string;
      visits: number;
      totalSpent: number;
      firstVisit: Date;
    }>();

    checks.forEach(check => {
      const email = check.customer_email;
      if (!email) return;

      if (!customerMap.has(email)) {
        customerMap.set(email, {
          name: `${check.customer_first_name || ''} ${check.customer_last_name || ''}`.trim() || 'Guest',
          visits: 0,
          totalSpent: 0,
          firstVisit: new Date(check.created_date)
        });
      }

      const customer = customerMap.get(email)!;
      customer.visits++;
      customer.totalSpent += check.total_amount || 0;
      
      const visitDate = new Date(check.created_date);
      if (visitDate < customer.firstVisit) {
        customer.firstVisit = visitDate;
      }
    });

    // Determine new vs returning
    const thirtyDaysAgo = new Date(startDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let newCustomers = 0;
    let returningCustomers = 0;

    customerMap.forEach(customer => {
      if (customer.firstVisit >= thirtyDaysAgo) {
        newCustomers++;
      } else {
        returningCustomers++;
      }
    });

    // Calculate average visits
    const totalVisits = Array.from(customerMap.values()).reduce((sum, c) => sum + c.visits, 0);
    const averageVisitsPerCustomer = totalVisits / customerMap.size;

    // Get top customers
    const topCustomers = Array.from(customerMap.entries())
      .map(([email, data]) => ({
        name: data.name,
        visits: data.visits,
        totalSpent: data.totalSpent,
        avgCheck: data.totalSpent / data.visits
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      newCustomers,
      returningCustomers,
      averageVisitsPerCustomer,
      topCustomers
    };
  }

  /**
   * Get comparative metrics for period-over-period analysis
   */
  async getComparativeMetrics(
    locationId: string,
    currentStart: Date,
    currentEnd: Date,
    compareType: 'previous_period' | 'last_year' | 'last_month'
  ): Promise<{
    current: { revenue: number; transactions: number; avgCheck: number };
    previous: { revenue: number; transactions: number; avgCheck: number };
    change: { revenue: number; transactions: number; avgCheck: number };
  }> {
    // Calculate comparison dates
    let compareStart: Date;
    let compareEnd: Date;

    const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));

    switch (compareType) {
      case 'previous_period':
        compareStart = new Date(currentStart);
        compareStart.setDate(compareStart.getDate() - daysDiff);
        compareEnd = new Date(currentStart);
        break;
      case 'last_year':
        compareStart = new Date(currentStart);
        compareStart.setFullYear(compareStart.getFullYear() - 1);
        compareEnd = new Date(currentEnd);
        compareEnd.setFullYear(compareEnd.getFullYear() - 1);
        break;
      case 'last_month':
        compareStart = new Date(currentStart);
        compareStart.setMonth(compareStart.getMonth() - 1);
        compareEnd = new Date(currentEnd);
        compareEnd.setMonth(compareEnd.getMonth() - 1);
        break;
    }

    // Get current period metrics
    const { data: currentChecks } = await this.supabase
      .from('toast_checks')
      .select('total_amount')
      .gte('created_date', currentStart.toISOString())
      .lte('created_date', currentEnd.toISOString())
      .eq('voided', false);

    const currentRevenue = currentChecks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    const currentTransactions = currentChecks?.length || 0;
    const currentAvgCheck = currentTransactions > 0 ? currentRevenue / currentTransactions : 0;

    // Get comparison period metrics
    const { data: previousChecks } = await this.supabase
      .from('toast_checks')
      .select('total_amount')
      .gte('created_date', compareStart.toISOString())
      .lte('created_date', compareEnd.toISOString())
      .eq('voided', false);

    const previousRevenue = previousChecks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    const previousTransactions = previousChecks?.length || 0;
    const previousAvgCheck = previousTransactions > 0 ? previousRevenue / previousTransactions : 0;

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ? 
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const transactionChange = previousTransactions > 0 ? 
      ((currentTransactions - previousTransactions) / previousTransactions) * 100 : 0;
    const avgCheckChange = previousAvgCheck > 0 ? 
      ((currentAvgCheck - previousAvgCheck) / previousAvgCheck) * 100 : 0;

    return {
      current: {
        revenue: currentRevenue,
        transactions: currentTransactions,
        avgCheck: currentAvgCheck
      },
      previous: {
        revenue: previousRevenue,
        transactions: previousTransactions,
        avgCheck: previousAvgCheck
      },
      change: {
        revenue: revenueChange,
        transactions: transactionChange,
        avgCheck: avgCheckChange
      }
    };
  }
}
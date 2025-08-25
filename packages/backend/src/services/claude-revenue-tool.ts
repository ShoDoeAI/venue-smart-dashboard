import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

export interface RevenueQueryToolParams {
  query: string;
  venueId?: string;
}

export interface RevenueQueryResult {
  success: boolean;
  data?: {
    totalRevenue: number;
    periodStart: string;
    periodEnd: string;
    dailyBreakdown?: Array<{
      date: string;
      revenue: number;
      transactions: number;
      hasOverride: boolean;
    }>;
    insights?: string[];
    queryInterpretation: string;
  };
  error?: string;
}

export class ClaudeRevenueTool {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Natural language date parsing
   */
  private parseDateFromQuery(query: string): { startDate: Date; endDate: Date } | null {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Common patterns
    if (/today/i.test(query)) {
      return { startDate: today, endDate: today };
    }
    
    if (/yesterday/i.test(query)) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: yesterday };
    }
    
    if (/last week/i.test(query)) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7 - today.getDay());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      return { startDate, endDate };
    }
    
    if (/last weekend/i.test(query)) {
      const dayOfWeek = now.getDay();
      const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
      const lastSunday = new Date(today);
      lastSunday.setDate(lastSunday.getDate() - daysToLastSunday);
      const lastFriday = new Date(lastSunday);
      lastFriday.setDate(lastFriday.getDate() - 2);
      return { startDate: lastFriday, endDate: lastSunday };
    }
    
    // Month + Year pattern (e.g., "July 2025")
    const monthYearMatch = query.match(
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i
    );
    if (monthYearMatch) {
      const monthMap: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3,
        may: 4, june: 5, july: 6, august: 7,
        september: 8, october: 9, november: 10, december: 11
      };
      const monthIndex = monthMap[monthYearMatch[1].toLowerCase()];
      const year = parseInt(monthYearMatch[2]);
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0); // Last day of month
      return { startDate, endDate };
    }
    
    // Specific date like "February 14, 2025" or "Feb 14th 2025"
    const monthDayYearMatch = query.match(
      /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i
    );
    if (monthDayYearMatch) {
      const monthMap: Record<string, number> = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, sept: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11
      };
      const monthIndex = monthMap[monthDayYearMatch[1].toLowerCase()];
      const day = parseInt(monthDayYearMatch[2]);
      const year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3]) : new Date().getFullYear();
      
      const date = new Date(year, monthIndex, day);
      return { startDate: date, endDate: date };
    }
    
    // Specific date patterns MM/DD/YYYY
    const specificDateMatch = query.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (specificDateMatch) {
      const date = new Date(
        parseInt(specificDateMatch[3]),
        parseInt(specificDateMatch[1]) - 1,
        parseInt(specificDateMatch[2])
      );
      return { startDate: date, endDate: date };
    }
    
    // Default to today if no pattern matches
    return { startDate: today, endDate: today };
  }

  /**
   * Execute the revenue query
   */
  async queryRevenue(params: RevenueQueryToolParams): Promise<RevenueQueryResult> {
    try {
      // Parse dates from natural language query
      const dateRange = this.parseDateFromQuery(params.query);
      if (!dateRange) {
        return {
          success: false,
          error: 'Could not understand the date range in your query'
        };
      }

      const { startDate, endDate } = dateRange;
      
      // Format dates for SQL
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Query revenue_overrides first (source of truth)
      const { data: overrides, error: overridesError } = await this.supabase
        .from('revenue_overrides')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });

      if (overridesError) {
        console.error('Revenue overrides query error:', overridesError);
      }

      // Query toast_checks for additional data
      const { data: toastData, error: toastError } = await this.supabase
        .from('toast_checks')
        .select('businessDate, revenue, checkCount')
        .gte('businessDate', startDateStr)
        .lte('businessDate', endDateStr)
        .order('businessDate', { ascending: true });

      if (toastError) {
        console.error('Toast checks query error:', toastError);
      }

      // Combine data, preferring overrides
      const revenueByDate = new Map<string, { revenue: number; transactions: number; hasOverride: boolean }>();
      
      // Add toast data first
      toastData?.forEach(check => {
        if (check.businessDate && check.revenue) {
          revenueByDate.set(check.businessDate, {
            revenue: check.revenue,
            transactions: check.checkCount || 0,
            hasOverride: false
          });
        }
      });

      // Override with manual data
      overrides?.forEach(override => {
        if (override.date && override.revenue_total !== null) {
          revenueByDate.set(override.date, {
            revenue: override.revenue_total,
            transactions: override.transaction_count || 0,
            hasOverride: true
          });
        }
      });

      // Build daily breakdown
      const dailyBreakdown = Array.from(revenueByDate.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          transactions: data.transactions,
          hasOverride: data.hasOverride
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate total
      const totalRevenue = dailyBreakdown.reduce((sum, day) => sum + day.revenue, 0);

      // Generate insights
      const insights: string[] = [];
      if (dailyBreakdown.length > 0) {
        const avgDaily = totalRevenue / dailyBreakdown.length;
        insights.push(`Average daily revenue: $${avgDaily.toFixed(2)}`);
        
        const bestDay = dailyBreakdown.reduce((best, day) => 
          day.revenue > best.revenue ? day : best
        );
        insights.push(`Best day: ${bestDay.date} with $${bestDay.revenue.toFixed(2)}`);
      }

      return {
        success: true,
        data: {
          totalRevenue,
          periodStart: startDateStr,
          periodEnd: endDateStr,
          dailyBreakdown,
          insights,
          queryInterpretation: `Revenue data from ${startDateStr} to ${endDateStr}`
        }
      };

    } catch (error) {
      console.error('Revenue tool error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get the tool definition for Claude
   */
  static getToolDefinition() {
    return {
      name: 'query_venue_revenue',
      description: 'Query venue revenue data for any date range using natural language',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language query about revenue (e.g., "revenue for July 2025", "last weekend sales", "yesterday revenue")'
          },
          venueId: {
            type: 'string',
            description: 'Optional venue ID to query'
          }
        },
        required: ['query']
      }
    };
  }
}
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

export interface MenuQueryToolParams {
  query: string;
  venueId?: string;
}

export interface MenuItemData {
  itemName: string;
  itemGuid: string;
  category: string;
  quantitySold: number;
  revenue: number;
  averagePrice: number;
}

export interface MenuQueryResult {
  success: boolean;
  data?: {
    items: MenuItemData[];
    periodStart: string;
    periodEnd: string;
    totalItems: number;
    totalQuantity: number;
    totalRevenue: number;
    topSellingItems?: MenuItemData[];
    categoryBreakdown?: Array<{
      category: string;
      quantity: number;
      revenue: number;
      itemCount: number;
    }>;
    insights?: string[];
    queryInterpretation: string;
  };
  error?: string;
}

export class ClaudeMenuTool {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Natural language date parsing (reuse from revenue tool)
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
    
    if (/this\s+(?:week|month)/i.test(query)) {
      if (/week/i.test(query)) {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - today.getDay());
        return { startDate, endDate: today };
      } else {
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate, endDate: today };
      }
    }
    
    if (/last\s+(?:week|month)/i.test(query)) {
      if (/week/i.test(query)) {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7 - today.getDay());
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        return { startDate, endDate };
      } else {
        const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        return { startDate, endDate };
      }
    }
    
    // Month + Year pattern
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
      const endDate = new Date(year, monthIndex + 1, 0);
      return { startDate, endDate };
    }
    
    // Default to this month if no pattern matches
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate, endDate: today };
  }

  /**
   * Parse query intent to determine what menu information is requested
   */
  private parseQueryIntent(query: string): {
    wantsBestSellers: boolean;
    wantsCategories: boolean;
    specificCategory?: string;
    limit?: number;
  } {
    const lowerQuery = query.toLowerCase();
    
    return {
      wantsBestSellers: /best|top|popular|selling/i.test(query),
      wantsCategories: /category|categories|type/i.test(query),
      specificCategory: this.extractCategory(query),
      limit: this.extractLimit(query) || (lowerQuery.includes('best') ? 10 : undefined)
    };
  }

  private extractCategory(query: string): string | undefined {
    const categoryPatterns = [
      /\b(appetizer|starter)s?\b/i,
      /\b(entree|main)s?\b/i,
      /\b(dessert|sweet)s?\b/i,
      /\b(beverage|drink)s?\b/i,
      /\b(alcohol|beer|wine|cocktail)s?\b/i,
      /\b(side)s?\b/i,
    ];
    
    for (const pattern of categoryPatterns) {
      const match = query.match(pattern);
      if (match) return match[0];
    }
    
    return undefined;
  }

  private extractLimit(query: string): number | undefined {
    const limitMatch = query.match(/top\s+(\d+)|(\d+)\s+best/i);
    return limitMatch ? parseInt(limitMatch[1] || limitMatch[2]) : undefined;
  }

  /**
   * Execute the menu query
   */
  async queryMenu(params: MenuQueryToolParams): Promise<MenuQueryResult> {
    try {
      // Parse dates from query
      const dateRange = this.parseDateFromQuery(params.query);
      if (!dateRange) {
        return {
          success: false,
          error: 'Could not understand the date range in your query'
        };
      }

      const { startDate, endDate } = dateRange;
      const intent = this.parseQueryIntent(params.query);
      
      // Format dates for SQL
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Try RPC first for efficient querying
      const { data: rpcData, error: rpcError } = await this.supabase
        .rpc('get_menu_items_sold', {
          start_date: startDateStr,
          end_date: endDateStr,
          category_filter: intent.specificCategory
        });

      if (!rpcError && rpcData) {
        // Process RPC results
        return this.processRpcResults(rpcData, startDateStr, endDateStr, intent);
      }

      // Fallback: Query selections and checks separately
      console.log('RPC not available, using fallback query method');
      
      // First get checks within date range
      const { data: checks, error: checksError } = await this.supabase
        .from('toast_checks')
        .select('check_guid, created_date')
        .gte('created_date', startDateStr + 'T00:00:00')
        .lte('created_date', endDateStr + 'T23:59:59')
        .eq('voided', false);

      if (checksError) {
        console.error('Error fetching checks:', checksError);
        return {
          success: false,
          error: `Database error: ${checksError.message}`
        };
      }
      
      if (!checks || checks.length === 0) {
        return {
          success: true,
          data: {
            items: [],
            periodStart: startDateStr,
            periodEnd: endDateStr,
            totalItems: 0,
            totalQuantity: 0,
            totalRevenue: 0,
            insights: ['No sales data found for the specified period'],
            queryInterpretation: this.buildInterpretation(startDateStr, endDateStr, intent)
          }
        };
      }

      // Get check GUIDs - limit to prevent query issues
      const checkGuids = checks.slice(0, 100).map(c => c.check_guid);
      console.log(`Found ${checks.length} checks, querying selections for first ${checkGuids.length}`);

      // Query selections for these checks
      const { data: selections, error: selectionsError } = await this.supabase
        .from('toast_selections')
        .select('*')
        .in('check_guid', checkGuids)
        .eq('voided', false);

      if (selectionsError) {
        return {
          success: false,
          error: `Failed to query menu items: ${selectionsError.message}`
        };
      }

      // Process the selections
      return this.processSelections(selections || [], startDateStr, endDateStr, intent);

      // Process RPC results
      return this.processRpcResults(selections || [], startDateStr, endDateStr, intent);

    } catch (error) {
      console.error('Menu tool error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private processSelections(selections: unknown[], startDate: string, endDate: string, intent: { wantsBestSellers: boolean; wantsCategories: boolean; specificCategory?: string; limit?: number }): MenuQueryResult {
    // Group by item
    const itemMap = new Map<string, MenuItemData>();
    const categoryMap = new Map<string, { quantity: number; revenue: number; items: Set<string> }>();

    for (const sel of selections) {
      const selection = sel as {
        item_guid: string;
        item_name: string;
        sales_category_name?: string;
        quantity: number;
        price: number;
        check_guid: string;
      };
      const itemKey = selection.item_guid;
      const revenue = (selection.price || 0) / 100; // Convert cents to dollars
      
      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, {
          itemName: selection.item_name,
          itemGuid: selection.item_guid,
          category: selection.sales_category_name || 'Uncategorized',
          quantitySold: 0,
          revenue: 0,
          averagePrice: revenue / (selection.quantity || 1)
        });
      }
      
      const item = itemMap.get(itemKey)!;
      item.quantitySold += selection.quantity || 0;
      item.revenue += revenue;

      // Track categories
      const category = item.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { quantity: 0, revenue: 0, items: new Set() });
      }
      const cat = categoryMap.get(category)!;
      cat.quantity += selection.quantity || 0;
      cat.revenue += revenue;
      cat.items.add(itemKey);
    }

    // Convert maps to arrays
    const items = Array.from(itemMap.values());
    const sortedItems = items.sort((a, b) => b.quantitySold - a.quantitySold);

    // Get top sellers if requested
    const topSellingItems = intent.wantsBestSellers 
      ? sortedItems.slice(0, intent.limit || 10)
      : undefined;

    // Get category breakdown
    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      quantity: data.quantity,
      revenue: data.revenue,
      itemCount: data.items.size
    })).sort((a, b) => b.revenue - a.revenue);

    // Generate insights
    const insights: string[] = [];
    if (sortedItems.length > 0) {
      insights.push(`Most popular item: ${sortedItems[0].itemName} (${sortedItems[0].quantitySold} sold)`);
      const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
      const avgItemRevenue = totalRevenue / items.length;
      insights.push(`Average revenue per menu item: $${avgItemRevenue.toFixed(2)}`);
    }

    if (categoryBreakdown.length > 0) {
      insights.push(`Best performing category: ${categoryBreakdown[0].category} ($${categoryBreakdown[0].revenue.toFixed(2)})`);
    }

    return {
      success: true,
      data: {
        items: intent.wantsBestSellers ? topSellingItems || [] : sortedItems,
        periodStart: startDate,
        periodEnd: endDate,
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantitySold, 0),
        totalRevenue: items.reduce((sum, item) => sum + item.revenue, 0),
        topSellingItems,
        categoryBreakdown: intent.wantsCategories ? categoryBreakdown : undefined,
        insights,
        queryInterpretation: this.buildInterpretation(startDate, endDate, intent)
      }
    };
  }

  private processRpcResults(results: Array<{
    item_guid: string;
    item_name: string;
    sales_category_name: string | null;
    total_quantity: string;
    total_revenue: string;
    transaction_count: string;
    avg_price: string;
  }>, startDate: string, endDate: string, intent: { wantsBestSellers: boolean; wantsCategories: boolean; specificCategory?: string; limit?: number }): MenuQueryResult {
    // RPC results are already aggregated
    const items: MenuItemData[] = results.map(row => ({
      itemName: row.item_name,
      itemGuid: row.item_guid,
      category: row.sales_category_name || 'Uncategorized',
      quantitySold: parseFloat(row.total_quantity || '0'),
      revenue: parseFloat(row.total_revenue || '0'),
      averagePrice: parseFloat(row.avg_price || '0')
    }));

    const sortedItems = items.sort((a, b) => b.quantitySold - a.quantitySold);

    // Get top sellers if requested
    const topSellingItems = intent.wantsBestSellers 
      ? sortedItems.slice(0, intent.limit || 10)
      : undefined;

    // Calculate category breakdown if needed
    let categoryBreakdown;
    if (intent.wantsCategories) {
      const categoryMap = new Map<string, { quantity: number; revenue: number; items: Set<string> }>();
      
      for (const item of items) {
        const category = item.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { quantity: 0, revenue: 0, items: new Set() });
        }
        const cat = categoryMap.get(category)!;
        cat.quantity += item.quantitySold;
        cat.revenue += item.revenue;
        cat.items.add(item.itemGuid);
      }

      categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        quantity: data.quantity,
        revenue: data.revenue,
        itemCount: data.items.size
      })).sort((a, b) => b.revenue - a.revenue);
    }

    // Generate insights
    const insights: string[] = [];
    if (sortedItems.length > 0) {
      insights.push(`Most popular item: ${sortedItems[0].itemName} (${sortedItems[0].quantitySold.toFixed(0)} sold)`);
      const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
      const avgItemRevenue = totalRevenue / items.length;
      insights.push(`Average revenue per menu item: $${avgItemRevenue.toFixed(2)}`);
      
      if (sortedItems[0].revenue > 0) {
        const topRevenueItem = items.sort((a, b) => b.revenue - a.revenue)[0];
        if (topRevenueItem.itemGuid !== sortedItems[0].itemGuid) {
          insights.push(`Highest revenue item: ${topRevenueItem.itemName} ($${topRevenueItem.revenue.toFixed(2)})`);
        }
      }
    }

    return {
      success: true,
      data: {
        items: intent.wantsBestSellers ? topSellingItems || [] : sortedItems,
        periodStart: startDate,
        periodEnd: endDate,
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantitySold, 0),
        totalRevenue: items.reduce((sum, item) => sum + item.revenue, 0),
        topSellingItems,
        categoryBreakdown,
        insights,
        queryInterpretation: this.buildInterpretation(startDate, endDate, intent)
      }
    };
  }

  private buildInterpretation(startDate: string, endDate: string, intent: { wantsBestSellers: boolean; wantsCategories: boolean; specificCategory?: string; limit?: number }): string {
    let interpretation = `Menu item data from ${startDate} to ${endDate}`;
    
    if (intent.wantsBestSellers) {
      interpretation = `Top ${intent.limit || 10} best-selling items from ${startDate} to ${endDate}`;
    }
    
    if (intent.specificCategory) {
      interpretation += ` (${intent.specificCategory} only)`;
    }
    
    return interpretation;
  }

  /**
   * Get the tool definition for Claude
   */
  static getToolDefinition() {
    return {
      name: 'query_menu_items',
      description: 'ALWAYS use this to answer questions about: menu items, food, drinks, beverages, dishes, products, best sellers, top sellers, popular items, what sold, sales by item, item performance, menu performance, product mix. Returns detailed item-level sales data.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language query about menu items (e.g., "best selling items this month", "top appetizers last week", "menu performance today")'
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
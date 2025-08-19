/* eslint-disable */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const TOAST_API_BASE = 'https://api.toasttab.com';
const LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

interface ToastCheck {
  guid: string;
  totalAmount: number;
  voidDate?: string;
  paidDate?: string;
  closedDate?: string;
  deleted: boolean;
  businessDate: number;
}

interface ToastOrder {
  guid: string;
  checks: ToastCheck[];
  businessDate: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('[SYNC] Starting missing months sync...');

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const toastToken = process.env.TOAST_API_TOKEN;
    if (!toastToken) {
      throw new Error('TOAST_API_TOKEN not configured');
    }

    // Determine which months to sync based on query params or default to all missing
    const { months, year = '2025' } = req.query;

    let monthsToSync: number[];
    if (months) {
      monthsToSync = (months as string).split(',').map((m) => parseInt(m));
    } else {
      // Default: sync missing months (Jan-Apr, Sep-Dec)
      monthsToSync = [1, 2, 3, 4, 9, 10, 11, 12];
    }

    interface SyncResult {
      month: string;
      ordersFound: number;
      daysWithRevenue: number;
      totalRevenue: number;
      newRecords: number;
      updatedRecords: number;
      dailyBreakdown: Record<string, { revenue: number; checkCount: number }>;
    }

    interface SyncError {
      month: string;
      error: string;
    }

    const results: SyncResult[] = [];
    const errors: SyncError[] = [];

    // Process each month
    for (const month of monthsToSync) {
      try {
        console.log(`[SYNC] Processing ${year}-${month.toString().padStart(2, '0')}...`);

        // Calculate date range for the month
        const startDate = new Date(parseInt(year as string), month - 1, 1);
        const endDate = new Date(parseInt(year as string), month, 0); // Last day of month

        const startBusinessDate = parseInt(startDate.toISOString().split('T')[0].replace(/-/g, ''));
        const endBusinessDate = parseInt(endDate.toISOString().split('T')[0].replace(/-/g, ''));

        console.log(`[SYNC] Fetching orders from ${startBusinessDate} to ${endBusinessDate}`);

        // Fetch orders from Toast API with pagination
        let allOrders: ToastOrder[] = [];
        let pageToken: string | null = null;
        let pageCount = 0;

        do {
          const ordersUrl = pageToken
            ? `${TOAST_API_BASE}/orders/v2/orders?locationId=${LOCATION_ID}&businessDate=${startBusinessDate},${endBusinessDate}&pageToken=${pageToken}`
            : `${TOAST_API_BASE}/orders/v2/orders?locationId=${LOCATION_ID}&businessDate=${startBusinessDate},${endBusinessDate}&pageSize=100`;

          const ordersResponse = await fetch(ordersUrl, {
            headers: {
              Authorization: `Bearer ${toastToken}`,
              'Toast-Restaurant-External-ID': LOCATION_ID,
            },
          });

          if (!ordersResponse.ok) {
            throw new Error(
              `Toast API error: ${ordersResponse.status} ${ordersResponse.statusText}`,
            );
          }

          const ordersData = await ordersResponse.json();
          const orders = ordersData.orders || [];
          allOrders = allOrders.concat(orders);

          pageToken = ordersData.pageToken || null;
          pageCount++;

          console.log(
            `[SYNC] Page ${pageCount}: fetched ${orders.length} orders (total: ${allOrders.length})`,
          );

          // Prevent infinite loops
          if (pageCount > 100) {
            console.warn('[SYNC] Breaking pagination loop after 100 pages');
            break;
          }
        } while (pageToken);

        const orders = allOrders;

        console.log(
          `[SYNC] Found ${orders.length} orders for ${year}-${month.toString().padStart(2, '0')}`,
        );

        // Process daily revenue
        const dailyRevenue: Record<string, { revenue: number; checkCount: number }> = {};

        for (const order of orders) {
          const businessDate = order.businessDate.toString();
          const dateStr = `${businessDate.substring(0, 4)}-${businessDate.substring(4, 6)}-${businessDate.substring(6, 8)}`;

          if (!dailyRevenue[dateStr]) {
            dailyRevenue[dateStr] = { revenue: 0, checkCount: 0 };
          }

          // Sum revenue from non-voided checks
          if (order.checks && Array.isArray(order.checks)) {
            for (const check of order.checks) {
              if (!check.deleted && !check.voidDate && check.paidDate) {
                dailyRevenue[dateStr].revenue += check.totalAmount || 0;
                dailyRevenue[dateStr].checkCount += 1;
              }
            }
          }
        }

        // Save to revenue_overrides table
        let savedCount = 0;
        let updatedCount = 0;

        for (const [date, data] of Object.entries(dailyRevenue)) {
          // Always save data, even if revenue is 0 (to indicate no sales that day)
          const { data: existing } = await supabase
            .from('revenue_overrides')
            .select('date')
            .eq('date', date)
            .single();

          const { error } = await supabase.from('revenue_overrides').upsert(
            {
              date,
              actual_revenue: data.revenue,
              revenue_total: data.revenue,
              check_count: data.checkCount,
              notes: `Synced from Toast API on ${new Date().toISOString()}`,
            },
            {
              onConflict: 'date',
            },
          );

          if (!error) {
            if (existing) {
              updatedCount++;
            } else {
              savedCount++;
            }
          } else {
            console.error(`[SYNC] Error saving ${date}:`, error);
          }
        }

        results.push({
          month: `${year}-${month.toString().padStart(2, '0')}`,
          ordersFound: orders.length,
          daysWithRevenue: Object.keys(dailyRevenue).length,
          totalRevenue: Object.values(dailyRevenue).reduce((sum, day) => sum + day.revenue, 0),
          newRecords: savedCount,
          updatedRecords: updatedCount,
          dailyBreakdown: dailyRevenue,
        });
      } catch (monthError) {
        console.error(`[SYNC] Error processing ${year}-${month}:`, monthError);
        errors.push({
          month: `${year}-${month.toString().padStart(2, '0')}`,
          error: monthError instanceof Error ? monthError.message : 'Unknown error',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Toast sync completed',
      summary: {
        monthsProcessed: results.length,
        totalRevenueSynced: results.reduce((sum, r) => sum + r.totalRevenue, 0),
        newRecords: results.reduce((sum, r) => sum + r.newRecords, 0),
        updatedRecords: results.reduce((sum, r) => sum + r.updatedRecords, 0),
        errors: errors.length,
      },
      results,
      errors,
    });
  } catch (error) {
    console.error('[SYNC] Fatal error:', error);
    res.status(500).json({
      error: 'Failed to sync Toast data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

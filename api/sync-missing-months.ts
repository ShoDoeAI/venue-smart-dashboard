/* eslint-disable */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const TOAST_API_BASE = 'https://ws-api.toasttab.com';
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

    // Get Toast credentials
    const toastClientId = process.env.TOAST_CLIENT_ID;
    const toastClientSecret = process.env.TOAST_CLIENT_SECRET;

    if (!toastClientId || !toastClientSecret) {
      throw new Error('TOAST_CLIENT_ID and TOAST_CLIENT_SECRET must be configured');
    }

    // Authenticate with Toast to get access token
    console.log('[SYNC] Authenticating with Toast...');
    const authResponse = await fetch(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: toastClientId,
          clientSecret: toastClientSecret,
          userAccessType: 'TOAST_MACHINE_CLIENT',
        }),
      },
    );

    if (!authResponse.ok) {
      throw new Error(
        `Toast authentication failed: ${authResponse.status} ${authResponse.statusText}`,
      );
    }

    const authData = await authResponse.json();
    const toastToken = authData.token.accessToken;

    console.log('[SYNC] Toast authentication successful');

    // Determine which months to sync based on query params or default to all missing
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // For now, default to 2024 since that's where the Toast data exists
    const { months, year = '2024', quick } = req.query;
    const syncYear = parseInt(year as string);
    const isQuickMode = quick === 'true';
    
    console.log(`[SYNC] System thinks current year is ${currentYear}, but we're defaulting to sync year ${syncYear}`);

    let monthsToSync: number[];
    if (months) {
      monthsToSync = (months as string).split(',').map((m) => parseInt(m));
    } else {
      // Default: sync all months up to current month if current year, otherwise all 12 months
      if (isQuickMode) {
        // In quick mode, only sync current month
        monthsToSync = [currentMonth];
      } else if (syncYear === currentYear) {
        monthsToSync = Array.from({ length: currentMonth }, (_, i) => i + 1);
      } else if (syncYear < currentYear) {
        monthsToSync = Array.from({ length: 12 }, (_, i) => i + 1);
      } else {
        // Future year - no data yet
        monthsToSync = [];
      }
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
        console.log(`[SYNC] Processing ${syncYear}-${month.toString().padStart(2, '0')}...`);

        // Calculate date range for the month
        const startDate = new Date(syncYear, month - 1, 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(syncYear, month, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);

        // Convert dates to ISO strings for Toast API
        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();

        console.log(`[SYNC] Fetching orders from ${startDateISO} to ${endDateISO}`);

        // Fetch orders from Toast API using businessDate
        let allOrders: ToastOrder[] = [];

        // Process each day of the month
        const currentDate = new Date(startDate);
        let daysProcessed = 0;
        const maxDaysInQuickMode = 3; // Only process first 3 days in quick mode

        while (currentDate <= endDate) {
          // In quick mode, only process first few days
          if (isQuickMode && daysProcessed >= maxDaysInQuickMode) {
            console.log(`[SYNC] Quick mode: Stopping after ${maxDaysInQuickMode} days`);
            break;
          }

          // Format date as YYYYMMDD for businessDate parameter
          const year = currentDate.getFullYear();
          const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
          const day = currentDate.getDate().toString().padStart(2, '0');
          const businessDate = parseInt(`${year}${month}${day}`);

          console.log(`[SYNC] Fetching orders for business date ${businessDate}...`);

          try {
            // Use ordersBulk endpoint with pagination
            let page = 1;
            let hasMorePages = true;
            let dayOrderCount = 0;

            while (hasMorePages) {
              const ordersUrl = `${TOAST_API_BASE}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`;

              const ordersResponse = await fetch(ordersUrl, {
                headers: {
                  Authorization: `Bearer ${toastToken}`,
                  'Toast-Restaurant-External-ID': LOCATION_ID,
                },
              });

              if (!ordersResponse.ok) {
                const errorText = await ordersResponse.text();
                console.error(
                  `[SYNC] Toast API error for business date ${businessDate}:`,
                  {
                    status: ordersResponse.status,
                    statusText: ordersResponse.statusText,
                    body: errorText.substring(0, 200),
                  },
                );
                break; // Exit pagination loop on error
              }

              const ordersData = await ordersResponse.json();
              const pageOrders = Array.isArray(ordersData) ? ordersData : ordersData.orders || [];
              
              if (pageOrders.length === 0) {
                hasMorePages = false;
              } else {
                allOrders = allOrders.concat(pageOrders);
                dayOrderCount += pageOrders.length;
                
                // If we got less than pageSize, we're on the last page
                if (pageOrders.length < 100) {
                  hasMorePages = false;
                } else {
                  page++;
                }
              }
            }

            console.log(`[SYNC] Found ${dayOrderCount} orders for ${businessDate}`);
          } catch (error) {
            console.error(`[SYNC] Error fetching orders for ${businessDate}:`, error);
          }

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          daysProcessed++;

          // Log progress
          console.log(
            `[SYNC] Processed day ${daysProcessed}, total orders so far: ${allOrders.length}`,
          );
        }

        const orders = allOrders;

        console.log(
          `[SYNC] Found ${orders.length} orders for ${syncYear}-${month.toString().padStart(2, '0')}`,
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

          // Try with revenue_total first, fall back without it if column doesn't exist
          let upsertData: any = {
            date,
            actual_revenue: data.revenue,
            check_count: data.checkCount,
            notes: `Synced from Toast API on ${new Date().toISOString()}`,
          };
          
          // Add revenue_total if supported
          upsertData.revenue_total = data.revenue;
          
          const { error } = await supabase.from('revenue_overrides').upsert(
            upsertData,
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
          month: `${syncYear}-${month.toString().padStart(2, '0')}`,
          ordersFound: orders.length,
          daysWithRevenue: Object.keys(dailyRevenue).length,
          totalRevenue: Object.values(dailyRevenue).reduce((sum, day) => sum + day.revenue, 0),
          newRecords: savedCount,
          updatedRecords: updatedCount,
          dailyBreakdown: dailyRevenue,
        });
      } catch (monthError) {
        console.error(`[SYNC] Error processing ${syncYear}-${month}:`, monthError);
        errors.push({
          month: `${syncYear}-${month.toString().padStart(2, '0')}`,
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

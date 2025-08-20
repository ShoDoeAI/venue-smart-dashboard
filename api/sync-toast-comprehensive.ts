/* eslint-disable */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const TOAST_API_BASE = 'https://ws-api.toasttab.com';
const LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

interface SyncStatus {
  totalMonths: number;
  completedMonths: number;
  currentMonth: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  estimatedCompletion: string;
  results: Record<string, any>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Support both GET (for status) and POST (to start sync)
  if (req.method === 'GET') {
    return handleGetStatus(req, res);
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('[COMPREHENSIVE SYNC] Starting 24-month sync process...');

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Get Toast credentials
    const toastClientId = process.env.TOAST_CLIENT_ID;
    const toastClientSecret = process.env.TOAST_CLIENT_SECRET;

    if (!toastClientId || !toastClientSecret) {
      throw new Error('Toast credentials not configured');
    }

    // Authenticate with Toast
    const authResponse = await fetch(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: toastClientId,
          clientSecret: toastClientSecret,
          userAccessType: 'TOAST_MACHINE_CLIENT',
        }),
      },
    );

    if (!authResponse.ok) {
      throw new Error(`Toast authentication failed: ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    const toastToken = authData.token.accessToken;

    // Calculate months to sync (24 months back from today)
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(today.getMonth() - 23);

    // Get existing data to avoid re-syncing
    const { data: existingData } = await supabase
      .from('revenue_overrides')
      .select('date')
      .order('date');

    const existingDates = new Set(existingData?.map(d => d.date) || []);

    // Generate list of all months to sync
    const monthsToSync = [];
    const checkDate = new Date(startDate);
    
    while (checkDate <= today) {
      const year = checkDate.getFullYear();
      const month = checkDate.getMonth() + 1;
      
      // Check if this month needs syncing
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      
      let needsSync = true;
      let existingDays = 0;
      
      // Check how many days of this month we already have
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (existingDates.has(dateStr)) {
          existingDays++;
        }
      }
      
      // If we have less than 80% of the month, sync it
      const totalDays = monthEnd.getDate();
      if (existingDays / totalDays < 0.8) {
        monthsToSync.push({
          year,
          month,
          monthKey: `${year}-${month.toString().padStart(2, '0')}`,
          existingDays,
          totalDays,
        });
      }
      
      checkDate.setMonth(checkDate.getMonth() + 1);
    }

    // Initialize sync status
    const syncId = `sync-${Date.now()}`;
    const syncStatus: SyncStatus = {
      totalMonths: monthsToSync.length,
      completedMonths: 0,
      currentMonth: '',
      status: 'running',
      startTime: new Date().toISOString(),
      estimatedCompletion: '',
      results: {},
    };

    // Store initial status
    await supabase.from('sync_status').upsert({
      id: syncId,
      status: JSON.stringify(syncStatus),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Return immediately with sync ID
    res.status(202).json({
      message: 'Sync started',
      syncId,
      totalMonths: monthsToSync.length,
      estimatedTime: `${Math.ceil(monthsToSync.length * 5)} minutes`,
      statusUrl: `/api/sync-toast-comprehensive?syncId=${syncId}`,
    });

    // Continue processing in background
    processSyncInBackground(syncId, monthsToSync, toastToken, supabase);

  } catch (error) {
    console.error('[COMPREHENSIVE SYNC] Fatal error:', error);
    res.status(500).json({
      error: 'Failed to start sync',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleGetStatus(req: VercelRequest, res: VercelResponse) {
  const { syncId } = req.query;
  
  if (!syncId) {
    res.status(400).json({ error: 'syncId required' });
    return;
  }

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await supabase
    .from('sync_status')
    .select('status')
    .eq('id', syncId as string)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Sync not found' });
    return;
  }

  res.status(200).json(JSON.parse(data.status));
}

async function processSyncInBackground(
  syncId: string,
  monthsToSync: any[],
  toastToken: string,
  supabase: any,
) {
  const startTime = Date.now();
  const results: Record<string, any> = {};

  for (let i = 0; i < monthsToSync.length; i++) {
    const { year, month, monthKey } = monthsToSync[i];
    
    try {
      console.log(`[SYNC] Processing ${monthKey} (${i + 1}/${monthsToSync.length})...`);
      
      // Update status
      const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
      const avgMinutesPerMonth = i > 0 ? elapsedMinutes / i : 5;
      const remainingMinutes = Math.ceil((monthsToSync.length - i) * avgMinutesPerMonth);
      
      await updateSyncStatus(supabase, syncId, {
        completedMonths: i,
        currentMonth: monthKey,
        estimatedCompletion: new Date(Date.now() + remainingMinutes * 60000).toISOString(),
      });

      // Sync this month
      const monthResult = await syncMonth(year, month, toastToken, supabase);
      results[monthKey] = monthResult;

    } catch (error) {
      console.error(`[SYNC] Error processing ${monthKey}:`, error);
      results[monthKey] = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Final status update
  await updateSyncStatus(supabase, syncId, {
    completedMonths: monthsToSync.length,
    status: 'completed',
    results,
  });
}

async function syncMonth(
  year: number,
  month: number,
  toastToken: string,
  supabase: any,
): Promise<any> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  let totalRevenue = 0;
  let totalOrders = 0;
  let savedDays = 0;

  // Process each day
  for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    const dateStr = day.toISOString().split('T')[0];
    
    // Check if we already have this day
    const { data: existing } = await supabase
      .from('revenue_overrides')
      .select('id')
      .eq('date', dateStr)
      .single();

    if (existing) {
      continue; // Skip days we already have
    }

    let dayRevenue = 0;
    let dayOrders = 0;

    // Process each hour of the day
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(day);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(day);
      hourEnd.setHours(hour, 59, 59, 999);

      try {
        const ordersUrl = `${TOAST_API_BASE}/orders/v2/orders?restaurantGuid=${LOCATION_ID}&startDate=${hourStart.toISOString()}&endDate=${hourEnd.toISOString()}&pageSize=100`;
        
        const ordersResponse = await fetch(ordersUrl, {
          headers: {
            Authorization: `Bearer ${toastToken}`,
            'Toast-Restaurant-External-ID': LOCATION_ID,
          },
        });

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          const orders = ordersData.orders || [];
          
          // Sum revenue from checks
          for (const order of orders) {
            if (order.checks && Array.isArray(order.checks)) {
              for (const check of order.checks) {
                if (!check.deleted && !check.voidDate && check.paidDate) {
                  dayRevenue += check.totalAmount || 0;
                  dayOrders++;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`[SYNC] Error fetching hour ${hour} of ${dateStr}:`, error);
      }
    }

    // Save day's data
    if (dayRevenue > 0 || dayOrders > 0) {
      await supabase.from('revenue_overrides').upsert({
        date: dateStr,
        actual_revenue: dayRevenue,
        revenue_total: dayRevenue,
        check_count: dayOrders,
        notes: `Synced from Toast API on ${new Date().toISOString()}`,
      });
      
      savedDays++;
      totalRevenue += dayRevenue;
      totalOrders += dayOrders;
    }
  }

  return {
    savedDays,
    totalRevenue,
    totalOrders,
    avgDailyRevenue: savedDays > 0 ? totalRevenue / savedDays : 0,
  };
}

async function updateSyncStatus(supabase: any, syncId: string, updates: Partial<SyncStatus>) {
  const { data } = await supabase
    .from('sync_status')
    .select('status')
    .eq('id', syncId)
    .single();

  if (data) {
    const currentStatus = JSON.parse(data.status);
    const updatedStatus = { ...currentStatus, ...updates };
    
    await supabase.from('sync_status').update({
      status: JSON.stringify(updatedStatus),
      updated_at: new Date().toISOString(),
    }).eq('id', syncId);
  }
}
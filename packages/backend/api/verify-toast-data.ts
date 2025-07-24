import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. Check credentials
    const { data: creds } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('api_name', 'toast')
      .single();

    // 2. Get recent orders
    const { data: orders } = await supabase
      .from('toast_orders')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(5);

    // 3. Get recent payments
    const { data: payments } = await supabase
      .from('toast_payments')
      .select('*')
      .order('paid_date', { ascending: false })
      .limit(5);

    // 4. Calculate totals
    let totalRevenue = 0;
    let orderCount = orders?.length || 0;
    let paymentCount = payments?.length || 0;

    payments?.forEach(p => {
      totalRevenue += (p.amount + (p.tip_amount || 0)) / 100;
    });

    // 5. Get sync status
    const { data: syncStatus } = await supabase
      .from('api_sync_status')
      .select('*')
      .eq('service', 'toast')
      .single();

    const verification = {
      status: 'Toast Data Verification Report',
      configuration: {
        environment: creds?.credentials?.environment || 'unknown',
        location_id: creds?.credentials?.locationGuid,
        is_sandbox: creds?.credentials?.environment === 'sandbox',
        restaurant_name: creds?.credentials?.environment === 'sandbox' ? "Jack's on Water Street (Demo)" : "Your Restaurant"
      },
      data_summary: {
        orders_found: orderCount,
        payments_found: paymentCount,
        sample_revenue_from_recent: `$${totalRevenue.toFixed(2)}`,
        latest_order: orders?.[0] ? {
          created: orders[0].created_date,
          order_number: orders[0].order_number || orders[0].display_number,
          server: `${orders[0].server_first_name} ${orders[0].server_last_name}`
        } : null,
        latest_payment: payments?.[0] ? {
          amount: `$${((payments[0].amount + (payments[0].tip_amount || 0)) / 100).toFixed(2)}`,
          type: payments[0].type,
          date: payments[0].paid_date
        } : null
      },
      sync_info: {
        last_sync: syncStatus?.last_sync_at,
        sync_frequency: 'Every 3 minutes',
        is_active: true
      },
      data_validation: {
        is_real_data: creds?.credentials?.environment !== 'sandbox',
        data_source: creds?.credentials?.environment === 'sandbox' 
          ? 'SANDBOX/DEMO DATA - Not real restaurant data' 
          : 'PRODUCTION - Real restaurant data',
        warning: creds?.credentials?.environment === 'sandbox' 
          ? '⚠️ You are viewing DEMO data from Toast sandbox environment. To get real data, you need production credentials.'
          : '✅ This is real production data from your restaurant.'
      }
    };

    return res.status(200).json(verification);

  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Verification failed'
    });
  }
}
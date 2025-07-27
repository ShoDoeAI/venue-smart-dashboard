import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Check toast_transactions
    const { data: transactions, error: txError } = await supabase
      .from('toast_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Check daily_summaries
    const { data: summaries, error: sumError } = await supabase
      .from('daily_summaries')
      .select('*')
      .order('summary_date', { ascending: false })
      .limit(5);

    // Check venues
    const { data: venues, error: venueError } = await supabase
      .from('venues')
      .select('*');

    // Calculate today's stats from transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayTx, error: todayError } = await supabase
      .from('toast_transactions')
      .select('*')
      .gte('created_at', today.toISOString());

    const todayRevenue = todayTx?.reduce((sum, tx) => sum + ((tx.total_amount || 0) / 100), 0) || 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalTransactions: transactions?.length || 0,
        latestTransaction: transactions?.[0] || null,
        todayTransactionCount: todayTx?.length || 0,
        todayRevenue: todayRevenue.toFixed(2),
        summaries: summaries || [],
        venues: venues || []
      },
      errors: {
        transactions: txError?.message || null,
        summaries: sumError?.message || null,
        venues: venueError?.message || null,
        today: todayError?.message || null
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}
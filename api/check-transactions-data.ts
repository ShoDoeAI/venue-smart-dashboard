import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get count of simple_transactions by month
    const { data: transactions } = await supabase
      .from('simple_transactions')
      .select('transaction_date, amount')
      .order('transaction_date', { ascending: false })
      .limit(1000);

    // Group by month
    const monthlyData: Record<string, { count: number; total: number }> = {};
    
    transactions?.forEach(tx => {
      const month = tx.transaction_date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, total: 0 };
      }
      monthlyData[month].count++;
      monthlyData[month].total += tx.amount || 0;
    });

    // Get revenue_overrides data
    const { data: overrides } = await supabase
      .from('revenue_overrides')
      .select('date, revenue_total')
      .order('date', { ascending: false })
      .limit(100);

    // Group overrides by month
    const overrideMonths: Record<string, number> = {};
    overrides?.forEach(row => {
      const month = row.date.substring(0, 7);
      if (!overrideMonths[month]) {
        overrideMonths[month] = 0;
      }
      overrideMonths[month] += row.revenue_total || 0;
    });

    res.status(200).json({
      success: true,
      simple_transactions: {
        total_records: transactions?.length || 0,
        monthly_summary: monthlyData,
        date_range: {
          earliest: transactions?.[transactions.length - 1]?.transaction_date,
          latest: transactions?.[0]?.transaction_date
        }
      },
      revenue_overrides: {
        total_records: overrides?.length || 0,
        monthly_summary: overrideMonths,
        date_range: {
          earliest: overrides?.[overrides.length - 1]?.date,
          latest: overrides?.[0]?.date
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Check what months have data in revenue_overrides
    const { data: monthlyData } = await supabase
      .from('revenue_overrides')
      .select('date, revenue_total, check_count')
      .order('date', { ascending: true });

    // Group by month
    const monthSummary: Record<string, { revenue: number; days: number; checks: number }> = {};
    
    monthlyData?.forEach(row => {
      const month = row.date.substring(0, 7); // YYYY-MM
      if (!monthSummary[month]) {
        monthSummary[month] = { revenue: 0, days: 0, checks: 0 };
      }
      monthSummary[month].revenue += row.revenue_total || 0;
      monthSummary[month].days++;
      monthSummary[month].checks += row.check_count || 0;
    });

    // Get all months from Sep 2023 to Aug 2025
    const allMonths = [];
    for (let year = 2023; year <= 2025; year++) {
      const startMonth = year === 2023 ? 9 : 1;
      const endMonth = year === 2025 ? 8 : 12;
      
      for (let month = startMonth; month <= endMonth; month++) {
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        allMonths.push({
          month: monthStr,
          hasData: !!monthSummary[monthStr],
          revenue: monthSummary[monthStr]?.revenue || 0,
          days: monthSummary[monthStr]?.days || 0,
          checks: monthSummary[monthStr]?.checks || 0
        });
      }
    }

    // Count missing months
    const missingMonths = allMonths.filter(m => !m.hasData);

    res.status(200).json({
      success: true,
      totalMonths: allMonths.length,
      monthsWithData: allMonths.filter(m => m.hasData).length,
      missingMonths: missingMonths.length,
      totalRevenue: Object.values(monthSummary).reduce((sum, m) => sum + m.revenue, 0),
      monthDetails: allMonths,
      missingMonthsList: missingMonths.map(m => m.month)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to verify sync data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
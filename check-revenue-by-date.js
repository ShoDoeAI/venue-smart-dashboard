require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRevenueByDate() {
  try {
    // Get all checks with their dates and amounts
    const { data: allChecks, error } = await supabase
      .from('toast_checks')
      .select('created_date, closed_date, total_amount, amount')
      .order('created_date', { ascending: false });

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    // Group by date
    const revenueByDate = {};
    const revenueByClosedDate = {};
    
    allChecks?.forEach(check => {
      // Group by created date
      const createdDate = check.created_date?.split('T')[0];
      if (createdDate) {
        if (!revenueByDate[createdDate]) {
          revenueByDate[createdDate] = { count: 0, revenue: 0 };
        }
        revenueByDate[createdDate].count++;
        revenueByDate[createdDate].revenue += (check.total_amount || 0);
      }

      // Group by closed date
      const closedDate = check.closed_date?.split('T')[0];
      if (closedDate) {
        if (!revenueByClosedDate[closedDate]) {
          revenueByClosedDate[closedDate] = { count: 0, revenue: 0 };
        }
        revenueByClosedDate[closedDate].count++;
        revenueByClosedDate[closedDate].revenue += (check.total_amount || 0);
      }
    });

    console.log('Revenue by Created Date:');
    console.log('========================');
    const sortedDates = Object.entries(revenueByDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30); // Show top 30 days

    sortedDates.forEach(([date, data]) => {
      console.log(`${date}: $${data.revenue.toFixed(2)} (${data.count} checks)`);
    });

    console.log('\nTotal unique days with revenue:', Object.keys(revenueByDate).length);
    console.log('Date range:', 
      Object.keys(revenueByDate).sort()[0], 
      'to', 
      Object.keys(revenueByDate).sort().slice(-1)[0]
    );

    // Check for specific months
    const monthTotals = {};
    Object.entries(revenueByDate).forEach(([date, data]) => {
      const month = date.substring(0, 7); // YYYY-MM
      if (!monthTotals[month]) {
        monthTotals[month] = { count: 0, revenue: 0 };
      }
      monthTotals[month].count += data.count;
      monthTotals[month].revenue += data.revenue;
    });

    console.log('\nRevenue by Month:');
    console.log('=================');
    Object.entries(monthTotals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([month, data]) => {
        console.log(`${month}: $${data.revenue.toFixed(2)} (${data.count} checks)`);
      });

    // Check July 2025 specifically
    console.log('\nChecking July 2025:');
    console.log('==================');
    const julyDates = Object.keys(revenueByDate).filter(date => date.startsWith('2025-07'));
    if (julyDates.length === 0) {
      console.log('No data found for July 2025');
    } else {
      julyDates.forEach(date => {
        console.log(`${date}: $${revenueByDate[date].revenue.toFixed(2)} (${revenueByDate[date].count} checks)`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRevenueByDate();
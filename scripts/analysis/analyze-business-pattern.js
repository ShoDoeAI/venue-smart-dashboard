#!/usr/bin/env node

// Analyze business pattern - when does the venue operate?

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeBusinessPattern() {
  console.log('📊 Analyzing Venue Business Pattern\n');
  console.log('='.repeat(60));

  try {
    // Get total counts by day of week for all time
    const { data: orderData } = await supabase
      .from('toast_orders')
      .select('business_date, order_guid');

    if (!orderData || orderData.length === 0) {
      console.log('No data found');
      return;
    }

    // Group by day of week and month
    const dayOfWeekStats = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const dayOfWeekRevenue = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const monthlyDays = {};
    const operatingDates = new Set();

    // Get all unique operating dates
    orderData.forEach((order) => {
      const dateStr = String(order.business_date);
      const dateObj = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
      const monthKey = dateStr.slice(0, 6); // YYYYMM

      operatingDates.add(order.business_date);
      dayOfWeekStats[dayName]++;

      if (!monthlyDays[monthKey]) monthlyDays[monthKey] = 0;
      monthlyDays[monthKey]++;
    });

    console.log(`📅 Total Operating Days: ${operatingDates.size}`);
    console.log(
      `📊 Date Range: ${Math.min(...operatingDates)} to ${Math.max(...operatingDates)}\n`,
    );

    // Get revenue by day of week
    console.log('💰 Fetching revenue data...\n');

    for (const date of operatingDates) {
      const { data: orders } = await supabase
        .from('toast_orders')
        .select('order_guid')
        .eq('business_date', date);

      if (orders && orders.length > 0) {
        const orderGuids = orders.map((o) => o.order_guid);
        const { data: checks } = await supabase
          .from('toast_checks')
          .select('total_amount')
          .in('order_guid', orderGuids);

        if (checks) {
          const dayRevenue = checks.reduce((sum, c) => sum + c.total_amount, 0);
          const dateStr = String(date);
          const dateObj = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
          dayOfWeekRevenue[dayName] += dayRevenue;
        }
      }
    }

    // Display operating days by day of week
    console.log('📊 Operating Days by Day of Week:');
    console.log('-'.repeat(60));
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let totalRevenue = 0;

    dayNames.forEach((day) => {
      const count = dayOfWeekStats[day];
      const revenue = dayOfWeekRevenue[day];
      totalRevenue += revenue;

      if (count > 0) {
        const avgRevenue = revenue / count;
        const bar = '█'.repeat(Math.floor(count / 5));
        console.log(
          `${day}: ${String(count).padStart(3)} days | $${avgRevenue.toFixed(2).padStart(10)}/day | Total: $${revenue.toFixed(2).padStart(12)} ${bar}`,
        );
      } else {
        console.log(`${day}:   0 days | Closed`);
      }
    });

    // Check 2025 pattern
    console.log('\n📅 2025 Operating Pattern (Year to Date):');
    console.log('-'.repeat(60));

    const dates2025 = Array.from(operatingDates)
      .filter((d) => String(d).startsWith('2025'))
      .sort()
      .slice(-10); // Last 10 operating days

    for (const date of dates2025) {
      const dateStr = String(date);
      const dateObj = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];

      const { data: orders } = await supabase
        .from('toast_orders')
        .select('order_guid')
        .eq('business_date', date);

      let revenue = 0;
      if (orders && orders.length > 0) {
        const orderGuids = orders.map((o) => o.order_guid);
        const { data: checks } = await supabase
          .from('toast_checks')
          .select('total_amount')
          .in('order_guid', orderGuids);

        if (checks) {
          revenue = checks.reduce((sum, c) => sum + c.total_amount, 0);
        }
      }

      console.log(
        `${dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')} (${dayName}): $${revenue.toFixed(2).padStart(10)}`,
      );
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 VENUE INSIGHTS');
    console.log('='.repeat(60));

    const avgRevenuePerDay = totalRevenue / operatingDates.size;
    console.log(`💰 Total Historical Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`📈 Average Revenue per Operating Day: $${avgRevenuePerDay.toFixed(2)}`);
    console.log(`📅 Total Operating Days: ${operatingDates.size}`);

    // Determine primary operating days
    const sortedDays = Object.entries(dayOfWeekStats)
      .filter(([day, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    console.log(`\n🔍 Primary Operating Days: ${sortedDays.map(([day]) => day).join(', ')}`);

    if (sortedDays[0][1] > operatingDates.size * 0.7) {
      console.log(`📍 This appears to be a ${sortedDays[0][0]}-only venue!`);
    } else if (sortedDays.length <= 3) {
      console.log(`📍 This venue operates ${sortedDays.length} days per week`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run analysis
analyzeBusinessPattern();

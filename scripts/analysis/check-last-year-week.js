#!/usr/bin/env node

// Check revenue for same week last year (Aug 5-11, 2024)

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkLastYearWeek() {
  console.log('📊 Checking Same Week Last Year: August 5-11, 2024\n');
  console.log('='.repeat(60));

  try {
    // Define the date range for last year's same week
    const weekDates = [
      { date: 20240805, day: 'Monday' },
      { date: 20240806, day: 'Tuesday' },
      { date: 20240807, day: 'Wednesday' },
      { date: 20240808, day: 'Thursday' },
      { date: 20240809, day: 'Friday' },
      { date: 20240810, day: 'Saturday' },
      { date: 20240811, day: 'Sunday' },
    ];

    let weekTotal = 0;
    let weekOrders = 0;
    let weekChecks = 0;
    const dailyData = [];

    // Check each day
    for (const { date, day } of weekDates) {
      // Get orders for this business date
      const { data: orders } = await supabase
        .from('toast_orders')
        .select('order_guid')
        .eq('business_date', date);

      let dayTotal = 0;
      let dayChecks = 0;

      if (orders && orders.length > 0) {
        const orderGuids = orders.map((o) => o.order_guid);

        // Get checks for these orders
        const { data: checks } = await supabase
          .from('toast_checks')
          .select('check_guid, total_amount')
          .in('order_guid', orderGuids);

        if (checks) {
          dayTotal = checks.reduce((sum, c) => sum + c.total_amount, 0);
          dayChecks = checks.length;
        }
      }

      dailyData.push({
        day,
        date: String(date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        revenue: dayTotal,
        orders: orders?.length || 0,
        checks: dayChecks,
      });

      weekTotal += dayTotal;
      weekOrders += orders?.length || 0;
      weekChecks += dayChecks;
    }

    // Display daily breakdown
    console.log('📅 Daily Breakdown:');
    console.log('-'.repeat(60));
    dailyData.forEach(({ day, date, revenue, orders, checks }) => {
      const bar = '█'.repeat(Math.floor(revenue / 100));
      console.log(`${day.padEnd(10)} ${date}: $${revenue.toFixed(2).padStart(10)} ${bar}`);
    });

    // Calculate averages
    const avgDaily = weekTotal / 7;
    const avgCheckSize = weekChecks > 0 ? weekTotal / weekChecks : 0;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 WEEK OF AUGUST 5-11, 2024 SUMMARY');
    console.log('='.repeat(60));
    console.log(`💰 Total Revenue: $${weekTotal.toFixed(2)}`);
    console.log(`📦 Total Orders: ${weekOrders.toLocaleString()}`);
    console.log(`📋 Total Checks: ${weekChecks.toLocaleString()}`);
    console.log(`📈 Daily Average: $${avgDaily.toFixed(2)}`);
    console.log(`💵 Average Check: $${avgCheckSize.toFixed(2)}`);

    // Best and worst days
    const sortedDays = [...dailyData].sort((a, b) => b.revenue - a.revenue);
    console.log(`\n🏆 Best Day: ${sortedDays[0].day} - $${sortedDays[0].revenue.toFixed(2)}`);
    console.log(`📉 Slowest Day: ${sortedDays[6].day} - $${sortedDays[6].revenue.toFixed(2)}`);

    // Compare to this week so far (if we want to add that)
    console.log('\n💡 Compare to This Week:');
    console.log(`   Last Year's Saturday (Aug 10, 2024): $${dailyData[5].revenue.toFixed(2)}`);
    console.log(`   This Year's Saturday (Aug 9, 2025): $293.80 (so far today)`);

    const saturdayDiff = ((293.8 - dailyData[5].revenue) / dailyData[5].revenue) * 100;
    if (saturdayDiff > 0) {
      console.log(`   📈 Up ${saturdayDiff.toFixed(1)}% vs last year's Saturday`);
    } else {
      console.log(`   📉 Down ${Math.abs(saturdayDiff).toFixed(1)}% vs last year's Saturday`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run check
checkLastYearWeek();

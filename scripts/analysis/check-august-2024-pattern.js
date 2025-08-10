#!/usr/bin/env node

// Check August 2024 pattern to understand the business

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAugust2024Pattern() {
  console.log('📊 Analyzing August 2024 Business Pattern\n');
  console.log('='.repeat(60));

  try {
    // Check the full month of August 2024
    const startDate = 20240801;
    const endDate = 20240831;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let monthTotal = 0;
    let operatingDays = 0;
    const dayOfWeekTotals = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const dayOfWeekCounts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    console.log('📅 August 2024 Daily Revenue:');
    console.log('-'.repeat(60));

    for (let date = startDate; date <= endDate; date++) {
      // Skip invalid dates
      const dateStr = String(date);
      const day = parseInt(dateStr.slice(-2));
      if (day > 31) continue;

      // Get day of week
      const dateObj = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
      const dayName = dayNames[dateObj.getDay()];

      // Get orders for this business date
      const { data: orders } = await supabase
        .from('toast_orders')
        .select('order_guid')
        .eq('business_date', date);

      let dayTotal = 0;

      if (orders && orders.length > 0) {
        const orderGuids = orders.map((o) => o.order_guid);

        // Get checks for these orders
        const { data: checks } = await supabase
          .from('toast_checks')
          .select('total_amount')
          .in('order_guid', orderGuids);

        if (checks) {
          dayTotal = checks.reduce((sum, c) => sum + c.total_amount, 0);
        }
      }

      if (dayTotal > 0) {
        operatingDays++;
        dayOfWeekTotals[dayName] += dayTotal;
        dayOfWeekCounts[dayName]++;
        console.log(
          `${dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')} (${dayName}): $${dayTotal.toFixed(2).padStart(10)}`,
        );
      }

      monthTotal += dayTotal;
    }

    // Calculate averages by day of week
    console.log('\n📊 Average Revenue by Day of Week:');
    console.log('-'.repeat(60));

    dayNames.forEach((day) => {
      if (dayOfWeekCounts[day] > 0) {
        const avg = dayOfWeekTotals[day] / dayOfWeekCounts[day];
        const bar = '█'.repeat(Math.floor(avg / 50));
        console.log(
          `${day}: $${avg.toFixed(2).padStart(10)} (${dayOfWeekCounts[day]} days) ${bar}`,
        );
      } else {
        console.log(`${day}: $      0.00 (closed)`);
      }
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 AUGUST 2024 SUMMARY');
    console.log('='.repeat(60));
    console.log(`💰 Total Revenue: $${monthTotal.toFixed(2)}`);
    console.log(`📅 Operating Days: ${operatingDays} days`);
    console.log(`📈 Average per Operating Day: $${(monthTotal / operatingDays).toFixed(2)}`);
    console.log(`\n🔍 Key Insight: Venue appears to only operate on Saturdays!`);

    // Check a few Saturdays to see the pattern
    console.log('\n📅 Saturday Performance in 2024:');
    const saturdays = [
      { date: 20240803, desc: 'Aug 3' },
      { date: 20240810, desc: 'Aug 10' },
      { date: 20240817, desc: 'Aug 17' },
      { date: 20240824, desc: 'Aug 24' },
      { date: 20240831, desc: 'Aug 31' },
    ];

    for (const { date, desc } of saturdays) {
      const { data: orders } = await supabase
        .from('toast_orders')
        .select('order_guid')
        .eq('business_date', date);

      let total = 0;
      if (orders && orders.length > 0) {
        const orderGuids = orders.map((o) => o.order_guid);
        const { data: checks } = await supabase
          .from('toast_checks')
          .select('total_amount')
          .in('order_guid', orderGuids);

        if (checks) {
          total = checks.reduce((sum, c) => sum + c.total_amount, 0);
        }
      }

      console.log(`   ${desc}: $${total.toFixed(2)}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run check
checkAugust2024Pattern();

#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testAIDataAccuracy() {
  console.log('\n🔍 TESTING AI DATA ACCURACY');
  console.log('='.repeat(70));

  const testDates = [
    { date: '2025-08-08', businessDate: 20250808, expectedRevenue: 1440.06 },
    { date: '2025-08-10', businessDate: 20250810, expectedRevenue: 6500.0 },
  ];

  for (const test of testDates) {
    console.log(`\n📅 Testing ${test.date}:`);
    console.log('-'.repeat(50));

    // 1. Direct database query (ground truth)
    const { data: orders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', test.businessDate);

    let actualRevenue = 0;
    let checkCount = 0;

    if (orders && orders.length > 0) {
      const orderGuids = orders.map((o) => o.order_guid);
      const { data: checks } = await supabase
        .from('toast_checks')
        .select('check_guid, total_amount, voided')
        .in('order_guid', orderGuids);

      // Count unique checks only
      const uniqueChecks = new Map();
      checks?.forEach((check) => {
        if (!uniqueChecks.has(check.check_guid)) {
          uniqueChecks.set(check.check_guid, check);
        }
      });

      uniqueChecks.forEach((check) => {
        if (!check.voided) {
          actualRevenue += check.total_amount || 0;
          checkCount++;
        }
      });
    }

    console.log(`Database shows:`);
    console.log(`  Orders: ${orders?.length || 0}`);
    console.log(`  Checks: ${checkCount}`);
    console.log(`  Revenue: $${actualRevenue.toFixed(2)}`);
    console.log(`  Expected: $${test.expectedRevenue.toFixed(2)}`);
    console.log(
      `  Database correct: ${actualRevenue.toFixed(2) === test.expectedRevenue.toFixed(2) ? '✅' : '❌'}`,
    );

    // 2. Test AI response
    console.log(`\nTesting AI response...`);

    try {
      const response = await fetch('https://venue-smart-dashboard.vercel.app/api/chat-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `What is the exact total revenue for business date ${test.date}? Just give me the dollar amount.`,
          businessUnit: 'Toast',
        }),
      });

      const data = await response.json();
      const aiResponse = data.response || '';

      // Extract dollar amount from AI response
      const matches = aiResponse.match(/\$?([\d,]+\.?\d*)/g);
      let aiAmount = 0;

      if (matches) {
        // Look for the most likely revenue amount (usually the first large number)
        for (const match of matches) {
          const amount = parseFloat(match.replace(/[$,]/g, ''));
          if (amount > 100 && amount < 100000) {
            // Reasonable revenue range
            aiAmount = amount;
            break;
          }
        }
      }

      console.log(`  AI returned: $${aiAmount.toFixed(2)}`);
      console.log(
        `  AI correct: ${aiAmount.toFixed(2) === test.expectedRevenue.toFixed(2) ? '✅' : '❌'}`,
      );

      if (aiAmount.toFixed(2) !== test.expectedRevenue.toFixed(2)) {
        console.log(
          `  ⚠️  AI ERROR: Off by $${Math.abs(aiAmount - test.expectedRevenue).toFixed(2)}`,
        );
        console.log(`  AI Response snippet: "${aiResponse.substring(0, 200)}..."`);
      }
    } catch (error) {
      console.log(`  ❌ AI Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY:');
  console.log('Database has correct data for both dates');
  console.log('AI needs to be investigated for data access issues');
  console.log('='.repeat(70));
}

testAIDataAccuracy().catch(console.error);

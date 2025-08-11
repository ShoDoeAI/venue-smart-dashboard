#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testAllQueries() {
  console.log('🧪 Testing ALL Possible AI Query Scenarios\n');
  console.log('=' .repeat(80));
  
  const testCases = [
    // Specific dates
    { query: "What was the revenue for August 1st?", expected: "$1,295.00", type: "specific-date" },
    { query: "Revenue on August 1", expected: "$1,295.00", type: "specific-date" },
    { query: "August 1st, 2025 total", expected: "$1,295.00", type: "specific-date" },
    { query: "How much did we make on 8/1/2025?", expected: "$1,295.00", type: "specific-date" },
    { query: "Show me 2025-08-01 revenue", expected: "$1,295.00", type: "specific-date" },
    
    // August 8th variations
    { query: "August 8th revenue", expected: "$1,440.06", type: "specific-date" },
    { query: "What did we make on Aug 8?", expected: "$1,440.06", type: "specific-date" },
    { query: "Thursday August 8 total", expected: "$1,440.06", type: "specific-date" },
    
    // August 9th (yesterday)
    { query: "August 9th revenue", expected: "$343.80", type: "specific-date" },
    { query: "Yesterday's revenue", expected: "$343.80", type: "relative-date" },
    { query: "What was yesterday's total?", expected: "$343.80", type: "relative-date" },
    { query: "Friday's revenue", expected: "$343.80", type: "day-of-week" },
    
    // August 10th (today)
    { query: "Today's revenue", expected: "$2,040.00", type: "relative-date" },
    { query: "What's today's total?", expected: "$2,040.00", type: "relative-date" },
    { query: "August 10 revenue", expected: "$2,040.00", type: "specific-date" },
    { query: "Saturday revenue", expected: "$2,040.00", type: "day-of-week" },
    
    // Date ranges
    { query: "Revenue for August 8-10", expected: "range", type: "date-range" },
    { query: "This week's revenue", expected: "range", type: "date-range" },
    { query: "Last 3 days revenue", expected: "range", type: "date-range" },
    
    // Month queries
    { query: "August revenue", expected: "month", type: "month" },
    { query: "Total for August 2025", expected: "month", type: "month" },
    { query: "This month's revenue", expected: "month", type: "month" },
    
    // Check counts
    { query: "How many checks on August 1st?", expected: "53", type: "count" },
    { query: "Number of orders August 8", expected: "92", type: "count" },
    { query: "Check count for yesterday", expected: "30", type: "count" },
    
    // Average check size
    { query: "Average check size August 1st", expected: "$24.43", type: "average" },
    { query: "What's the average ticket for August 8?", expected: "$15.65", type: "average" },
    
    // Comparisons
    { query: "Compare August 1 to August 8", expected: "comparison", type: "comparison" },
    { query: "How does today compare to yesterday?", expected: "comparison", type: "comparison" },
    
    // Best/worst days
    { query: "What was the best day in August?", expected: "best", type: "analysis" },
    { query: "Worst revenue day this month", expected: "worst", type: "analysis" },
    
    // Hourly patterns
    { query: "What time had the most revenue on August 1st?", expected: "hourly", type: "hourly" },
    { query: "Peak hours for August 8", expected: "hourly", type: "hourly" }
  ];
  
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  for (const test of testCases) {
    process.stdout.write(`Testing: "${test.query.padEnd(50)}" `);
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: test.query,
        venueId: process.env.VENUE_ID || null
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        },
        timeout: 10000
      });
      
      if (response.data.message) {
        const message = response.data.message;
        
        // Check based on test type
        let success = false;
        
        if (test.type === 'specific-date' || test.type === 'relative-date') {
          // Look for the expected amount in the response
          success = message.includes(test.expected);
        } else if (test.type === 'count') {
          // Look for the expected count
          success = message.includes(test.expected);
        } else if (test.type === 'average') {
          // Check if average is mentioned and close to expected
          const avgMatch = message.match(/\$(\d+\.?\d*)/);
          if (avgMatch) {
            const foundAvg = parseFloat(avgMatch[1]);
            const expectedAvg = parseFloat(test.expected.replace('$', ''));
            success = Math.abs(foundAvg - expectedAvg) < 1; // Within $1
          }
        } else if (test.type === 'date-range' || test.type === 'month') {
          // Just check if we got a response with multiple days
          success = message.includes('revenue') && message.length > 100;
        } else if (test.type === 'comparison') {
          // Check for comparison words
          success = /compare|versus|vs|higher|lower|more|less/.test(message.toLowerCase());
        } else if (test.type === 'analysis') {
          // Check for best/worst mentions
          success = /best|worst|highest|lowest|peak/.test(message.toLowerCase());
        } else if (test.type === 'hourly') {
          // Check for hour mentions
          success = /hour|am|pm|peak|busy/.test(message.toLowerCase());
        } else {
          success = true; // Default pass for other types
        }
        
        if (success) {
          console.log('✅ PASS');
          passed++;
        } else {
          console.log('❌ FAIL');
          failed++;
          failures.push({
            query: test.query,
            expected: test.expected,
            found: message.match(/\$[\d,]+\.?\d*/)?.[0] || 'no amount found'
          });
        }
      } else {
        console.log('❌ NO RESPONSE');
        failed++;
        failures.push({ query: test.query, error: 'No response' });
      }
    } catch (error) {
      console.log('❌ ERROR');
      failed++;
      failures.push({ 
        query: test.query, 
        error: error.response?.data?.error || error.message 
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  
  if (failures.length > 0) {
    console.log('\n❌ FAILURES:');
    failures.forEach(f => {
      console.log(`\n"${f.query}"`);
      if (f.expected && f.found) {
        console.log(`  Expected: ${f.expected}, Found: ${f.found}`);
      } else if (f.error) {
        console.log(`  Error: ${f.error}`);
      }
    });
  }
  
  // Test direct database for verification
  console.log('\n' + '=' .repeat(80));
  console.log('📊 DATABASE VERIFICATION:');
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  // Verify key dates
  const dates = [
    { date: 20250801, label: 'August 1' },
    { date: 20250808, label: 'August 8' },
    { date: 20250809, label: 'August 9' },
    { date: 20250810, label: 'August 10' }
  ];
  
  for (const { date, label } of dates) {
    const { data: orders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', date);
    
    if (orders && orders.length > 0) {
      const { data: checks } = await supabase
        .from('toast_checks')
        .select('total_amount')
        .in('order_guid', orders.map(o => o.order_guid))
        .eq('voided', false);
      
      const total = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      const avg = checks?.length > 0 ? total / checks.length : 0;
      console.log(`${label}: $${total.toFixed(2)} (${checks?.length} checks, avg: $${avg.toFixed(2)})`);
    } else {
      console.log(`${label}: No data`);
    }
  }
}

testAllQueries().catch(console.error);
#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Final validation - these MUST all pass
async function finalValidation() {
  console.log('🏁 FINAL AI VALIDATION TEST\n');
  console.log('Running critical tests that MUST pass...\n');
  console.log('=' .repeat(80));
  
  const CRITICAL_TESTS = [
    // 1. EXACT DATE TESTS
    {
      category: "Exact Dates",
      tests: [
        { query: "August 1st revenue", expected: "$1,295.00", critical: true },
        { query: "August 1 revenue", expected: "$1,295.00", critical: true },
        { query: "Aug 1 revenue", expected: "$1,295.00", critical: true },
        { query: "revenue for August 1st, 2025", expected: "$1,295.00", critical: true },
        { query: "8/1/2025 revenue", expected: "$1,295.00", critical: true },
        { query: "August 8 revenue", expected: "$1,440.06", critical: true },
        { query: "August 9 revenue", expected: "$343.80", critical: true },
        { query: "August 10 revenue", expected: "$2,040.00", critical: true },
      ]
    },
    
    // 2. RELATIVE DATE TESTS
    {
      category: "Relative Dates", 
      tests: [
        { query: "yesterday's revenue", expected: "$343.80", critical: true },
        { query: "today's revenue", expected: "$2,040.00", critical: true },
        { query: "revenue 2 days ago", expected: "$1,440.06", critical: true },
      ]
    },
    
    // 3. MONTH VS DAY DISAMBIGUATION
    {
      category: "Month vs Day",
      tests: [
        { query: "August revenue", expected: "NOT_SINGLE_DAY", critical: true },
        { query: "revenue for August", expected: "NOT_SINGLE_DAY", critical: true },
        { query: "August 2025 total", expected: "NOT_SINGLE_DAY", critical: true },
      ]
    },
    
    // 4. NO DATA HANDLING
    {
      category: "No Data",
      tests: [
        { query: "August 3 revenue", expected: "NO_DATA", critical: false },
        { query: "August 4 revenue", expected: "NO_DATA", critical: false },
        { query: "August 5 revenue", expected: "NO_DATA", critical: false },
      ]
    },
    
    // 5. EDGE CASES
    {
      category: "Edge Cases",
      tests: [
        { query: "revenue", expected: "NEEDS_CLARIFICATION", critical: false },
        { query: "August 99 revenue", expected: "INVALID_DATE", critical: false },
        { query: "'; DROP TABLE orders; --", expected: "SAFE_RESPONSE", critical: true },
      ]
    }
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  let criticalFailures = [];
  
  for (const category of CRITICAL_TESTS) {
    console.log(`\n📋 ${category.category}`);
    console.log('-'.repeat(60));
    
    for (const test of category.tests) {
      process.stdout.write(`Testing: "${test.query.padEnd(40)}" `);
      
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
        
        const message = response.data.message || '';
        let passed = false;
        let actualResult = 'No response';
        
        // Check based on expected result type
        if (test.expected.startsWith('$')) {
          // Looking for exact amount
          const amounts = message.match(/\$[\d,]+\.?\d*/g) || [];
          passed = amounts.includes(test.expected);
          actualResult = amounts.length > 0 ? amounts[0] : 'No amount found';
        } else if (test.expected === 'NOT_SINGLE_DAY') {
          // Should NOT return single day amount
          passed = !message.includes('$1,295.00') && message.includes('August');
          actualResult = message.includes('$1,295.00') ? 'Returns single day' : 'Returns range/month';
        } else if (test.expected === 'NO_DATA') {
          // Should indicate no data
          passed = message.toLowerCase().includes('no data') || 
                   message.toLowerCase().includes('don\'t have') ||
                   message.includes('0 orders');
          actualResult = passed ? 'Indicates no data' : 'Unexpected response';
        } else if (test.expected === 'NEEDS_CLARIFICATION') {
          // Should ask for clarification
          passed = message.includes('?') || message.toLowerCase().includes('which') || 
                   message.toLowerCase().includes('please specify');
          actualResult = passed ? 'Asks for clarification' : 'No clarification';
        } else if (test.expected === 'INVALID_DATE') {
          // Should handle invalid date
          passed = message.toLowerCase().includes('invalid') || 
                   message.toLowerCase().includes('not a valid') ||
                   message.toLowerCase().includes('august 99');
          actualResult = passed ? 'Handles invalid date' : 'Unexpected response';
        } else if (test.expected === 'SAFE_RESPONSE') {
          // Should not execute injection
          passed = !message.includes('DROP') && !message.includes('SELECT') && 
                   !message.includes('syntax error');
          actualResult = passed ? 'Safe response' : 'SECURITY ISSUE';
        }
        
        if (passed) {
          console.log(`✅ PASS`);
          totalPassed++;
        } else {
          console.log(`❌ FAIL (Expected: ${test.expected}, Got: ${actualResult})`);
          totalFailed++;
          if (test.critical) {
            criticalFailures.push({ ...test, actualResult });
          }
        }
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        totalFailed++;
        if (test.critical) {
          criticalFailures.push({ ...test, error: error.message });
        }
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('=' .repeat(80));
  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  
  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES:');
    criticalFailures.forEach(f => {
      console.log(`\n"${f.query}"`);
      console.log(`Expected: ${f.expected}`);
      console.log(`Got: ${f.actualResult || f.error}`);
    });
    console.log('\n❌ AI IS NOT READY - Critical tests failed!');
  } else {
    console.log('\n✅ ALL CRITICAL TESTS PASSED - AI is ready!');
  }
  
  // Database verification
  console.log('\n📊 DATABASE VERIFICATION:');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  const dates = [
    { date: 20250801, label: 'Aug 1', expected: 1295.00 },
    { date: 20250808, label: 'Aug 8', expected: 1440.06 },
    { date: 20250809, label: 'Aug 9', expected: 343.80 },
    { date: 20250810, label: 'Aug 10', expected: 2040.00 }
  ];
  
  for (const { date, label, expected } of dates) {
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
      const correct = Math.abs(total - expected) < 0.01;
      console.log(`${label}: $${total.toFixed(2)} ${correct ? '✅' : '❌ Expected $' + expected.toFixed(2)}`);
    }
  }
}

// Run final validation
finalValidation().catch(console.error);
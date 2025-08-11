#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// First verify the database has correct data
async function verifyDatabase() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  console.log('📊 DATABASE VERIFICATION:');
  console.log('-'.repeat(40));
  
  const dates = [
    { date: 20250801, expected: 1295.00 },
    { date: 20250808, expected: 1440.06 },
    { date: 20250809, expected: 343.80 },
    { date: 20250810, expected: 2040.00 }
  ];
  
  for (const { date, expected } of dates) {
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
      console.log(`${date}: $${total.toFixed(2)} ${correct ? '✅' : '❌ Expected $' + expected.toFixed(2)}`);
    }
  }
}

// Test critical AI queries
async function testCriticalQueries() {
  console.log('\n🎯 TESTING CRITICAL AI QUERIES:');
  console.log('='.repeat(60));
  
  const criticalTests = [
    { query: "What is the revenue for August 1st?", expected: "$1,295.00" },
    { query: "Revenue for August 8", expected: "$1,440.06" },
    { query: "Yesterday's revenue", expected: "$343.80" },
    { query: "Today's revenue", expected: "$2,040.00" },
    { query: "August 2025 total revenue", expected: "month total" }
  ];
  
  for (const test of criticalTests) {
    console.log(`\n📝 "${test.query}"`);
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: test.query,
        venueId: process.env.VENUE_ID || null
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        },
        timeout: 15000
      });
      
      if (response.data.message) {
        const amounts = response.data.message.match(/\$[\d,]+\.?\d*/g) || [];
        const correct = test.expected.includes('month') || amounts.includes(test.expected);
        
        console.log(`Expected: ${test.expected}`);
        console.log(`Found: ${amounts.join(', ') || 'no amounts'}`);
        console.log(`Result: ${correct ? '✅ CORRECT' : '❌ INCORRECT'}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
}

// Run tests
async function runTests() {
  await verifyDatabase();
  await testCriticalQueries();
}

runTests().catch(console.error);
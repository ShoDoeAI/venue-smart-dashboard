#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function verifyAIChat() {
  console.log('🔍 Verifying AI Chat Functionality\n');
  
  const queries = [
    {
      query: "What is the revenue for August 1st, 2025?",
      expected: "$1,295.00"
    },
    {
      query: "How much revenue did we make yesterday August 8th?",
      expected: "$1,993.06"
    },
    {
      query: "What's today's revenue so far?",
      expected: "Should show current day data"
    }
  ];
  
  for (const test of queries) {
    console.log(`\n📝 Testing: "${test.query}"`);
    console.log(`Expected: ${test.expected}`);
    console.log('-'.repeat(60));
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: test.query,
        venueId: process.env.VENUE_ID || null
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (response.data.message) {
        // Extract any dollar amounts from the response
        const amounts = response.data.message.match(/\$[\d,]+\.?\d*/g) || [];
        console.log('✅ Response received');
        console.log('   Found amounts:', amounts.join(', '));
        
        // Check if response mentions correct data
        if (test.expected.includes('$') && amounts.length > 0) {
          const matches = amounts.some(amount => amount === test.expected);
          console.log(`   Correct amount: ${matches ? '✅ YES' : '❌ NO'}`);
        }
        
        // Show first 200 chars of response
        console.log('   Preview:', response.data.message.substring(0, 200) + '...');
      } else {
        console.log('❌ No response message');
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
    }
  }
  
  // Also verify the actual database data
  console.log('\n\n📊 Verifying Database Data:');
  console.log('-'.repeat(60));
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  // Check August 1st
  const { data: aug1Orders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250801);
    
  if (aug1Orders) {
    const { data: aug1Checks } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .in('order_guid', aug1Orders.map(o => o.order_guid))
      .eq('voided', false);
      
    const aug1Total = aug1Checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    console.log(`✅ August 1st in DB: $${aug1Total.toFixed(2)} (${aug1Checks?.length || 0} checks)`);
  }
  
  // Check August 8th
  const { data: aug8Orders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250808);
    
  if (aug8Orders) {
    const { data: aug8Checks } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .in('order_guid', aug8Orders.map(o => o.order_guid))
      .eq('voided', false);
      
    const aug8Total = aug8Checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    console.log(`✅ August 8th in DB: $${aug8Total.toFixed(2)} (${aug8Checks?.length || 0} checks)`);
  }
}

verifyAIChat().catch(console.error);
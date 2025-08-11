#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testAIAccuracy() {
  console.log('🎯 Testing AI Chat Accuracy with Fixed Date Parsing\n');
  console.log('=' .repeat(60));
  
  const tests = [
    {
      query: "What is the exact revenue for August 1st, 2025?",
      expectedAmount: "$1,295.00",
      description: "Specific date - should return ONLY Aug 1"
    },
    {
      query: "How much revenue did we make on August 8th?", 
      expectedAmount: "$1,440.06",
      description: "Aug 8 - Thursday"
    },
    {
      query: "What was yesterday's revenue?",
      expectedAmount: "$343.80",
      description: "Aug 9 - Yesterday (Friday)"
    },
    {
      query: "Show me today's revenue",
      expectedAmount: "$2,040.00",
      description: "Aug 10 - Today (Saturday)"
    }
  ];
  
  for (const test of tests) {
    console.log(`\n📝 Test: ${test.description}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Expected: ${test.expectedAmount}`);
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
        // Extract dollar amounts from response
        const amounts = response.data.message.match(/\$[\d,]+\.?\d*/g) || [];
        
        // Check if expected amount is in response
        const correct = amounts.includes(test.expectedAmount);
        console.log(`Result: ${correct ? '✅ CORRECT' : '❌ INCORRECT'}`);
        
        if (amounts.length > 0) {
          console.log(`Found amounts: ${amounts.join(', ')}`);
        }
        
        // Show context
        if (response.data.context?.toastAnalytics) {
          const analytics = response.data.context.toastAnalytics;
          if (analytics.totalRevenue !== undefined) {
            console.log(`Context shows: $${analytics.totalRevenue.toFixed(2)}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ AI Accuracy Test Complete');
}

testAIAccuracy().catch(console.error);
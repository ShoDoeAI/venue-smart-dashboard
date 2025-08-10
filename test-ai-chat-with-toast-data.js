#!/usr/bin/env node

// Test AI chat with actual Toast data

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const CHAT_API_URL = 'https://venuesync.vercel.app/api/chat';

async function testAIChat() {
  console.log('🤖 Testing AI Chat with Toast Data\n');
  console.log('=' .repeat(60));
  
  const testQueries = [
    "What was today's revenue?",
    "What's the revenue for August 9th?",
    "How much revenue did we make on August 1st?",
    "What was last Saturday's revenue?",
    "Compare this week to last week",
    "What's the total revenue for August so far?",
    "Show me revenue trends for the last 7 days",
    "What was our best day last month?",
    "How many orders did we have on August 1st?",
    "What's the average check size this month?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('-' .repeat(60));
    
    try {
      const response = await axios.post(CHAT_API_URL, {
        message: query,
        venueId: process.env.VENUE_ID || null
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (response.data.message) {
        console.log('✅ Response:');
        console.log(response.data.message);
        
        if (response.data.context) {
          console.log('\n📊 Context:');
          console.log(`   Query Type: ${response.data.context.queryType}`);
          console.log(`   Time Range: ${response.data.context.timeRange || 'N/A'}`);
          console.log(`   Has Toast Data: ${response.data.context.hasToastData}`);
        }
      } else {
        console.log('❌ No message in response');
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

// Run test
testAIChat().catch(console.error);
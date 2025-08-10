#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testAugust1st() {
  console.log('🔍 Testing AI Chat for August 1st\n');
  
  try {
    const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
      message: "What was the exact revenue for August 1st, 2025? Please show the breakdown.",
      venueId: process.env.VENUE_ID || null
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    
    console.log('📊 Response:');
    console.log(response.data.message);
    
    if (response.data.context) {
      console.log('\n🔍 Debug Context:');
      console.log(JSON.stringify(response.data.context, null, 2));
    }
    
    if (response.data.visualizations) {
      console.log('\n📈 Visualizations:');
      console.log(JSON.stringify(response.data.visualizations, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAugust1st().catch(console.error);
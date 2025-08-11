#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function debugAIContext() {
  console.log('🔍 Debugging AI Context Data\n');
  
  try {
    const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
      message: "What is the exact revenue for August 1st, 2025? Please show the daily breakdown.",
      venueId: process.env.VENUE_ID || null
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    
    console.log('📊 Response Context:');
    console.log(JSON.stringify(response.data.context, null, 2));
    
    if (response.data.visualizations) {
      console.log('\n📈 Visualizations:');
      console.log(JSON.stringify(response.data.visualizations, null, 2));
    }
    
    console.log('\n💬 AI Response:');
    console.log(response.data.message.substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugAIContext().catch(console.error);
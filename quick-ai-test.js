const axios = require('axios');

async function testAI() {
  try {
    console.log('Testing AI chat...\n');
    
    const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
      message: 'What was the revenue in July 2025?',
      sessionId: 'test-' + Date.now()
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Response status:', response.status);
    console.log('AI Response:', response.data.response || 'No response');
    
    // Extract revenue amount if mentioned
    const revenueMatch = response.data.response.match(/\$[\d,]+(\.\d{2})?/);
    if (revenueMatch) {
      console.log('Revenue found:', revenueMatch[0]);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAI();
const axios = require('axios');

async function finalTest() {
  console.log('🔍 FINAL AI TEST\n');
  console.log('Testing with explicit date: February 14, 2025');
  console.log('Expected revenue: $4,337.24\n');
  
  try {
    const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
      message: "What was the exact revenue on February 14, 2025? Please check the Toast POS Analytics section in your context."
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const aiResponse = response.data.response;
    console.log('AI Response:');
    console.log('=' .repeat(50));
    console.log(aiResponse);
    console.log('=' .repeat(50));
    
    // Check result
    if (aiResponse.includes('4,337.24') || aiResponse.includes('4337.24')) {
      console.log('\n✅ SUCCESS! AI returned the correct revenue amount');
    } else if (aiResponse.includes('no data available') || aiResponse.includes("don't have")) {
      console.log('\n❌ FAILED - AI says no data available');
      console.log('\nThis means the context aggregator is not passing the data to the AI.');
    } else {
      console.log('\n⚠️  UNCLEAR - Check the response above');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

finalTest();
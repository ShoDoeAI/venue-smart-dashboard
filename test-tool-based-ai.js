const axios = require('axios');

async function testToolBasedAI() {
  console.log('🔧 Testing Tool-Based AI\n');
  
  const queries = [
    "What was the revenue on February 14, 2025?",
    "How much did we make on July 25, 2025?",
    "Show me revenue for August 10, 2025"
  ];
  
  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    console.log('Sending to /api/chat-tools endpoint...');
    
    try {
      const startTime = Date.now();
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat-tools', {
        message: query
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Response received in ${elapsed}s`);
      
      if (response.data.success) {
        const aiResponse = response.data.response;
        console.log('AI Response:', aiResponse.substring(0, 200) + '...');
        
        // Check for expected values
        const expectedValues = {
          "February 14, 2025": "4,337.24",
          "July 25, 2025": "10,286.75", 
          "August 10, 2025": "6,500.00"
        };
        
        let foundExpected = false;
        for (const [date, value] of Object.entries(expectedValues)) {
          if (query.includes(date.split(',')[0]) && aiResponse.includes(value)) {
            console.log(`✅ SUCCESS - Found expected revenue $${value}`);
            foundExpected = true;
            break;
          }
        }
        
        if (!foundExpected && (aiResponse.includes('no data') || aiResponse.includes("don't have"))) {
          console.log('❌ FAILED - AI says no data available');
        }
      } else {
        console.log('❌ Request failed:', response.data.error);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testToolBasedAI().catch(console.error);
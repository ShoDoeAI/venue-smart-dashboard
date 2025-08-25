const axios = require('axios');

async function testAIContext() {
  console.log('Testing AI Context for specific dates...\n');
  
  const testQueries = [
    {
      message: "What was the revenue on February 14, 2025?",
      expected: "$4,337.24"
    },
    {
      message: "Revenue for July 25, 2025",
      expected: "$10,286.75"
    },
    {
      message: "How much did we make on August 10, 2025?",
      expected: "$6,500.00"
    }
  ];
  
  for (const test of testQueries) {
    console.log(`\nQuery: "${test.message}"`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: test.message,
        conversationId: 'test-' + Date.now()
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const aiResponse = response.data.response || '';
      console.log('AI Response:', aiResponse.substring(0, 200) + '...');
      
      // Check if response contains the expected revenue
      if (aiResponse.includes(test.expected)) {
        console.log('✅ CORRECT - AI returned expected revenue');
      } else if (aiResponse.includes('no data available') || aiResponse.includes("don't have")) {
        console.log('❌ WRONG - AI says no data available');
      } else {
        console.log('⚠️  UNCLEAR - Check response manually');
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

testAIContext().catch(console.error);
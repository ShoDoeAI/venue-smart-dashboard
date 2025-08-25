const axios = require('axios');

async function testAugust10() {
  console.log('Testing AI response for August 10, 2025...\n');
  
  const queries = [
    'What was the revenue on August 10, 2025?',
    'Revenue for Aug 10 2025',
    'How much did we make on 08/10/2025?'
  ];
  
  for (const query of queries) {
    console.log(`Query: "${query}"`);
    
    try {
      const response = await axios.post(
        'https://venue-smart-dashboard.vercel.app/api/chat',
        {
          message: query,
          sessionId: 'test-aug10-' + Date.now()
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
      
      const aiResponse = response.data.response || 'No response';
      console.log('AI Response:');
      console.log(aiResponse.substring(0, 500) + '...\n');
      
      // Check if it mentions the correct amount
      if (aiResponse.includes('6500') || aiResponse.includes('6,500')) {
        console.log('✅ Correct amount mentioned!\n');
      } else {
        console.log('❌ Correct amount ($6,500) not found\n');
      }
      
    } catch (error) {
      console.log('Error:', error.message, '\n');
    }
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

testAugust10().catch(console.error);
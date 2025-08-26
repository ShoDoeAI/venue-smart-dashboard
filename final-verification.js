const axios = require('axios');

async function verifyAllDates() {
  console.log('🎉 FINAL VERIFICATION - Testing Multiple Dates\n');
  
  const testCases = [
    { query: "What was the revenue on February 14, 2025?", expected: "4,337.24" },
    { query: "How much did we make on July 25, 2025?", expected: "10,286.75" },
    { query: "Revenue for August 10, 2025", expected: "6,500.00" },
    { query: "Show me June 14, 2025 sales", expected: "3,750.40" },
    { query: "What about August 18, 2025?", expected: "no data" } // Closed day
  ];
  
  let successCount = 0;
  
  for (const test of testCases) {
    console.log(`Query: "${test.query}"`);
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: test.query
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      const aiResponse = response.data.response || '';
      
      if (test.expected === "no data") {
        if (aiResponse.toLowerCase().includes('no revenue data') || aiResponse.includes('closed') || aiResponse.includes('0.00')) {
          console.log('✅ Correctly identified as closed/no data day');
          successCount++;
        } else {
          console.log('❌ Expected no data but got:', aiResponse.substring(0, 100));
        }
      } else if (aiResponse.includes(test.expected)) {
        console.log(`✅ SUCCESS - Found expected revenue $${test.expected}`);
        successCount++;
      } else {
        console.log('❌ FAILED - Response:', aiResponse.substring(0, 150) + '...');
      }
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('========================================');
  console.log(`FINAL SCORE: ${successCount}/${testCases.length} tests passed`);
  
  if (successCount === testCases.length) {
    console.log('\n🎉 ALL TESTS PASSED! The AI is now returning 100% accurate revenue data!');
  }
}

verifyAllDates().catch(console.error);
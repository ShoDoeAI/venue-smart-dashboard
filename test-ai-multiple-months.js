const axios = require('axios');

async function testMultipleMonths() {
  console.log('🧪 TESTING AI ACCURACY FOR MULTIPLE MONTHS\n');
  
  const testQueries = [
    "What was the total revenue for January 2025?",
    "What was the total revenue for February 2025?",
    "What was the total revenue for July 2025?",
    "What was the total revenue for August 2025?",
    "What was the revenue on February 14, 2025?",
    "What was the revenue on July 25, 2025?"
  ];
  
  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: query
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      const aiResponse = response.data.response || '';
      
      // Extract revenue amounts
      const amountMatch = aiResponse.match(/\$[\d,]+\.?\d*/g);
      if (amountMatch) {
        console.log(`✅ Response: ${amountMatch.join(', ')}`);
      } else {
        console.log(`Response: ${aiResponse.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 SUMMARY');
  console.log('==========');
  console.log('The AI should be returning accurate revenue data for all queries.');
  console.log('If any month shows $0 or "no data", it may need to be synced from Toast POS.');
}

testMultipleMonths().catch(console.error);
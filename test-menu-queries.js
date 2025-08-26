const axios = require('axios');

async function testMenuQueries() {
  console.log('🍔 TESTING MENU ITEM QUERIES\n');
  
  const testCases = [
    {
      query: "What was the best selling item this month?",
      description: "Testing best seller query"
    },
    {
      query: "Show me the top 5 menu items for August 2025",
      description: "Testing specific month with limit"
    },
    {
      query: "What are the best selling appetizers?",
      description: "Testing category filter"
    },
    {
      query: "Menu performance for yesterday",
      description: "Testing yesterday's data"
    },
    {
      query: "Show me menu categories breakdown for last week",
      description: "Testing category breakdown"
    }
  ];
  
  for (const test of testCases) {
    console.log(`\n${test.description}`);
    console.log(`Query: "${test.query}"`);
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: test.query
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      const aiResponse = response.data.response || '';
      console.log('\nResponse:');
      console.log(aiResponse.substring(0, 500) + (aiResponse.length > 500 ? '...' : ''));
      
      // Check if response mentions menu items
      if (aiResponse.toLowerCase().includes('item') || 
          aiResponse.toLowerCase().includes('menu') ||
          aiResponse.toLowerCase().includes('sold')) {
        console.log('✅ Response appears to contain menu data');
      } else if (aiResponse.toLowerCase().includes('don\'t have') ||
                 aiResponse.toLowerCase().includes('cannot')) {
        console.log('❌ Response indicates no menu data access');
      } else {
        console.log('⚠️  Unclear if response contains menu data');
      }
      
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('\n' + '='.repeat(70));
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Menu query testing complete!');
}

testMenuQueries().catch(console.error);
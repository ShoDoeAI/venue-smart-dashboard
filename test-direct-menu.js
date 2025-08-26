const axios = require('axios');

async function testDirectMenuQuery() {
  console.log('🔍 Testing Direct Menu Query\n');
  
  // Very specific menu queries that should trigger the tool
  const queries = [
    {
      message: "query_menu_items for last week",
      description: "Direct tool name reference"
    },
    {
      message: "I need to know which menu items sold the most units last week. Please query the menu sales data.",
      description: "Explicit request for menu data"
    },
    {
      message: "Use your menu analytics tool to show me the best sellers",
      description: "Direct tool reference"
    },
    {
      message: "What was the #1 best selling food item by quantity in the last 7 days?",
      description: "Very specific menu query"
    }
  ];
  
  for (const {message, description} of queries) {
    console.log(`\nTest: ${description}`);
    console.log(`Query: "${message}"`);
    console.log('='.repeat(60));
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      const data = response.data;
      const responseText = data.response.toLowerCase();
      
      // Check for indicators that menu tool was used
      const indicators = {
        hasItemNames: /genny|high noon|beer|wine|cocktail|burger|pizza/i.test(responseText),
        hasQuantities: /\d+\s*(sold|units)/i.test(responseText),
        hasRevenue: /\$\d+/i.test(responseText),
        mentionsNoAccess: /don't have access|cannot access|not seeing/i.test(responseText),
        usedTools: data.metadata?.usedTools || false
      };
      
      console.log('\nAnalysis:');
      console.log('- Used tools:', indicators.usedTools);
      console.log('- Has item names:', indicators.hasItemNames);
      console.log('- Has quantities:', indicators.hasQuantities);
      console.log('- Has revenue:', indicators.hasRevenue);
      console.log('- Says no access:', indicators.mentionsNoAccess);
      
      if (indicators.hasItemNames || indicators.hasQuantities) {
        console.log('✅ Menu tool likely used successfully!');
      } else if (indicators.mentionsNoAccess) {
        console.log('❌ Menu tool NOT used - AI says no access');
      }
      
      console.log('\nResponse preview:');
      console.log(data.response.substring(0, 300) + '...');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

testDirectMenuQuery().catch(console.error);
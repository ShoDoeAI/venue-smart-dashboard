const axios = require('axios');

async function testLocalChat() {
  console.log('🧪 Testing Local Chat API with Menu Queries\n');
  
  // First, let's test if the API is reachable
  try {
    const healthCheck = await axios.get('http://localhost:3001/api/health').catch(e => null);
    if (!healthCheck) {
      console.log('⚠️  Backend not running on localhost:3001');
      console.log('Starting backend server first...\n');
    }
  } catch (e) {
    // Backend might not have a health endpoint
  }
  
  const queries = [
    "What's the best selling item for August 2025?",
    "Show me top menu items",
    "best seller last week",
    "menu item sales for yesterday"
  ];
  
  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    console.log('='.repeat(60));
    
    try {
      const response = await axios.post('http://localhost:3001/api/chat', {
        message: query
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      const data = response.data;
      console.log('\nSuccess:', data.success);
      console.log('Used Tools:', data.metadata?.usedTools || false);
      console.log('\nResponse Preview:');
      console.log(data.response.substring(0, 300) + '...');
      
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Also test the production API
async function testProductionChat() {
  console.log('\n\n🌐 Testing Production API\n');
  
  try {
    const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
      message: "What menu items sold well last week?"
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('Response includes menu data:', 
      response.data.response.toLowerCase().includes('sold') || 
      response.data.response.toLowerCase().includes('item'));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLocalChat()
  .then(() => testProductionChat())
  .catch(console.error);
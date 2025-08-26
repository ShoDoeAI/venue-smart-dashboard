const axios = require('axios');

async function testImprovedMenuQueries() {
  console.log('🧪 Testing Improved Menu Query Detection\n');
  console.log('Waiting 30 seconds for deployment...\n');
  
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const queries = [
    "What's the best seller?",
    "Show me top items", 
    "Menu performance today",
    "What food is popular?",
    "Best selling drinks",
    "What sold well yesterday?",
    "Top 5 products this week",
    "What's August 2025 best selling item?"
  ];
  
  let successCount = 0;
  
  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    console.log('='.repeat(50));
    
    try {
      const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
        message: query
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      const data = response.data;
      const responseText = data.response.toLowerCase();
      
      // Check if menu data was returned
      const hasMenuData = 
        /genny|high noon|beer|wine|item|sold \d+|quantity/.test(responseText) &&
        !/don't have access|cannot access|not seeing/.test(responseText);
      
      if (hasMenuData) {
        console.log('✅ Menu tool used successfully!');
        successCount++;
        
        // Extract some data if present
        const quantityMatch = responseText.match(/(\d+)\s*(sold|units)/);
        const priceMatch = responseText.match(/\$[\d,]+\.?\d*/);
        
        if (quantityMatch) console.log(`   Found quantity: ${quantityMatch[0]}`);
        if (priceMatch) console.log(`   Found price: ${priceMatch[0]}`);
      } else {
        console.log('❌ Menu tool NOT used');
        console.log(`   Response: ${data.response.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n\n📊 Results: ${successCount}/${queries.length} queries worked`);
  
  if (successCount >= 6) {
    console.log('🎉 Great improvement! Most queries are now working.');
  } else if (successCount >= 4) {
    console.log('👍 Better, but still room for improvement.');
  } else {
    console.log('🤔 Still needs work...');
  }
}

testImprovedMenuQueries().catch(console.error);
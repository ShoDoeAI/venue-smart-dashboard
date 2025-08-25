const axios = require('axios');

async function testMonth(month, year) {
  try {
    const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat', {
      message: `What was the total revenue in ${month} ${year}? Just give me the number.`,
      sessionId: 'test-' + Date.now()
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Extract revenue amount
    const revenueMatch = response.data.response.match(/\$[\d,]+(\.\d{2})?/);
    const revenue = revenueMatch ? revenueMatch[0] : 'Not found';
    
    console.log(`${month} ${year}: ${revenue}`);
  } catch (error) {
    console.log(`${month} ${year}: Error - ${error.message}`);
  }
}

async function runTests() {
  console.log('Testing AI Chat Revenue Queries');
  console.log('================================\n');
  
  // Test key months from each year
  const tests = [
    ['September', 2023],
    ['October', 2023],
    ['January', 2024],
    ['April', 2024],
    ['May', 2024],
    ['August', 2024],
    ['November', 2024],
    ['February', 2025],
    ['March', 2025],
    ['July', 2025],
    ['August', 2025]
  ];
  
  for (const [month, year] of tests) {
    await testMonth(month, year);
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  }
  
  console.log('\n✅ Testing complete!');
}

runTests();
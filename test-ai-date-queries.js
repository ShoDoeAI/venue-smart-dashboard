const axios = require('axios');

const API_URL = 'https://venue-smart-dashboard.vercel.app/api/chat-enhanced';

async function testDateQuery(query) {
  console.log(`\n🔍 Testing: "${query}"`);
  console.log('-'.repeat(50));
  
  try {
    const response = await axios.post(API_URL, {
      message: query,
      conversationId: 'test-' + Date.now()
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const content = response.data.content || '';
    
    // Extract revenue amount from response
    const revenueMatch = content.match(/\$[\d,]+\.?\d*/);
    const hasData = !content.includes('no data available') && !content.includes("don't have revenue data");
    
    if (hasData && revenueMatch) {
      console.log(`✅ SUCCESS: Found revenue ${revenueMatch[0]}`);
      console.log(`Response excerpt: ${content.substring(0, 150)}...`);
    } else if (content.includes('no data available') || content.includes("don't have revenue data")) {
      console.log(`❌ FAILED: AI says no data available`);
      console.log(`Response: ${content.substring(0, 200)}...`);
    } else {
      console.log(`⚠️  UNCLEAR: Response doesn't contain clear revenue data`);
      console.log(`Response: ${content.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🤖 AI DATE PARSER VERIFICATION TEST');
  console.log('====================================');
  console.log('Testing various date formats to ensure parser fix is working...\n');
  
  // Test the previously failing formats
  const testQueries = [
    // These were failing before the fix
    "What was the revenue on August 10, 2025?",
    "What was Feb 14th 2025 revenue?",
    "Revenue for February 14, 2025",
    
    // These should have been working already
    "How much did we make on 08/10/2025?",
    "What was revenue on 8/10/2025?",
    "Show me August 10th 2025 sales",
    
    // Additional formats to test
    "What was July 27, 2025 revenue?",
    "Revenue on June 14, 2025",
    "How much did we make on September 23, 2023?"
  ];
  
  for (const query of testQueries) {
    await testDateQuery(query);
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n✅ Test complete!');
  console.log('\nExpected results:');
  console.log('- August 10, 2025: $6,500.00');
  console.log('- February 14, 2025: $4,337.24');
  console.log('- July 27, 2025: $17,905.20');
  console.log('- June 14, 2025: $3,750.40');
  console.log('- September 23, 2023: $20,995.00');
}

runAllTests().catch(console.error);
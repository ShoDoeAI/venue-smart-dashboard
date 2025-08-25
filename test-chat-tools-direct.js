const axios = require('axios');

async function testChatToolsEndpoint() {
  console.log('🔍 Testing chat-tools endpoint directly\n');
  
  // First, let's check if the endpoint exists
  console.log('1. Checking if endpoint exists...');
  try {
    const headResponse = await axios.head('https://venue-smart-dashboard.vercel.app/api/chat-tools');
    console.log('✅ Endpoint exists (HEAD request successful)');
  } catch (error) {
    console.log('❌ HEAD request failed:', error.response?.status || error.message);
  }
  
  // Try OPTIONS request
  console.log('\n2. Testing OPTIONS request (CORS preflight)...');
  try {
    const optionsResponse = await axios.options('https://venue-smart-dashboard.vercel.app/api/chat-tools');
    console.log('✅ OPTIONS request successful');
    console.log('   Headers:', Object.keys(optionsResponse.headers).join(', '));
  } catch (error) {
    console.log('❌ OPTIONS request failed:', error.response?.status || error.message);
  }
  
  // Try GET request to see error message
  console.log('\n3. Testing GET request (should fail with 405)...');
  try {
    await axios.get('https://venue-smart-dashboard.vercel.app/api/chat-tools');
    console.log('⚠️  GET request succeeded (unexpected)');
  } catch (error) {
    if (error.response?.status === 405) {
      console.log('✅ GET request correctly rejected with 405');
    } else {
      console.log('❌ GET request failed with:', error.response?.status || error.message);
    }
  }
  
  // Try POST with empty body
  console.log('\n4. Testing POST with empty body...');
  try {
    const emptyResponse = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat-tools', {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Response:', emptyResponse.data);
  } catch (error) {
    console.log('❌ Empty POST failed:', error.response?.status, error.response?.data || error.message);
  }
  
  // Try POST with minimal valid body
  console.log('\n5. Testing POST with minimal message...');
  try {
    const minimalResponse = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat-tools', {
      message: "Hello"
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log('✅ Response received!');
    console.log('   Success:', minimalResponse.data.success);
    console.log('   Response preview:', minimalResponse.data.response?.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Minimal POST failed:', error.response?.status, error.response?.data || error.message);
  }
  
  // Try the actual revenue query
  console.log('\n6. Testing revenue query...');
  try {
    console.log('   Sending: "What was the revenue on February 14, 2025?"');
    const startTime = Date.now();
    
    const revenueResponse = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat-tools', {
      message: "What was the revenue on February 14, 2025?"
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
      validateStatus: () => true // Don't throw on any status
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`   Response in ${elapsed}s`);
    console.log('   Status:', revenueResponse.status);
    console.log('   Headers:', Object.keys(revenueResponse.headers).join(', '));
    
    if (revenueResponse.status === 200) {
      console.log('   Success:', revenueResponse.data.success);
      console.log('   Response:', revenueResponse.data.response?.substring(0, 200) + '...');
      
      if (revenueResponse.data.response?.includes('4,337.24') || revenueResponse.data.response?.includes('4337.24')) {
        console.log('\n   ✅ CORRECT REVENUE RETURNED!');
      } else {
        console.log('\n   ❌ Response does not contain expected revenue $4,337.24');
      }
    } else {
      console.log('   Response body:', revenueResponse.data);
    }
    
  } catch (error) {
    console.log('❌ Revenue query failed:', error.code || error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

testChatToolsEndpoint().catch(console.error);
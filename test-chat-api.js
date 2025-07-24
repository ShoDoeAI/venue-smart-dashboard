const https = require('https');

// Test data
const testMessages = [
  {
    name: "Basic Revenue Query",
    message: "What is the current revenue and how is business performing today?"
  },
  {
    name: "Toast Data Query",
    message: "Show me the top selling items from the past week"
  },
  {
    name: "Analytics Query",
    message: "What are our peak hours and busiest days?"
  },
  {
    name: "Trend Analysis",
    message: "How is our year-over-year growth looking?"
  }
];

// Function to test chat endpoint
async function testChatEndpoint(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      message: testCase.message,
      context: {}
    });

    const options = {
      hostname: 'venue-smart-dashboard.vercel.app',
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    console.log(`\n=== Testing: ${testCase.name} ===`);
    console.log(`Message: "${testCase.message}"`);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          console.log(`Status: ${res.statusCode}`);
          
          if (response.success) {
            console.log(`✅ Success!`);
            console.log(`Response: ${response.response.substring(0, 200)}...`);
            console.log(`Has Toast Data: ${response.dataContext?.hasToastData || false}`);
            console.log(`Has Dashboard Data: ${response.dataContext?.hasDashboardData || false}`);
          } else {
            console.log(`❌ Error: ${response.error}`);
          }
          
          resolve(response);
        } catch (error) {
          console.log(`❌ Parse Error: ${error.message}`);
          console.log(`Raw Response: ${responseData}`);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request Error: ${error.message}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Test dashboard endpoint
async function testDashboardEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'venue-smart-dashboard.vercel.app',
      path: '/api/dashboard',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log(`\n=== Testing Dashboard Endpoint ===`);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          console.log(`Status: ${res.statusCode}`);
          
          if (response.success) {
            console.log(`✅ Dashboard Success!`);
            console.log(`Current Revenue: $${response.kpis?.revenueMetrics?.current || 0}`);
            console.log(`Transactions: ${response.kpis?.transactionMetrics?.count || 0}`);
            console.log(`Toast Integration: ${response.snapshot?.api_data?.toast?.success ? '✅' : '❌'}`);
          } else {
            console.log(`❌ Error: ${response.error || 'Unknown error'}`);
          }
          
          resolve(response);
        } catch (error) {
          console.log(`❌ Parse Error: ${error.message}`);
          console.log(`Raw Response: ${responseData.substring(0, 500)}...`);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request Error: ${error.message}`);
      reject(error);
    });

    req.end();
  });
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting VenueSync API Tests\n');
  console.log('Testing production endpoints at: https://venue-smart-dashboard.vercel.app');
  
  // Test dashboard first
  try {
    await testDashboardEndpoint();
  } catch (error) {
    console.error('Dashboard test failed:', error.message);
  }

  // Test chat endpoints
  for (const testCase of testMessages) {
    try {
      await testChatEndpoint(testCase);
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Test failed for "${testCase.name}":`, error.message);
    }
  }

  console.log('\n✅ All tests completed!');
}

// Run the tests
runAllTests().catch(console.error);
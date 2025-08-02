const https = require('https');

const API_URL = 'venue-smart-dashboard.vercel.app';
const TEST_RESULTS = [];

// Helper function to make API requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testExistingFunctionality() {
  console.log('\n🧪 Testing Existing Functionality...\n');
  
  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const res = await makeRequest('/api/health');
        return res.status === 200 && res.data.status === 'ok';
      }
    },
    {
      name: 'Dashboard API',
      test: async () => {
        const res = await makeRequest('/api/dashboard');
        return res.status === 200 && res.data.success === true;
      }
    },
    {
      name: 'Regular Chat API',
      test: async () => {
        const res = await makeRequest('/api/chat', 'POST', {
          message: 'What is the current revenue today?',
          conversationId: 'test-regular'
        });
        return res.status === 200 && res.data.success === true;
      }
    }
  ];

  for (const test of tests) {
    try {
      const passed = await test.test();
      TEST_RESULTS.push({ name: test.name, passed, error: null });
      console.log(`${passed ? '✅' : '❌'} ${test.name}`);
    } catch (error) {
      TEST_RESULTS.push({ name: test.name, passed: false, error: error.message });
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

async function testChatDateParsing() {
  console.log('\n🧪 Testing Chat API Date Parsing...\n');
  
  const dateQueries = [
    { query: 'What was yesterday\'s revenue?', expectedTimeRange: 'yesterday' },
    { query: 'Show me last week\'s performance', expectedTimeRange: 'last week' },
    { query: 'How did we do last month?', expectedTimeRange: 'last month' },
    { query: 'What was the revenue on 2024-12-25?', expectedTimeRange: '2024-12-25' },
    { query: 'Show me the last 7 days', expectedTimeRange: 'last 7 days' },
    { query: 'Compare this week to last week', expectedTimeRange: 'this week' }
  ];

  for (const testCase of dateQueries) {
    try {
      const res = await makeRequest('/api/chat', 'POST', {
        message: testCase.query,
        conversationId: `test-date-${Date.now()}`
      });
      
      const passed = res.status === 200 && 
                    res.data.success === true &&
                    res.data.historicalQuery === true &&
                    res.data.timeRange === testCase.expectedTimeRange;
      
      TEST_RESULTS.push({ 
        name: `Date Parsing: "${testCase.query}"`, 
        passed,
        details: {
          historicalQuery: res.data.historicalQuery,
          timeRange: res.data.timeRange,
          expected: testCase.expectedTimeRange
        }
      });
      
      console.log(`${passed ? '✅' : '❌'} Date Parsing: "${testCase.query}"`);
      if (!passed) {
        console.log(`   Expected: ${testCase.expectedTimeRange}, Got: ${res.data.timeRange}`);
      }
    } catch (error) {
      TEST_RESULTS.push({ 
        name: `Date Parsing: "${testCase.query}"`, 
        passed: false, 
        error: error.message 
      });
      console.log(`❌ Date Parsing: "${testCase.query}": ${error.message}`);
    }
  }
}

async function testHistoricalDashboard() {
  console.log('\n🧪 Testing Historical Dashboard API...\n');
  
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const tests = [
    {
      name: 'Daily Granularity',
      path: `/api/dashboard-historical?startDate=${lastWeek.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}&granularity=daily`
    },
    {
      name: 'Weekly Granularity',
      path: `/api/dashboard-historical?startDate=${lastWeek.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}&granularity=weekly`
    },
    {
      name: 'Missing Parameters',
      path: '/api/dashboard-historical',
      expectError: true
    },
    {
      name: 'Invalid Date Format',
      path: '/api/dashboard-historical?startDate=invalid&endDate=2024-01-01',
      expectError: true
    }
  ];

  for (const test of tests) {
    try {
      const res = await makeRequest(test.path);
      const passed = test.expectError 
        ? res.status === 400 
        : res.status === 200 && res.data.success === true;
      
      TEST_RESULTS.push({ 
        name: `Historical Dashboard: ${test.name}`, 
        passed,
        details: {
          status: res.status,
          hasData: res.data?.trends?.length > 0
        }
      });
      
      console.log(`${passed ? '✅' : '❌'} Historical Dashboard: ${test.name}`);
      if (res.data?.summary) {
        console.log(`   Found ${res.data.trends?.length || 0} data points`);
      }
    } catch (error) {
      TEST_RESULTS.push({ 
        name: `Historical Dashboard: ${test.name}`, 
        passed: false, 
        error: error.message 
      });
      console.log(`❌ Historical Dashboard: ${test.name}: ${error.message}`);
    }
  }
}

async function testDatabaseViews() {
  console.log('\n🧪 Testing Database Views (via Chat API)...\n');
  
  // We'll test the views indirectly through the chat API
  const viewTests = [
    {
      name: 'Daily Summary View',
      message: 'Show me daily revenue for the past 3 days'
    },
    {
      name: 'Weekly Summary View', 
      message: 'What was the total revenue for last week?'
    },
    {
      name: 'Monthly Summary View',
      message: 'Show me last month\'s total revenue'
    }
  ];

  for (const test of viewTests) {
    try {
      const res = await makeRequest('/api/chat', 'POST', {
        message: test.message,
        conversationId: `test-view-${Date.now()}`
      });
      
      const passed = res.status === 200 && res.data.success === true;
      
      TEST_RESULTS.push({ 
        name: `Database View: ${test.name}`, 
        passed,
        details: {
          responseLength: res.data.response?.length || 0
        }
      });
      
      console.log(`${passed ? '✅' : '❌'} Database View: ${test.name}`);
    } catch (error) {
      TEST_RESULTS.push({ 
        name: `Database View: ${test.name}`, 
        passed: false, 
        error: error.message 
      });
      console.log(`❌ Database View: ${test.name}: ${error.message}`);
    }
  }
}

async function testHistoricalSync() {
  console.log('\n🧪 Testing Historical Sync Endpoint...\n');
  
  // Note: We can't actually run the sync without proper auth
  // So we'll test that the endpoint exists and returns appropriate errors
  
  try {
    const res = await makeRequest('/api/cron/sync-historical-data', 'POST');
    const passed = res.status === 401; // Should return unauthorized
    
    TEST_RESULTS.push({ 
      name: 'Historical Sync Endpoint Exists', 
      passed,
      details: {
        status: res.status,
        message: res.data.error
      }
    });
    
    console.log(`${passed ? '✅' : '❌'} Historical Sync Endpoint Exists (returns 401 as expected)`);
  } catch (error) {
    TEST_RESULTS.push({ 
      name: 'Historical Sync Endpoint', 
      passed: false, 
      error: error.message 
    });
    console.log(`❌ Historical Sync Endpoint: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Historical Data Tests');
  console.log('=' .repeat(50));
  
  await testExistingFunctionality();
  await testChatDateParsing();
  await testHistoricalDashboard();
  await testDatabaseViews();
  await testHistoricalSync();
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Summary\n');
  
  const passed = TEST_RESULTS.filter(t => t.passed).length;
  const failed = TEST_RESULTS.filter(t => !t.passed).length;
  
  console.log(`Total Tests: ${TEST_RESULTS.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / TEST_RESULTS.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    TEST_RESULTS.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.error || 'Test assertion failed'}`);
      if (t.details) {
        console.log(`    Details: ${JSON.stringify(t.details)}`);
      }
    });
  }
  
  console.log('\n✨ Testing Complete!');
}

// Execute tests
runAllTests().catch(console.error);
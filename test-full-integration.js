#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const ENVIRONMENTS = {
  production: {
    protocol: https,
    hostname: 'venue-smart-dashboard.vercel.app',
    port: 443
  },
  local: {
    protocol: http,
    hostname: 'localhost',
    port: 3000
  }
};

// Test cases for different endpoints
const API_TESTS = [
  {
    name: 'Health Check',
    endpoint: '/api/health',
    method: 'GET',
    expectedStatus: 200,
    validate: (response) => response.status === 'healthy'
  },
  {
    name: 'Dashboard Data',
    endpoint: '/api/dashboard',
    method: 'GET',
    expectedStatus: 200,
    validate: (response) => response.success && response.kpis
  },
  {
    name: 'Chat - Revenue Query',
    endpoint: '/api/chat',
    method: 'POST',
    body: {
      message: "What is today's revenue?"
    },
    expectedStatus: 200,
    validate: (response) => response.success && response.response
  },
  {
    name: 'Chat - Toast Integration',
    endpoint: '/api/chat',
    method: 'POST',
    body: {
      message: "Show me the top selling items and payment methods"
    },
    expectedStatus: 200,
    validate: (response) => response.success && response.response
  },
  {
    name: 'Alerts',
    endpoint: '/api/alerts',
    method: 'GET',
    expectedStatus: 200,
    validate: (response) => Array.isArray(response.alerts)
  }
];

// Helper function to make HTTP requests
function makeRequest(env, test) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, port } = ENVIRONMENTS[env];
    const data = test.body ? JSON.stringify(test.body) : '';
    
    const options = {
      hostname,
      port,
      path: test.endpoint,
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Test runner
async function runTest(env, test) {
  console.log(`\n📋 Testing: ${test.name}`);
  console.log(`   Endpoint: ${test.method} ${test.endpoint}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest(env, test);
    const duration = Date.now() - startTime;
    
    console.log(`   Status: ${result.status} (expected ${test.expectedStatus})`);
    console.log(`   Duration: ${duration}ms`);
    
    const statusOk = result.status === test.expectedStatus;
    const validationOk = test.validate ? test.validate(result.data) : true;
    
    if (statusOk && validationOk) {
      console.log(`   ✅ PASSED`);
      
      // Show relevant data for successful responses
      if (test.endpoint === '/api/dashboard' && result.data.kpis) {
        console.log(`   📊 Revenue: $${result.data.kpis.revenueMetrics?.current || 0}`);
        console.log(`   📊 Transactions: ${result.data.kpis.transactionMetrics?.count || 0}`);
      } else if (test.endpoint === '/api/chat' && result.data.response) {
        console.log(`   💬 Response preview: ${result.data.response.substring(0, 100)}...`);
        console.log(`   📊 Has Toast Data: ${result.data.dataContext?.hasToastData || false}`);
      }
    } else {
      console.log(`   ❌ FAILED`);
      if (!statusOk) {
        console.log(`   Expected status ${test.expectedStatus}, got ${result.status}`);
      }
      if (!validationOk) {
        console.log(`   Validation failed`);
      }
      if (result.parseError) {
        console.log(`   Parse error: ${result.parseError}`);
      }
      if (result.data.error) {
        console.log(`   Error: ${result.data.error}`);
      }
    }
    
    return { test: test.name, success: statusOk && validationOk, duration };
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { test: test.name, success: false, error: error.message };
  }
}

// Check Toast configuration
async function checkToastConfig() {
  console.log('\n🔧 Checking Toast POS Configuration');
  
  const envVars = [
    'TOAST_CLIENT_ID',
    'TOAST_CLIENT_SECRET',
    'TOAST_LOCATION_ID',
    'ANTHROPIC_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY'
  ];
  
  console.log('Required environment variables:');
  envVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const display = value ? `${value.substring(0, 10)}...` : 'NOT SET';
    console.log(`   ${status} ${varName}: ${display}`);
  });
}

// Main test runner
async function runAllTests() {
  console.log('🚀 VenueSync Full System Integration Test\n');
  console.log('Testing AI chat functionality and API integrations\n');
  
  // Check configuration
  await checkToastConfig();
  
  // Test production environment
  console.log('\n\n🌐 TESTING PRODUCTION ENVIRONMENT');
  console.log('URL: https://venue-smart-dashboard.vercel.app');
  
  const prodResults = [];
  for (const test of API_TESTS) {
    const result = await runTest('production', test);
    prodResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }
  
  // Summary
  console.log('\n\n📈 TEST SUMMARY');
  console.log('================');
  
  const passed = prodResults.filter(r => r.success).length;
  const failed = prodResults.filter(r => !r.success).length;
  const total = prodResults.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
  
  console.log('\nDetailed Results:');
  prodResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? `${result.duration}ms` : 'N/A';
    console.log(`${status} ${result.test} (${duration})`);
  });
  
  // Integration status
  console.log('\n\n🔌 INTEGRATION STATUS');
  console.log('=====================');
  
  const integrations = [
    { name: 'Toast POS', status: prodResults.some(r => r.test.includes('Toast') && r.success) },
    { name: 'Claude AI', status: prodResults.some(r => r.test.includes('Chat') && r.success) },
    { name: 'Dashboard API', status: prodResults.some(r => r.test === 'Dashboard Data' && r.success) },
    { name: 'Alert System', status: prodResults.some(r => r.test === 'Alerts' && r.success) }
  ];
  
  integrations.forEach(integration => {
    const status = integration.status ? '✅ Active' : '❌ Inactive';
    console.log(`${integration.name}: ${status}`);
  });
  
  console.log('\n✨ Test suite completed!');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});
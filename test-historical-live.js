const https = require('https');

console.log('🚀 Live Historical Data Testing\n');

// Test 1: Ask about specific historical periods
async function testHistoricalQueries() {
  console.log('📊 Testing Historical Queries:\n');
  
  const queries = [
    "What was yesterday's revenue?",
    "Show me last week's total revenue",
    "How much revenue did we make last month?",
    "What was the revenue on July 25, 2025?",
    "Compare this week's revenue to last week",
    "Show me the best day last week"
  ];

  for (const query of queries) {
    await testQuery(query);
    await sleep(2000); // Rate limiting
  }
}

function testQuery(message) {
  return new Promise((resolve) => {
    console.log(`\n❓ Asking: "${message}"`);
    
    const data = JSON.stringify({
      message,
      conversationId: `test-${Date.now()}`
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

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.success) {
            console.log(`✅ Historical Query: ${response.historicalQuery ? 'Yes' : 'No'}`);
            console.log(`📅 Time Range: ${response.timeRange || 'Current'}`);
            console.log(`💬 Response Preview: ${response.response.substring(0, 200)}...`);
            
            // Extract revenue if mentioned
            const revenueMatch = response.response.match(/\$[\d,]+\.?\d*/);
            if (revenueMatch) {
              console.log(`💰 Revenue Found: ${revenueMatch[0]}`);
            }
          } else {
            console.log(`❌ Error: ${response.error}`);
          }
        } catch (e) {
          console.log(`❌ Parse Error: ${e.message}`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request Error: ${e.message}`);
      resolve();
    });
    
    req.write(data);
    req.end();
  });
}

// Test 2: Check historical dashboard data
async function testHistoricalDashboard() {
  console.log('\n\n📈 Testing Historical Dashboard:\n');
  
  const periods = [
    { name: 'Last 7 days', days: 7 },
    { name: 'Last 30 days', days: 30 },
    { name: 'Yesterday', days: 1, startOffset: 1 }
  ];

  for (const period of periods) {
    await testDashboardPeriod(period);
    await sleep(1000);
  }
}

function testDashboardPeriod(period) {
  return new Promise((resolve) => {
    const today = new Date();
    const endDate = new Date(today);
    if (period.startOffset) {
      endDate.setDate(endDate.getDate() - period.startOffset);
    }
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - period.days);
    
    console.log(`\n📊 ${period.name}:`);
    console.log(`   From: ${startDate.toLocaleDateString()}`);
    console.log(`   To: ${endDate.toLocaleDateString()}`);
    
    const path = `/api/dashboard-historical?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&granularity=daily`;
    
    https.get(`https://venue-smart-dashboard.vercel.app${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.success) {
            console.log(`   ✅ Success: Retrieved ${data.trends?.length || 0} days of data`);
            if (data.summary?.revenue) {
              console.log(`   💰 Total Revenue: $${data.summary.revenue.total.toFixed(2)}`);
              console.log(`   📊 Daily Average: $${data.summary.revenue.average.toFixed(2)}`);
              console.log(`   📈 Growth: ${data.summary.revenue.growth}%`);
            }
            if (data.summary?.transactions) {
              console.log(`   🧾 Total Transactions: ${data.summary.transactions.total}`);
              console.log(`   💵 Avg Transaction: $${data.summary.transactions.avgValue.toFixed(2)}`);
            }
            if (data.insights?.bestPeriod) {
              console.log(`   🏆 Best Day: ${data.insights.bestPeriod.date} ($${data.insights.bestPeriod.revenue})`);
            }
          } else if (data.error) {
            console.log(`   ⚠️  ${data.error}`);
          }
        } catch (e) {
          console.log(`   ❌ Error: ${e.message}`);
        }
        resolve();
      });
    });
  });
}

// Test 3: Check current vs historical data
async function testDataComparison() {
  console.log('\n\n🔄 Testing Current vs Historical Data:\n');
  
  // Get current dashboard data
  const currentData = await getDashboardData();
  console.log('📊 Current Dashboard:');
  console.log(`   Today's Revenue: $${currentData.todayRevenue || 0}`);
  console.log(`   Today's Transactions: ${currentData.todayTransactions || 0}`);
  
  // Ask about historical comparison
  await testQuery("How does today's revenue compare to the average for the last 30 days?");
}

function getDashboardData() {
  return new Promise((resolve) => {
    https.get('https://venue-smart-dashboard.vercel.app/api/dashboard', (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.kpis || {});
        } catch (e) {
          resolve({});
        }
      });
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run all tests
async function runTests() {
  await testHistoricalQueries();
  await testHistoricalDashboard();
  await testDataComparison();
  
  console.log('\n\n✨ Testing Complete!');
  console.log('\n💡 Next Steps:');
  console.log('1. If you see "Toast credentials not found", the system is working but needs venue setup');
  console.log('2. To sync historical data, use the sync endpoint with your admin token');
  console.log('3. Once synced, all historical queries will show real revenue data');
}

runTests().catch(console.error);
// Test the dashboard API locally with real Toast data
const handler = require('./api/api/dashboard.js');

// Mock request and response objects
const mockReq = {
  method: 'GET',
  query: {}
};

const mockRes = {
  statusCode: 200,
  headers: {},
  setHeader: function(key, value) {
    this.headers[key] = value;
  },
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  end: function() {
    return this;
  },
  json: function(data) {
    console.log('\n📊 Dashboard API Response:\n');
    console.log('Success:', data.success);
    console.log('\n🏪 Location:', data.snapshot.api_data.toast.data.location.name);
    console.log('Location ID:', data.snapshot.api_data.toast.data.location.id);
    
    console.log('\n💰 Revenue Metrics:');
    console.log(`  Current: $${data.kpis.revenueMetrics.current.toLocaleString()}`);
    console.log(`  Growth: ${data.kpis.revenueMetrics.growth}%`);
    
    console.log('\n📈 Transaction Metrics:');
    console.log(`  Count: ${data.kpis.transactionMetrics.count}`);
    console.log(`  Average: $${data.kpis.transactionMetrics.avgAmount.toFixed(2)}`);
    
    console.log('\n🍺 Menu Categories:');
    data.categoryBreakdown.forEach(cat => {
      console.log(`  ${cat.name}: ${cat.percentage}% ($${cat.value.toLocaleString()})`);
    });
    
    if (data.snapshot.api_data.toast.data.menus.length > 0) {
      console.log('\n📋 Real Toast Menus:');
      data.snapshot.api_data.toast.data.menus.forEach(menu => {
        console.log(`  - ${menu.name} (${menu.visibility || 'POS'})`);
      });
    }
    
    console.log('\n✅ This data will be displayed in your dashboard!');
    return this;
  }
};

// Run the handler
console.log('🚀 Testing Dashboard API with Toast Integration...\n');
handler(mockReq, mockRes);
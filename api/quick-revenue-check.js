const axios = require('axios');

// Toast credentials
const CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function quickCheck() {
  console.log('🍺 Jack\'s on Water Street - Quick Revenue Check\n');
  
  try {
    // Login
    const auth = await axios.post('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT'
    });
    
    const token = auth.data.token.accessToken;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': LOCATION_ID
    };
    
    // Get specific date range
    console.log('Enter a date range to check:');
    console.log('Example: 2024-11-15 to 2024-11-17 (Friday to Sunday)\n');
    
    // For now, let's check last 7 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    
    console.log(`Checking ${start.toLocaleDateString()} to ${end.toLocaleDateString()}...\n`);
    
    const response = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${start.toISOString()}&endDate=${end.toISOString()}&pageSize=2000`,
      { headers }
    );
    
    const orders = response.data || [];
    console.log(`Found ${orders.length} orders\n`);
    
    // Calculate revenue by day
    const dailyRevenue = {};
    let totalRevenue = 0;
    let totalWithTax = 0;
    let totalTips = 0;
    let checkCount = 0;
    
    orders.forEach(order => {
      const date = new Date(order.createdDate).toLocaleDateString();
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { 
          revenue: 0, 
          tax: 0, 
          tips: 0, 
          total: 0, 
          orders: 0 
        };
      }
      
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach(check => {
          checkCount++;
          
          // Get amounts
          const amount = (check.amount || 0) / 100;
          const tax = (check.taxAmount || 0) / 100;
          const tip = (check.tipAmount || 0) / 100;
          const total = (check.totalAmount || 0) / 100;
          
          // Add to daily
          dailyRevenue[date].revenue += amount;
          dailyRevenue[date].tax += tax;
          dailyRevenue[date].tips += tip;
          dailyRevenue[date].total += total;
          dailyRevenue[date].orders++;
          
          // Add to totals
          totalRevenue += amount;
          totalWithTax += amount + tax;
          totalTips += tip;
        });
      }
    });
    
    // Display daily breakdown
    console.log('DAILY BREAKDOWN:');
    console.log('================');
    Object.entries(dailyRevenue).forEach(([date, data]) => {
      console.log(`\n${date}:`);
      console.log(`  Sales:    $${data.revenue.toFixed(2)}`);
      console.log(`  Tax:      $${data.tax.toFixed(2)}`);
      console.log(`  Tips:     $${data.tips.toFixed(2)}`);
      console.log(`  TOTAL:    $${data.total.toFixed(2)} (${data.orders} orders)`);
    });
    
    const grandTotal = Object.values(dailyRevenue).reduce((sum, day) => sum + day.total, 0);
    
    console.log('\n\nTOTALS FOR PERIOD:');
    console.log('==================');
    console.log(`Net Sales:        $${totalRevenue.toFixed(2)}`);
    console.log(`Sales + Tax:      $${totalWithTax.toFixed(2)}`);
    console.log(`Tips:             $${totalTips.toFixed(2)}`);
    console.log(`GRAND TOTAL:      $${grandTotal.toFixed(2)}`);
    console.log(`Total Checks:     ${checkCount}`);
    console.log(`Avg Check:        $${(grandTotal / checkCount).toFixed(2)}`);
    
    console.log('\n\n❓ WHICH TOTAL MATCHES YOUR TOAST REPORT?');
    console.log('The AI should be reporting the GRAND TOTAL (includes tax + tips)');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

quickCheck();
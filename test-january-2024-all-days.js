const axios = require('axios');
require('dotenv').config();

const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';

async function getToastToken() {
  const response = await axios.post(
    `${TOAST_BASE_URL}/authentication/v1/authentication/login`,
    {
      clientId: TOAST_CLIENT_ID,
      clientSecret: TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT'
    }
  );
  return response.data.token.accessToken;
}

async function testEveryDayInJanuary2024() {
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('🔍 Testing EVERY day in January 2024 (supposedly no data)...\n');

  let totalOrders = 0;
  let totalRevenue = 0;
  let daysWithData = [];

  // Test every single day in January 2024
  for (let day = 1; day <= 31; day++) {
    const businessDate = `202401${day.toString().padStart(2, '0')}`;
    
    try {
      const response = await axios.get(
        `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${businessDate}&page=1&pageSize=100`,
        { headers, timeout: 5000 }
      );
      
      const orders = response.data || [];
      
      if (orders.length > 0) {
        console.log(`✅ Jan ${day}, 2024: ${orders.length} orders`);
        daysWithData.push(day);
        totalOrders += orders.length;
        
        // Calculate revenue for this day
        orders.forEach(order => {
          if (order.checks && Array.isArray(order.checks)) {
            order.checks.forEach(check => {
              if (!check.deleted && !check.voided) {
                totalRevenue += check.totalAmount || 0;
              }
            });
          }
        });
      }
    } catch (error) {
      // Silent fail, just testing
    }
  }

  console.log('\n📊 JANUARY 2024 SUMMARY:');
  console.log(`Days with data: ${daysWithData.length} out of 31`);
  console.log(`Total orders: ${totalOrders}`);
  console.log(`Total revenue: $${totalRevenue.toFixed(2)}`);
  
  if (daysWithData.length > 0) {
    console.log(`Days with orders: ${daysWithData.join(', ')}`);
  }

  // Now test some other "missing" months
  console.log('\n\n🔍 Testing other "missing" months more thoroughly...\n');

  const testMonths = [
    { year: 2024, month: 7, name: 'July 2024' },
    { year: 2024, month: 12, name: 'December 2024' },
    { year: 2025, month: 4, name: 'April 2025' }
  ];

  for (const testMonth of testMonths) {
    let monthOrders = 0;
    let monthDays = 0;
    
    // Test multiple days throughout the month
    const testDays = [1, 5, 10, 12, 15, 18, 20, 22, 25, 28, 30];
    
    for (const day of testDays) {
      const businessDate = `${testMonth.year}${testMonth.month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
      
      try {
        const response = await axios.get(
          `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${businessDate}&page=1&pageSize=10`,
          { headers, timeout: 5000 }
        );
        
        const orders = response.data || [];
        if (orders.length > 0) {
          monthOrders += orders.length;
          monthDays++;
        }
      } catch (error) {
        // Silent
      }
    }
    
    if (monthDays > 0) {
      console.log(`✅ ${testMonth.name}: Found data on ${monthDays} days (${monthOrders}+ orders)`);
    } else {
      console.log(`❌ ${testMonth.name}: No data found on test days`);
    }
  }

  // Test with different date formats
  console.log('\n\n🔍 Testing different businessDate formats...\n');
  
  const formats = [
    { format: '20240115', desc: 'YYYYMMDD' },
    { format: '2024-01-15', desc: 'YYYY-MM-DD' },
    { format: '01/15/2024', desc: 'MM/DD/YYYY' },
    { format: '15-01-2024', desc: 'DD-MM-YYYY' }
  ];

  for (const fmt of formats) {
    try {
      const response = await axios.get(
        `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${fmt.format}&page=1&pageSize=1`,
        { headers, timeout: 5000 }
      );
      
      const orders = response.data || [];
      console.log(`${fmt.desc} (${fmt.format}): ${orders.length > 0 ? '✅ Works' : '❌ No data'}`);
    } catch (error) {
      console.log(`${fmt.desc} (${fmt.format}): ❌ Error ${error.response?.status || error.message}`);
    }
  }
}

testEveryDayInJanuary2024().catch(console.error);
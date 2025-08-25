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

async function testWeekendPattern() {
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('🔍 Testing weekend pattern theory - checking Fridays and Saturdays...\n');

  const monthsToTest = [
    { year: 2024, month: 1, name: 'January 2024' },
    { year: 2024, month: 2, name: 'February 2024' },
    { year: 2024, month: 3, name: 'March 2024' },
    { year: 2024, month: 4, name: 'April 2024' },
    { year: 2024, month: 5, name: 'May 2024' },
    { year: 2024, month: 7, name: 'July 2024' },
    { year: 2024, month: 8, name: 'August 2024' },
    { year: 2024, month: 10, name: 'October 2024' },
    { year: 2024, month: 12, name: 'December 2024' },
    { year: 2025, month: 1, name: 'January 2025' },
    { year: 2025, month: 4, name: 'April 2025' },
    { year: 2025, month: 5, name: 'May 2025' }
  ];

  for (const testMonth of monthsToTest) {
    console.log(`\n📅 ${testMonth.name}:`);
    
    let monthOrders = 0;
    let monthRevenue = 0;
    let daysWithData = [];
    
    // Get all Fridays and Saturdays in the month
    const fridaysAndSaturdays = [];
    const daysInMonth = new Date(testMonth.year, testMonth.month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(testMonth.year, testMonth.month - 1, day);
      const dayOfWeek = date.getDay();
      
      // 5 = Friday, 6 = Saturday
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        fridaysAndSaturdays.push({
          day,
          dayName: dayOfWeek === 5 ? 'Fri' : 'Sat'
        });
      }
    }
    
    // Test each Friday and Saturday
    for (const { day, dayName } of fridaysAndSaturdays) {
      const businessDate = `${testMonth.year}${testMonth.month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
      
      try {
        const response = await axios.get(
          `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${businessDate}&page=1&pageSize=100`,
          { headers, timeout: 5000 }
        );
        
        const orders = response.data || [];
        
        if (orders.length > 0) {
          daysWithData.push(`${dayName} ${day}`);
          monthOrders += orders.length;
          
          // Calculate revenue
          orders.forEach(order => {
            if (order.checks && Array.isArray(order.checks)) {
              order.checks.forEach(check => {
                if (!check.deleted && !check.voided) {
                  monthRevenue += check.totalAmount || 0;
                }
              });
            }
          });
        }
      } catch (error) {
        // Silent
      }
    }
    
    if (daysWithData.length > 0) {
      console.log(`  ✅ Found data on ${daysWithData.length} days: ${daysWithData.join(', ')}`);
      console.log(`     Total: ${monthOrders} orders, $${monthRevenue.toFixed(2)} revenue`);
    } else {
      console.log(`  ❌ No data found on Fridays/Saturdays`);
    }
  }

  // Also check if there are any other days with data
  console.log('\n\n🔍 Checking for data on other days of the week...\n');
  
  // Test a few Sundays, Mondays, etc. in months we know have data
  const otherDaysTest = [
    { date: '20240107', desc: 'Sunday, Jan 7, 2024' },
    { date: '20240108', desc: 'Monday, Jan 8, 2024' },
    { date: '20240109', desc: 'Tuesday, Jan 9, 2024' },
    { date: '20240110', desc: 'Wednesday, Jan 10, 2024' },
    { date: '20240111', desc: 'Thursday, Jan 11, 2024' },
    { date: '20240114', desc: 'Sunday, Jan 14, 2024' },
    { date: '20240118', desc: 'Thursday, Jan 18, 2024' }
  ];

  for (const test of otherDaysTest) {
    try {
      const response = await axios.get(
        `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${test.date}&page=1&pageSize=5`,
        { headers, timeout: 5000 }
      );
      
      const orders = response.data || [];
      if (orders.length > 0) {
        console.log(`✅ ${test.desc}: ${orders.length} orders`);
      }
    } catch (error) {
      // Silent
    }
  }
}

testWeekendPattern().catch(console.error);
#!/usr/bin/env node

/**
 * Toast API Weekend Data Test
 * Tests historical data from last weekend when the venue was open
 */

const axios = require('axios');

// Your Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

// API base URL (production)
const API_BASE = 'https://ws-api.toasttab.com';

console.log('🍞 Toast API Weekend Data Test\n');
console.log('Testing with your actual Toast account data...\n');

async function getToken() {
  try {
    console.log('🔐 Authenticating with Toast...');
    const response = await axios.post(
      `${API_BASE}/authentication/v1/authentication/login`,
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    console.log('✅ Authentication successful');
    return response.data.token.accessToken;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return null;
  }
}

async function getLastWeekendDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Calculate days since last Sunday
  const daysSinceSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
  
  // Last Sunday
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - daysSinceSunday);
  lastSunday.setHours(0, 0, 0, 0);
  
  // Last Saturday (day before Sunday)
  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() - 1);
  
  // Last Friday (day before Saturday)
  const lastFriday = new Date(lastSaturday);
  lastFriday.setDate(lastSaturday.getDate() - 1);
  
  return { lastFriday, lastSaturday, lastSunday };
}

async function fetchDayData(token, date, dayName) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
  };
  
  // Set date range for the full day
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  console.log(`\n📅 ${dayName} - ${startDate.toLocaleDateString()}`);
  console.log(`   Fetching: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  try {
    const response = await axios.get(
      `${API_BASE}/orders/v2/ordersBulk?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&pageSize=500`,
      { headers }
    );
    
    const orders = response.data || [];
    console.log(`   ✅ Found ${orders.length} orders`);
    
    if (orders.length > 0) {
      let totalRevenue = 0;
      let totalTips = 0;
      let totalChecks = 0;
      const hourlyData = {};
      const paymentTypes = {};
      const topItems = {};
      
      orders.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            totalChecks++;
            const amount = (check.totalAmount || 0) / 100;
            const tipAmount = (check.tipAmount || 0) / 100;
            totalRevenue += amount;
            totalTips += tipAmount;
            
            // Track hourly
            const orderTime = new Date(order.createdDate);
            const hour = orderTime.getHours();
            if (!hourlyData[hour]) {
              hourlyData[hour] = { count: 0, revenue: 0 };
            }
            hourlyData[hour].count++;
            hourlyData[hour].revenue += amount;
            
            // Track payment types
            if (check.payments) {
              check.payments.forEach(payment => {
                const type = payment.type || 'UNKNOWN';
                if (!paymentTypes[type]) {
                  paymentTypes[type] = 0;
                }
                paymentTypes[type] += (payment.amount || 0) / 100;
              });
            }
            
            // Track items
            if (check.selections) {
              check.selections.forEach(item => {
                const name = item.displayName || 'Unknown';
                if (!topItems[name]) {
                  topItems[name] = { count: 0, revenue: 0 };
                }
                topItems[name].count += item.quantity || 1;
                topItems[name].revenue += (item.price || 0) / 100 * (item.quantity || 1);
              });
            }
          });
        }
      });
      
      console.log(`\n   💰 Revenue Summary:`);
      console.log(`      Total Revenue: $${totalRevenue.toFixed(2)}`);
      console.log(`      Total Tips: $${totalTips.toFixed(2)}`);
      console.log(`      Total Checks: ${totalChecks}`);
      console.log(`      Average Check: $${(totalRevenue / totalChecks).toFixed(2)}`);
      
      console.log(`\n   💳 Payment Types:`);
      Object.entries(paymentTypes).forEach(([type, amount]) => {
        console.log(`      ${type}: $${amount.toFixed(2)}`);
      });
      
      console.log(`\n   ⏰ Peak Hours:`);
      const sortedHours = Object.entries(hourlyData)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5);
      sortedHours.forEach(([hour, data]) => {
        console.log(`      ${hour.padStart(2, '0')}:00 - ${data.count} orders, $${data.revenue.toFixed(2)}`);
      });
      
      console.log(`\n   🍔 Top 5 Items:`);
      const sortedItems = Object.entries(topItems)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5);
      sortedItems.forEach(([name, data]) => {
        console.log(`      ${name}: ${data.count} sold, $${data.revenue.toFixed(2)}`);
      });
      
      return { totalRevenue, totalChecks, orders: orders.length };
    } else {
      console.log(`   ℹ️  No orders found - Venue was likely closed`);
      return { totalRevenue: 0, totalChecks: 0, orders: 0 };
    }
    
  } catch (error) {
    console.error(`   ❌ Error fetching data:`, error.response?.data || error.message);
    return { totalRevenue: 0, totalChecks: 0, orders: 0 };
  }
}

async function testHistoricalData(token) {
  console.log('\n📊 Fetching Last Weekend Data (When Open)');
  console.log('================================================');
  
  const { lastFriday, lastSaturday, lastSunday } = getLastWeekendDates();
  
  // Fetch each day
  const fridayData = await fetchDayData(token, lastFriday, 'Friday');
  const saturdayData = await fetchDayData(token, lastSaturday, 'Saturday');
  const sundayData = await fetchDayData(token, lastSunday, 'Sunday');
  
  // Weekend totals
  console.log('\n📊 Weekend Summary');
  console.log('================================================');
  const weekendRevenue = fridayData.totalRevenue + saturdayData.totalRevenue + sundayData.totalRevenue;
  const weekendOrders = fridayData.orders + saturdayData.orders + sundayData.orders;
  
  console.log(`   Total Weekend Revenue: $${weekendRevenue.toFixed(2)}`);
  console.log(`   Total Weekend Orders: ${weekendOrders}`);
  console.log(`   Average per Day: $${(weekendRevenue / 3).toFixed(2)}`);
  
  // Check if this is sandbox data
  console.log('\n🔍 Data Validation:');
  if (weekendRevenue < 100 && weekendOrders > 0) {
    console.log('   ⚠️  WARNING: Revenue seems unusually low.');
    console.log('   This might be SANDBOX data (test data).');
    console.log('   Sandbox amounts are often in small values like $26.87');
  } else if (weekendRevenue === 0) {
    console.log('   ℹ️  No revenue found for the weekend.');
    console.log('   This could mean the venue was closed or no data is available.');
  } else {
    console.log('   ✅ Data appears to be from your production Toast account');
  }
  
  // Test current month data
  console.log('\n📅 Current Month Summary');
  console.log('================================================');
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthEnd = new Date();
  
  try {
    const monthResponse = await axios.get(
      `${API_BASE}/orders/v2/ordersBulk?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}&pageSize=1`,
      { 
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
        }
      }
    );
    console.log(`   Orders found this month: ${monthResponse.headers['x-total-count'] || 'Unknown'}`);
  } catch (error) {
    console.log('   Could not fetch month data');
  }
}

// Run the test
async function main() {
  const token = await getToken();
  if (token) {
    await testHistoricalData(token);
    
    console.log('\n\n💡 Next Steps:');
    console.log('1. If you see real revenue data above, your Toast integration is working correctly.');
    console.log('2. The AI chat at https://venue-smart-dashboard.vercel.app/ai has access to 2 years of this data.');
    console.log('3. You can ask the AI about weekend trends, best selling items, peak hours, etc.');
  } else {
    console.error('\n❌ Failed to authenticate. Please check your credentials.');
  }
}

main().catch(console.error);
const axios = require('axios');

// Toast credentials for Jack's on Water Street
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function getToastToken() {
  const response = await axios.post(
    'https://ws-api.toasttab.com/authentication/v1/authentication/login',
    {
      clientId: TOAST_CLIENT_ID,
      clientSecret: TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }
  );
  return response.data.token.accessToken;
}

async function testRevenueCalculation() {
  console.log('🔍 Testing Revenue Calculation for Jack\'s on Water Street\n');
  
  try {
    const token = await getToastToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };

    // Get last weekend's data
    const today = new Date();
    const lastSaturday = new Date(today);
    const dayOfWeek = lastSaturday.getDay();
    const daysToSaturday = dayOfWeek === 6 ? 7 : (dayOfWeek + 1);
    lastSaturday.setDate(lastSaturday.getDate() - daysToSaturday);
    lastSaturday.setHours(0, 0, 0, 0);
    
    const monday = new Date(lastSaturday);
    monday.setDate(monday.getDate() + 2);
    
    console.log(`Fetching orders from ${lastSaturday.toLocaleDateString()} to ${monday.toLocaleDateString()}...\n`);
    
    const response = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${lastSaturday.toISOString()}&endDate=${monday.toISOString()}&pageSize=1000`,
      { headers }
    );
    
    const orders = response.data || [];
    console.log(`Found ${orders.length} orders\n`);
    
    // Different ways to calculate revenue
    let method1Total = 0; // Using check.totalAmount
    let method2Total = 0; // Using check.amount
    let method3Total = 0; // Using selections prices
    let method4Total = 0; // Using payments
    
    // Sample some orders to debug
    const sampleOrders = orders.slice(0, 3);
    
    orders.forEach((order, idx) => {
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach(check => {
          // Method 1: totalAmount (most reliable)
          if (check.totalAmount !== undefined) {
            method1Total += check.totalAmount;
          }
          
          // Method 2: amount field
          if (check.amount !== undefined) {
            method2Total += check.amount;
          }
          
          // Method 3: Sum of selections
          if (check.selections) {
            check.selections.forEach(item => {
              if (item.price !== undefined) {
                method3Total += item.price * (item.quantity || 1);
              }
            });
          }
          
          // Method 4: Sum of payments
          if (check.payments) {
            check.payments.forEach(payment => {
              if (payment.amount !== undefined) {
                method4Total += payment.amount;
              }
            });
          }
        });
        
        // Debug first few orders
        if (idx < 3) {
          console.log(`\n📋 Order ${idx + 1} Debug:`);
          console.log(`Order ID: ${order.guid}`);
          console.log(`Created: ${new Date(order.createdDate).toLocaleString()}`);
          console.log(`Checks: ${order.checks.length}`);
          
          order.checks.forEach((check, checkIdx) => {
            console.log(`\n  Check ${checkIdx + 1}:`);
            console.log(`  - totalAmount: ${check.totalAmount} (${check.totalAmount ? '$' + (check.totalAmount/100).toFixed(2) : 'missing'})`);
            console.log(`  - amount: ${check.amount} (${check.amount ? '$' + (check.amount/100).toFixed(2) : 'missing'})`);
            console.log(`  - selections: ${check.selections ? check.selections.length : 0} items`);
            console.log(`  - payments: ${check.payments ? check.payments.length : 0}`);
            
            if (check.selections && check.selections.length > 0) {
              const selectionTotal = check.selections.reduce((sum, item) => 
                sum + (item.price || 0) * (item.quantity || 1), 0
              );
              console.log(`  - selections total: ${selectionTotal} ($${(selectionTotal/100).toFixed(2)})`);
            }
            
            if (check.payments && check.payments.length > 0) {
              const paymentTotal = check.payments.reduce((sum, payment) => 
                sum + (payment.amount || 0), 0
              );
              console.log(`  - payments total: ${paymentTotal} ($${(paymentTotal/100).toFixed(2)})`);
            }
          });
        }
      }
    });
    
    console.log('\n\n📊 REVENUE CALCULATION COMPARISON:');
    console.log('=====================================');
    console.log(`Method 1 (check.totalAmount): $${(method1Total/100).toFixed(2)}`);
    console.log(`Method 2 (check.amount):      $${(method2Total/100).toFixed(2)}`);
    console.log(`Method 3 (sum selections):    $${(method3Total/100).toFixed(2)}`);
    console.log(`Method 4 (sum payments):      $${(method4Total/100).toFixed(2)}`);
    
    console.log('\n🎯 RECOMMENDATION:');
    console.log('Use check.totalAmount as it includes tax, tips, and discounts');
    
    // Check which method the AI is using
    console.log('\n\n🤖 AI CALCULATION CHECK:');
    console.log('The AI chat.js is currently using check.totalAmount');
    console.log('This should be the correct total including tax and tips');
    
    if (Math.abs(method1Total - method4Total) > 100) { // More than $1 difference
      console.log('\n⚠️  WARNING: Large discrepancy between totalAmount and payments!');
      console.log('This might indicate refunds, voids, or data issues.');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testRevenueCalculation();
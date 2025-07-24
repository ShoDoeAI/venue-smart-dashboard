require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

console.log('\n🍞 VERIFYING YOUR TOAST RESTAURANT\n');
console.log('Using credentials from .env.local file...\n');

async function verify() {
  try {
    // Authenticate
    const authResponse = await axios.post(
      `${process.env.TOAST_BASE_URL}/authentication/v1/authentication/login`,
      {
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    console.log('✅ Authentication successful!\n');
    
    // Get restaurant info
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
    };
    
    const restaurantResponse = await axios.get(
      `${process.env.TOAST_BASE_URL}/restaurants/v1/restaurants/${process.env.TOAST_LOCATION_ID}`,
      { headers }
    );
    
    const restaurant = restaurantResponse.data;
    
    console.log('════════════════════════════════════════════');
    console.log('YOUR RESTAURANT INFORMATION:');
    console.log('════════════════════════════════════════════');
    console.log(`Name: ${restaurant.name}`);
    console.log(`Address: ${restaurant.address1}`);
    console.log(`City: ${restaurant.city}, ${restaurant.state} ${restaurant.zip}`);
    console.log(`Phone: ${restaurant.phone || 'Not set'}`);
    console.log(`Created: ${new Date(restaurant.createdDate).toLocaleDateString()}`);
    console.log('════════════════════════════════════════════\n');
    
    console.log('❓ IS THIS YOUR RESTAURANT? (YES/NO)\n');
    console.log('If NO, then you have the wrong location ID.\n');
    
    // Get some recent data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const ordersResponse = await axios.get(
      `${process.env.TOAST_BASE_URL}/orders/v2/ordersBulk?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&pageSize=10`,
      { headers }
    );
    
    const orders = ordersResponse.data || [];
    console.log(`Found ${orders.length} orders in the last 30 days (showing max 10)`);
    
    if (orders.length > 0) {
      console.log('\nSample order dates:');
      orders.slice(0, 5).forEach(order => {
        const date = new Date(order.createdDate);
        console.log(`  - ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\nYour Toast credentials might be incorrect.');
    } else if (error.response?.status === 404) {
      console.log('\nThe location ID might be wrong.');
    }
  }
}

verify();
const axios = require('axios');
require('dotenv').config();

const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
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

async function checkLocations() {
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`
  };

  console.log('🔍 Checking Toast locations and restaurants...\n');

  // Try to get restaurant groups
  try {
    console.log('1️⃣ Fetching restaurant groups...');
    const groupsResponse = await axios.get(
      `${TOAST_BASE_URL}/management/v1/groups`,
      { headers }
    );
    console.log('Groups:', groupsResponse.data);
  } catch (error) {
    console.log('Groups error:', error.response?.status, error.response?.statusText);
  }

  // Try to get restaurants
  try {
    console.log('\n2️⃣ Fetching restaurants...');
    const restaurantsResponse = await axios.get(
      `${TOAST_BASE_URL}/management/v1/restaurants`,
      { headers }
    );
    
    const restaurants = restaurantsResponse.data || [];
    console.log(`Found ${restaurants.length} restaurants`);
    
    restaurants.forEach((restaurant, index) => {
      console.log(`\nRestaurant ${index + 1}:`);
      console.log(`  Name: ${restaurant.name || 'Unknown'}`);
      console.log(`  GUID: ${restaurant.guid}`);
      console.log(`  External ID: ${restaurant.externalId || 'None'}`);
      console.log(`  Created: ${restaurant.createdDate}`);
      
      // Test if this restaurant has historical data
      if (restaurant.guid) {
        testRestaurantData(restaurant.guid, accessToken);
      }
    });
  } catch (error) {
    console.log('Restaurants error:', error.response?.status, error.response?.statusText);
    
    // If management API fails, try config API
    console.log('\n3️⃣ Trying config API...');
    try {
      // Try known location
      const configResponse = await axios.get(
        `${TOAST_BASE_URL}/config/v2/restaurants/bfb355cb-55e4-4f57-af16-d0d18c11ad3c`,
        { 
          headers: {
            ...headers,
            'Toast-Restaurant-External-ID': 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c'
          }
        }
      );
      console.log('Config response:', configResponse.data);
    } catch (configError) {
      console.log('Config error:', configError.response?.status);
    }
  }

  // Check if there are multiple locations under same restaurant
  console.log('\n\n4️⃣ Testing if restaurant has multiple locations...');
  const knownGuid = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
  
  // Test some common historical dates with known location
  const historicalDates = ['20240101', '20240715', '20231201', '20230601'];
  
  for (const date of historicalDates) {
    try {
      const response = await axios.get(
        `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${date}&page=1&pageSize=5`,
        {
          headers: {
            ...headers,
            'Toast-Restaurant-External-ID': knownGuid
          }
        }
      );
      
      const orders = response.data || [];
      if (orders.length > 0) {
        console.log(`\n🎉 FOUND HISTORICAL DATA for ${date}!`);
        console.log(`   Orders: ${orders.length}`);
        console.log(`   Restaurant GUID used: ${knownGuid}`);
        break;
      }
    } catch (error) {
      // Silent fail, just testing
    }
  }
}

async function testRestaurantData(restaurantGuid, token) {
  try {
    const response = await axios.get(
      `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=20240715&page=1&pageSize=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': restaurantGuid
        }
      }
    );
    
    const orders = response.data || [];
    if (orders.length > 0) {
      console.log(`    ✅ Has historical data for July 2024!`);
    }
  } catch (error) {
    // Silent fail
  }
}

checkLocations().catch(console.error);
import axios from 'axios';

// Toast API credentials
const TOAST_CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
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

async function fetchMenuDetails(accessToken: string) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('🍺 Jack\'s on Water Street - Menu Analysis\n');

  // Get all menus
  const menuResponse = await axios.get(
    `${TOAST_BASE_URL}/menus/v2/menus`,
    { headers }
  );
  
  const menus = menuResponse.data.menus || [];
  
  // Get details for each menu
  for (const menu of menus) {
    console.log(`\n📋 ${menu.name} Menu (ID: ${menu.guid})`);
    console.log(`   Status: ${menu.visibility || 'Active'}`);
    
    // Get menu items
    try {
      const itemsResponse = await axios.get(
        `${TOAST_BASE_URL}/menus/v2/menuItems`,
        {
          headers,
          params: {
            menuGuid: menu.guid,
            pageSize: 10
          }
        }
      );
      
      const items = itemsResponse.data.menuItems || [];
      console.log(`   Total items: ${items.length}`);
      
      if (items.length > 0) {
        console.log('   Sample items:');
        items.slice(0, 5).forEach((item: any) => {
          const price = item.price ? `$${(item.price / 100).toFixed(2)}` : 'Variable';
          console.log(`     - ${item.name}: ${price}`);
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not fetch items: ${error.response?.status}`);
    }
  }

  // Try to get restaurant configuration
  try {
    console.log('\n🏪 Restaurant Configuration:');
    const configResponse = await axios.get(
      `${TOAST_BASE_URL}/config/v2/restaurantInfo`,
      { headers }
    );
    
    const config = configResponse.data;
    console.log(`   Name: ${config.name || 'N/A'}`);
    console.log(`   Time Zone: ${config.timeZone || 'N/A'}`);
    console.log(`   Currency: ${config.currencyCode || 'USD'}`);
  } catch (error: any) {
    console.log('   ⚠️  Could not fetch config:', error.response?.status);
  }

  // Try different endpoints for orders
  console.log('\n📊 Testing Order Endpoints:');
  
  // Try v1 orders endpoint
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const ordersV1Response = await axios.get(
      `${TOAST_BASE_URL}/orders/v1/orders`,
      {
        headers,
        params: {
          restaurantGuid: TOAST_LOCATION_ID,
          date: yesterday.toISOString().split('T')[0] // YYYY-MM-DD format
        }
      }
    );
    
    console.log(`   Orders v1: Found ${ordersV1Response.data.orders?.length || 0} orders yesterday`);
  } catch (error: any) {
    console.log(`   Orders v1 error: ${error.response?.status} ${error.response?.statusText}`);
  }
}

async function main() {
  try {
    const accessToken = await getToastToken();
    await fetchMenuDetails(accessToken);
    
    console.log('\n✅ Analysis complete!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

main();
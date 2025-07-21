import axios from 'axios';

// Toast API credentials
const TOAST_CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';

async function getToastToken() {
  try {
    console.log('🔐 Authenticating with Toast API...');
    const response = await axios.post(
      `${TOAST_BASE_URL}/authentication/v1/authentication/login`,
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );
    
    console.log('✅ Authentication successful!');
    return response.data.token.accessToken;
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

async function fetchToastData(accessToken: string) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('\n📊 Fetching data for Jack\'s on Water Street...\n');

  // 1. Get Restaurant Info
  try {
    console.log('🏪 Fetching restaurant details...');
    const restaurantResponse = await axios.get(
      `${TOAST_BASE_URL}/restaurants/v1/restaurants/${TOAST_LOCATION_ID}`,
      { headers }
    );
    console.log('Restaurant:', {
      name: restaurantResponse.data.name,
      timezone: restaurantResponse.data.timezone,
      address: restaurantResponse.data.address
    });
  } catch (error: any) {
    console.log('⚠️  Restaurant info error:', error.response?.status, error.response?.statusText);
  }

  // 2. Get Today's Orders
  try {
    console.log('\n📝 Fetching today\'s orders...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ordersResponse = await axios.get(
      `${TOAST_BASE_URL}/orders/v2/orders`,
      {
        headers,
        params: {
          restaurantGuid: TOAST_LOCATION_ID,
          startDate: today.toISOString(),
          endDate: new Date().toISOString(),
          pageSize: 10
        }
      }
    );
    
    const orders = ordersResponse.data.orders || [];
    console.log(`Found ${orders.length} orders today`);
    
    if (orders.length > 0) {
      const totalRevenue = orders.reduce((sum: number, order: any) => 
        sum + (order.amounts?.totalAmount || 0), 0
      );
      console.log(`Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
      
      // Show first few orders
      console.log('\nRecent Orders:');
      orders.slice(0, 3).forEach((order: any, index: number) => {
        console.log(`  ${index + 1}. Order ${order.displayNumber}:`);
        console.log(`     - Time: ${new Date(order.createdDate).toLocaleTimeString()}`);
        console.log(`     - Amount: $${(order.amounts?.totalAmount / 100).toFixed(2)}`);
        console.log(`     - Items: ${order.checks?.[0]?.selections?.length || 0} items`);
      });
    }
  } catch (error: any) {
    console.log('⚠️  Orders error:', error.response?.status, error.response?.statusText);
  }

  // 3. Get Menu Items
  try {
    console.log('\n🍔 Fetching menu items...');
    const menuResponse = await axios.get(
      `${TOAST_BASE_URL}/menus/v2/menus`,
      { 
        headers,
        params: {
          restaurantGuid: TOAST_LOCATION_ID,
          pageSize: 5
        }
      }
    );
    
    const menus = menuResponse.data.menus || [];
    console.log(`Found ${menus.length} menus`);
    
    if (menus.length > 0) {
      console.log('Active Menus:', menus.map((m: any) => m.name).join(', '));
    }
  } catch (error: any) {
    console.log('⚠️  Menu error:', error.response?.status, error.response?.statusText);
  }

  // 4. Get Employees Currently Clocked In
  try {
    console.log('\n👥 Fetching employees...');
    const employeesResponse = await axios.get(
      `${TOAST_BASE_URL}/labor/v1/timeEntries`,
      {
        headers,
        params: {
          restaurantGuid: TOAST_LOCATION_ID,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      }
    );
    
    const timeEntries = employeesResponse.data.timeEntries || [];
    const clockedIn = timeEntries.filter((entry: any) => !entry.outDate);
    console.log(`Employees currently clocked in: ${clockedIn.length}`);
  } catch (error: any) {
    console.log('⚠️  Employee error:', error.response?.status, error.response?.statusText);
  }

  // 5. Get Inventory (if available)
  try {
    console.log('\n📦 Checking inventory access...');
    const inventoryResponse = await axios.get(
      `${TOAST_BASE_URL}/inventory/v1/inventory`,
      {
        headers,
        params: {
          restaurantGuid: TOAST_LOCATION_ID,
          pageSize: 5
        }
      }
    );
    
    console.log('Inventory items:', inventoryResponse.data.items?.length || 0);
  } catch (error: any) {
    console.log('⚠️  Inventory error:', error.response?.status, error.response?.statusText);
  }
}

async function main() {
  console.log('🚀 Testing Toast API Connection for Jack\'s on Water Street\n');
  
  try {
    const accessToken = await getToastToken();
    await fetchToastData(accessToken);
    
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

main();
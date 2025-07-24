// Simple Toast API test - minimal dependencies
const https = require('https');

console.log('🍞 Testing Toast API Locally\n');

// Your credentials
const CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

// Step 1: Test authentication
console.log('Testing authentication...');

const authData = JSON.stringify({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  userAccessType: 'TOAST_MACHINE_CLIENT'
});

const req = https.request({
  hostname: 'ws-api.toasttab.com',
  path: '/authentication/v1/authentication/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': authData.length
  }
}, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    
    if (res.statusCode === 200) {
      console.log('✅ Authentication successful!\n');
      
      const response = JSON.parse(data);
      const token = response.token.accessToken;
      
      // Step 2: Get restaurant name
      console.log('Fetching restaurant details...');
      
      https.get({
        hostname: 'ws-api.toasttab.com',
        path: `/restaurants/v1/restaurants/${LOCATION_ID}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': LOCATION_ID
        }
      }, (res2) => {
        let restaurantData = '';
        
        res2.on('data', (chunk) => {
          restaurantData += chunk;
        });
        
        res2.on('end', () => {
          if (res2.statusCode === 200) {
            const restaurant = JSON.parse(restaurantData);
            console.log('\n📍 YOUR RESTAURANT:');
            console.log('==================');
            console.log('Name:', restaurant.name);
            console.log('Address:', restaurant.address1);
            console.log('City:', restaurant.city, restaurant.state);
            console.log('\nIs this your restaurant? (YES/NO)');
          } else {
            console.log('Could not fetch restaurant:', res2.statusCode);
          }
        });
      }).on('error', (e) => {
        console.error('Error:', e);
      });
      
    } else {
      console.log('❌ Authentication failed');
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Connection error:', error);
});

req.write(authData);
req.end();
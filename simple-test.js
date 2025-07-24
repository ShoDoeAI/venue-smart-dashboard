console.log('Testing Toast credentials...\n');

console.log('Your Toast Configuration:');
console.log('Client ID:', 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7');
console.log('Location ID:', 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c');
console.log('API Host:', 'https://ws-api.toasttab.com');
console.log('\nThis is using PRODUCTION credentials.');

// Let's also check if axios is available
try {
  const axios = require('axios');
  console.log('\n✅ Axios is installed');
  
  // Quick connection test
  console.log('\nTesting connection to Toast API...');
  
  axios.post('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
    clientId: 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7',
    clientSecret: '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4',
    userAccessType: 'TOAST_MACHINE_CLIENT'
  })
  .then(response => {
    console.log('✅ Successfully connected to Toast!');
    console.log('Token received:', response.data.token.accessToken ? 'Yes' : 'No');
    
    // Now get restaurant name
    const token = response.data.token.accessToken;
    return axios.get('https://ws-api.toasttab.com/restaurants/v1/restaurants/bfb355cb-55e4-4f57-af16-d0d18c11ad3c', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c'
      }
    });
  })
  .then(response => {
    console.log('\n🍞 YOUR RESTAURANT:');
    console.log('===================');
    console.log('Name:', response.data.name);
    console.log('Address:', response.data.address1);
    console.log('City:', response.data.city + ', ' + response.data.state);
    console.log('\n❓ Is this your restaurant? This is the most important question!');
  })
  .catch(error => {
    console.log('❌ Error:', error.response?.data || error.message);
  });
  
} catch (e) {
  console.log('\n❌ Axios not found. Installing...');
  console.log('Run: npm install axios');
}
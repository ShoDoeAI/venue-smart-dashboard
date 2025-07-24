// Simple Toast API Test - No dependencies needed if you have node-fetch

async function testToast() {
  console.log('Testing Toast API Connection...\n');
  
  const credentials = {
    clientId: 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7',
    clientSecret: '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4',
    userAccessType: 'TOAST_MACHINE_CLIENT'
  };
  
  try {
    // First, make sure we have a way to make HTTP requests
    let fetch;
    try {
      fetch = require('node-fetch');
    } catch (e) {
      // Use the built-in fetch if available (Node 18+)
      if (typeof globalThis.fetch !== 'undefined') {
        fetch = globalThis.fetch;
      } else {
        console.log('Please install dependencies first:');
        console.log('npm install node-fetch');
        return;
      }
    }
    
    // Test the authentication endpoint
    console.log('1. Testing authentication...');
    const authResponse = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });
    
    console.log('   Response status:', authResponse.status);
    
    if (authResponse.status === 404) {
      console.log('   ❌ 404 Error - The API endpoint was not found');
      console.log('   This might mean the URL is incorrect or the API has changed');
      return;
    }
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.log('   ❌ Authentication failed:', authResponse.status);
      console.log('   Error:', errorText);
      return;
    }
    
    const authData = await authResponse.json();
    console.log('   ✅ Authentication successful!');
    console.log('   Token received:', authData.token?.accessToken ? 'Yes' : 'No');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('fetch is not defined')) {
      console.log('\nPlease install node-fetch:');
      console.log('npm install node-fetch');
    }
  }
}

testToast();
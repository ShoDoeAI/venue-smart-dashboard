#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function getToastToken() {
  const response = await fetch(
    'https://ws-api.toasttab.com/authentication/v1/authentication/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Toast auth failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.token.accessToken;
}

async function debugSyncData() {
  console.log('🔍 Debugging Toast Sync Data\n');
  
  const token = await getToastToken();
  
  // Check Aug 9 data
  const params = new URLSearchParams({
    businessDate: '20250809',
    pageSize: '5',
    page: '1'
  });
  
  const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Toast-Restaurant-External-ID': process.env.TOAST_RESTAURANT_GUID
    }
  });
  
  const orders = await response.json();
  
  console.log(`Found ${orders.length} orders for Aug 9`);
  
  if (orders.length > 0) {
    console.log('\nFirst order structure:');
    const firstOrder = orders[0];
    console.log('Order GUID:', firstOrder.guid);
    console.log('Has checks:', !!firstOrder.checks);
    console.log('Number of checks:', firstOrder.checks?.length || 0);
    console.log('Total amount:', firstOrder.totalAmount);
    
    if (firstOrder.checks && firstOrder.checks.length > 0) {
      console.log('\nFirst check:');
      const firstCheck = firstOrder.checks[0];
      console.log('Check GUID:', firstCheck.guid);
      console.log('Total amount:', firstCheck.totalAmount);
      console.log('Voided:', firstCheck.voided);
    }
    
    // Check if checks are in separate property
    console.log('\nOrder keys:', Object.keys(firstOrder));
  }
}

debugSyncData().catch(console.error);
#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function testToastSync() {
  console.log('Testing Toast Sync');
  console.log('==================\n');
  
  // Test Toast API directly
  const clientId = process.env.TOAST_CLIENT_ID;
  const clientSecret = process.env.TOAST_CLIENT_SECRET;
  const locationId = process.env.TOAST_LOCATION_GUID;
  
  if (!clientId || !clientSecret || !locationId) {
    console.log('Missing Toast credentials');
    return;
  }
  
  console.log('Toast Configuration:');
  console.log(`  Client ID: ${clientId.substring(0, 10)}...`);
  console.log(`  Location ID: ${locationId}`);
  console.log(`  Environment: ${process.env.TOAST_ENVIRONMENT || 'production'}`);
  
  try {
    // Get access token
    console.log('\nGetting access token...');
    const tokenResponse = await fetch('https://api.toasttab.com/authentication/v1/authentication/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.log('Failed to get token:', tokenData);
      return;
    }
    
    console.log('✓ Token obtained successfully');
    
    // Test API call - get recent checks
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    console.log(`\nFetching checks for ${yesterday} to ${today}...`);
    
    const checksResponse = await fetch(
      `https://api.toasttab.com/orders/v2/checks?locationIds=${locationId}&createdDate[gte]=${yesterday}&createdDate[lte]=${today}&pageSize=5`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.accessToken}`,
          'Toast-Restaurant-External-ID': locationId,
        }
      }
    );
    
    const checksData = await checksResponse.json();
    
    if (!checksResponse.ok) {
      console.log('Failed to get checks:', checksData);
      return;
    }
    
    console.log(`✓ Found ${checksData.length} checks`);
    
    if (checksData.length > 0) {
      console.log('\nSample checks:');
      checksData.slice(0, 3).forEach(check => {
        const total = (check.totalAmount || 0) / 100; // Convert cents to dollars
        console.log(`  ${check.createdDate}: $${total.toFixed(2)} (${check.paymentStatus})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testToastSync().catch(console.error);
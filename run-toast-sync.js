#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import and run the sync function
const syncToast = require('./api/sync-toast-1500.js');

// Create mock request and response objects
const mockReq = {
  method: 'POST',
  body: {
    limit: 500, // Fetch 500 orders
  },
};

const mockRes = {
  setHeader: () => {},
  status: (code) => ({
    json: (data) => {
      console.log(`Response Status: ${code}`);
      console.log(JSON.stringify(data, null, 2));
      process.exit(code === 200 ? 0 : 1);
    },
    end: () => {
      console.log(`Response Status: ${code}`);
      process.exit(0);
    },
  }),
};

console.log('Starting Toast sync for 1500 orders...');
console.log('Date range: Last 90 days');
console.log('-----------------------------------');

// Run the sync
syncToast(mockReq, mockRes).catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});

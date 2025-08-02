#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import the sync function
const syncHistorical = require('./api/sync-toast-historical.js');

// Create mock request and response objects
const mockReq = {
  method: 'POST',
  body: {
    // Fetch July 2025 specifically
    specificMonth: '2025-07',
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

console.log('Starting Toast historical sync for July 2025...');
console.log('-----------------------------------');

// Run the sync
syncHistorical(mockReq, mockRes).catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
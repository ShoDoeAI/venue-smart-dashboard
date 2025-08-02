#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const syncToast = require('./api/sync-toast-1500.js');

// Sync July 19, 2025
const mockReq = {
  method: 'POST',
  body: {
    limit: 500,
    startDate: '2025-07-19T00:00:00Z',
    endDate: '2025-07-19T23:59:59Z',
  },
};

const mockRes = {
  setHeader: () => {},
  status: (code) => ({
    json: (data) => {
      console.log(`Response Status: ${code}`);
      if (code === 200) {
        console.log(`\nSuccessfully synced ${data.summary.totalOrdersProcessed} orders for July 19, 2025`);
        console.log(`Total revenue: $${data.summary.totalRevenue}`);
        console.log(`Average order: $${data.summary.averageOrderValue}`);
      } else {
        console.log('Error:', data);
      }
      process.exit(code === 200 ? 0 : 1);
    },
    end: () => {
      process.exit(0);
    },
  }),
};

console.log('Fetching Toast data for July 19, 2025...');
console.log('======================================\n');

syncToast(mockReq, mockRes).catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
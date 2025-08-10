#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

// Mock request and response
const req = {
  query: {
    dates: '2025-08-08'
  }
};

const res = {
  status: (code) => ({
    json: (data) => {
      console.log(`Response [${code}]:`, JSON.stringify(data, null, 2));
    }
  })
};

// Run the sync
const syncHandler = require('./api/sync-toast-missing.js');
syncHandler(req, res).catch(console.error);
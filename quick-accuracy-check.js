const axios = require('axios');

const TOAST_CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
const SUPABASE_URL = 'https://bmhplnojfuznflbyqqze.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY';

async function getToastToken() {
  const response = await axios.post(
    `${TOAST_BASE_URL}/authentication/v1/authentication/login`,
    { clientId: TOAST_CLIENT_ID, clientSecret: TOAST_CLIENT_SECRET, userAccessType: 'TOAST_MACHINE_CLIENT' }
  );
  return response.data.token.accessToken;
}

async function checkSpecificDates() {
  console.log('🎯 QUICK ACCURACY CHECK FOR KEY DATES');
  console.log('=====================================\n');
  
  const accessToken = await getToastToken();
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Toast-Restaurant-External-ID': TOAST_LOCATION_ID };
  
  // Key dates to check
  const keyDates = [
    { date: '2025-08-10', businessDate: '20250810', expectedRevenue: 6500.00 },
    { date: '2025-02-14', businessDate: '20250214', expectedRevenue: 4337.24 },
    { date: '2025-07-27', businessDate: '20250727', expectedRevenue: 17905.20 },
    { date: '2025-06-14', businessDate: '20250614', expectedRevenue: 3750.40 }
  ];
  
  console.log('Checking database records...\n');
  
  for (const check of keyDates) {
    // Get database value
    const dbResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/revenue_overrides?date=eq.${check.date}&select=actual_revenue,check_count`,
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    
    const dbRecord = dbResponse.data[0];
    const dbRevenue = dbRecord ? parseFloat(dbRecord.actual_revenue) : 0;
    
    // Get Toast value
    let toastRevenue = 0;
    let toastChecks = 0;
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await axios.get(
          `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${check.businessDate}&page=${page}&pageSize=100`,
          { headers, timeout: 10000 }
        );
        
        const orders = response.data || [];
        
        if (orders.length === 0) {
          hasMore = false;
        } else {
          orders.forEach(order => {
            if (order.checks && Array.isArray(order.checks)) {
              order.checks.forEach(c => {
                if (!c.deleted && !c.voided && c.paidDate) {
                  toastRevenue += c.totalAmount || 0;
                  toastChecks++;
                }
              });
            }
          });
          
          hasMore = orders.length === 100;
          page++;
        }
      } catch (error) {
        hasMore = false;
      }
    }
    
    const match = Math.abs(dbRevenue - toastRevenue) <= 0.01;
    const icon = match ? '✅' : '❌';
    
    console.log(`${icon} ${check.date}:`);
    console.log(`   Database: $${dbRevenue.toFixed(2)}`);
    console.log(`   Toast:    $${toastRevenue.toFixed(2)}`);
    console.log(`   Expected: $${check.expectedRevenue.toFixed(2)}`);
    console.log(`   Match: ${match ? 'YES' : 'NO (diff: $' + Math.abs(dbRevenue - toastRevenue).toFixed(2) + ')'}\n`);
  }
  
  console.log('✨ Quick check complete!');
}

checkSpecificDates().catch(console.error);
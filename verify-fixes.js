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

async function verifyFixes() {
  console.log('🔍 Verifying Fixed Records\n');
  
  const accessToken = await getToastToken();
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Toast-Restaurant-External-ID': TOAST_LOCATION_ID };
  
  // Dates that were fixed
  const fixedDates = ['2023-09-23', '2024-01-01', '2025-06-14', '2025-07-18'];
  
  // Get current database values
  const dbResponse = await axios.get(
    `${SUPABASE_URL}/rest/v1/revenue_overrides?date=in.(${fixedDates.join(',')})&select=date,actual_revenue,check_count`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  
  const dbRecords = dbResponse.data;
  
  console.log('Date         | Database    | Toast API   | Status');
  console.log('-------------|-------------|-------------|--------');
  
  let allMatch = true;
  
  for (const record of dbRecords) {
    const businessDate = record.date.replace(/-/g, '');
    
    // Get Toast data (simplified - just first page for quick check)
    const toastResponse = await axios.get(
      `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${businessDate}&page=1&pageSize=100`,
      { headers, timeout: 10000 }
    );
    
    const orders = toastResponse.data || [];
    let toastRevenue = 0;
    let toastChecks = 0;
    
    orders.forEach(order => {
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach(check => {
          if (!check.deleted && !check.voided && check.paidDate) {
            toastRevenue += check.totalAmount || 0;
            toastChecks++;
          }
        });
      }
    });
    
    const dbRevenue = parseFloat(record.actual_revenue);
    const match = Math.abs(dbRevenue - toastRevenue) < 0.01 || (dbRevenue === 0 && toastRevenue === 0);
    
    console.log(
      `${record.date} | $${dbRevenue.toFixed(2).padStart(10)} | $${toastRevenue.toFixed(2).padStart(10)} | ${match ? '✅' : '❌'}`
    );
    
    if (!match) allMatch = false;
  }
  
  console.log('\n' + (allMatch ? '✅ All fixed records now match Toast POS!' : '❌ Some records still have mismatches'));
}

verifyFixes().catch(console.error);
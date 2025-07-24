const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function getToastToken() {
  const response = await axios.post(
    'https://ws-api.toasttab.com/authentication/v1/authentication/login',
    {
      clientId: TOAST_CLIENT_ID,
      clientSecret: TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }
  );
  return response.data.token.accessToken;
}

async function syncToastData(startDate, endDate) {
  const token = await getToastToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
  };

  console.log(`Fetching Toast data from ${startDate} to ${endDate}...`);
  
  // Fetch orders from Toast
  const response = await axios.get(
    `https://ws-api.toasttab.com/orders/v2/ordersBulk`,
    {
      headers,
      params: {
        startDate: startDate,
        endDate: endDate,
        pageSize: 10000
      }
    }
  );

  const orders = response.data || [];
  console.log(`Found ${orders.length} orders to sync`);

  // Prepare data for Supabase
  const transactions = [];
  const snapshotTimestamp = new Date().toISOString();
  
  orders.forEach(order => {
    if (order.checks && Array.isArray(order.checks)) {
      order.checks.forEach((check, checkIndex) => {
        // Skip voided checks
        if (check.voided || check.deleted) return;
        
        const transaction = {
          snapshot_timestamp: snapshotTimestamp,
          transaction_id: `${order.guid}_check_${checkIndex}`,
          location_id: TOAST_LOCATION_ID,
          created_at: order.createdDate,
          
          // Amounts (Toast provides in cents)
          total_amount: check.totalAmount || 0,
          tax_amount: check.taxAmount || 0,
          tip_amount: check.tipAmount || 0,
          discount_amount: check.discountAmount || 0,
          service_charge_amount: check.serviceChargeAmount || 0,
          
          // Transaction details
          source_type: check.paymentType || 'UNKNOWN',
          status: check.closedDate ? 'COMPLETED' : 'PENDING',
          receipt_number: order.orderNumber || null,
          
          // Customer info
          customer_name: check.guestName || null,
          customer_email: null, // Toast doesn't provide email in orders
          
          // Staff info
          team_member_id: check.employeeId || null,
          device_id: order.deviceId || null,
          
          // Item counts
          item_count: check.selections ? check.selections.length : 0,
          unique_item_count: check.selections ? 
            new Set(check.selections.map(s => s.itemId)).size : 0,
          
          // Complex data as JSONB
          itemizations: check.selections || [],
          payment_details: check.payments || [],
          refunds: check.refunds || []
        };
        
        transactions.push(transaction);
      });
    }
  });

  // Insert into Supabase
  if (transactions.length > 0) {
    console.log(`Inserting ${transactions.length} transactions into Supabase...`);
    
    // Insert in batches of 500
    const batchSize = 500;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('toast_transactions')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        throw error;
      }
      
      console.log(`Inserted batch ${i / batchSize + 1} of ${Math.ceil(transactions.length / batchSize)}`);
    }
  }

  // Update last successful fetch
  await supabase
    .from('api_credentials')
    .update({ 
      last_successful_fetch: new Date().toISOString(),
      last_error: null
    })
    .eq('service', 'toast');

  return {
    ordersProcessed: orders.length,
    transactionsCreated: transactions.length,
    dateRange: { start: startDate, end: endDate }
  };
}

// API endpoint handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.body;
    
    // Default to last 24 hours if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
    
    const result = await syncToastData(start.toISOString(), end.toISOString());
    
    res.status(200).json({
      success: true,
      message: 'Toast data synced to Supabase',
      ...result
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    
    // Update error in api_credentials
    await supabase
      .from('api_credentials')
      .update({ 
        last_error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('service', 'toast');
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
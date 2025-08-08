const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Daily Toast Total Verification
 * Runs every morning to ensure all recent dates match Toast exactly
 * Automatically creates overrides for any mismatches
 */

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

async function verifyDateRevenue(dateStr, token) {
  const businessDate = dateStr.replace(/-/g, '');
  
  // Get TRUE total from Toast
  let toastRevenue = 0;
  let checkCount = 0;
  let page = 1;
  
  while (page <= 10) {
    const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?` +
      `businessDate=${businessDate}&page=${page}&pageSize=100`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID
      }
    });
    
    if (!response.ok) break;
    
    const orders = await response.json();
    if (orders.length === 0) break;
    
    orders.forEach(order => {
      if (order.checks) {
        order.checks.forEach(check => {
          checkCount++;
          if (!check.voided) {
            toastRevenue += check.totalAmount || 0;
          }
        });
      }
    });
    
    if (orders.length < 100) break;
    page++;
  }
  
  // Get database total
  const { data: dbChecks } = await supabase
    .from('toast_checks')
    .select('total_amount, voided')
    .gte('created_date', dateStr + 'T00:00:00.000Z')
    .lt('created_date', dateStr + 'T23:59:59.999Z');
  
  const dbRevenue = dbChecks
    ? dbChecks.filter(c => !c.voided).reduce((sum, c) => sum + (c.total_amount || 0), 0)
    : 0;
  
  // If mismatch, create override
  const difference = Math.abs(toastRevenue - dbRevenue);
  if (difference > 1 && toastRevenue > 0) {
    await supabase
      .from('revenue_overrides')
      .upsert({
        date: dateStr,
        actual_revenue: toastRevenue,
        check_count: checkCount,
        notes: `Auto-verified: Toast shows $${toastRevenue.toFixed(2)}, DB shows $${dbRevenue.toFixed(2)}`
      });
    
    return {
      date: dateStr,
      status: 'override_created',
      toastRevenue,
      dbRevenue,
      difference
    };
  }
  
  return {
    date: dateStr,
    status: 'matched',
    toastRevenue,
    dbRevenue,
    difference
  };
}

module.exports = async (req, res) => {
  // Verify cron secret
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  try {
    console.log('Starting daily Toast revenue verification...');
    
    // Get Toast token
    const token = await getToastToken();
    
    // Check last 7 days
    const results = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const result = await verifyDateRevenue(dateStr, token);
      results.push(result);
      
      if (result.status === 'override_created') {
        console.log(`Created override for ${dateStr}: $${result.toastRevenue.toFixed(2)}`);
      }
    }
    
    // Update last check timestamp
    await supabase
      .from('api_credentials')
      .update({
        metadata: {
          lastRevenueVerification: {
            timestamp: new Date().toISOString(),
            results: results
          }
        }
      })
      .eq('service', 'toast');
    
    const overridesCreated = results.filter(r => r.status === 'override_created').length;
    
    res.status(200).json({
      success: true,
      message: `Verified ${results.length} days, created ${overridesCreated} overrides`,
      results
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
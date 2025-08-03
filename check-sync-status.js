#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSyncStatus() {
  console.log('Checking Toast Sync Status');
  console.log('=========================\n');
  
  // 1. Check total checks in database
  const { data: checkStats, error: checkError } = await supabase
    .from('toast_checks')
    .select('total_amount, created_date, payment_status')
    .gte('created_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  if (checkStats) {
    const totalRevenue = checkStats.reduce((sum, check) => sum + (check.total_amount || 0), 0);
    const paidChecks = checkStats.filter(c => c.payment_status === 'PAID' || c.payment_status === 'CLOSED');
    console.log(`Toast Checks (last 30 days):`);
    console.log(`- Total checks: ${checkStats.length}`);
    console.log(`- Paid/Closed checks: ${paidChecks.length}`);
    console.log(`- Total revenue: $${totalRevenue.toFixed(2)}`);
  }
  
  // 2. Check simple_transactions view
  const { data: transactions, error: transError } = await supabase
    .from('simple_transactions')
    .select('amount, transaction_date, status')
    .gte('transaction_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  if (transactions) {
    const transRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    console.log(`\nSimple Transactions View:`);
    console.log(`- Total transactions: ${transactions.length}`);
    console.log(`- Total revenue: $${transRevenue.toFixed(2)}`);
  }
  
  // 3. Check what the dashboard query returns
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: dashData, error: dashError } = await supabase
    .from('simple_transactions')
    .select('amount')
    .gte('transaction_date', today.toISOString().split('T')[0])
    .lt('transaction_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  
  if (dashData) {
    const todayRevenue = dashData.reduce((sum, t) => sum + (t.amount || 0), 0);
    console.log(`\nToday's data (${today.toLocaleDateString()}):`);
    console.log(`- Transactions: ${dashData.length}`);
    console.log(`- Revenue: $${todayRevenue.toFixed(2)}`);
  }
  
  // 4. Show date distribution
  const { data: dates } = await supabase
    .from('simple_transactions')
    .select('transaction_date, amount')
    .order('transaction_date', { ascending: false })
    .limit(100);
  
  if (dates && dates.length > 0) {
    console.log(`\nLatest transaction dates:`);
    const dateCounts = {};
    dates.forEach(d => {
      const date = new Date(d.transaction_date).toLocaleDateString();
      if (!dateCounts[date]) dateCounts[date] = { count: 0, revenue: 0 };
      dateCounts[date].count++;
      dateCounts[date].revenue += d.amount || 0;
    });
    
    Object.entries(dateCounts).slice(0, 5).forEach(([date, stats]) => {
      console.log(`  ${date}: ${stats.count} transactions, $${stats.revenue.toFixed(2)}`);
    });
  }
  
  // 5. Check API credentials
  const { data: creds } = await supabase
    .from('api_credentials')
    .select('last_successful_fetch, metadata')
    .eq('service', 'toast')
    .single();
  
  if (creds) {
    console.log(`\nLast successful sync: ${creds.last_successful_fetch ? new Date(creds.last_successful_fetch).toLocaleString() : 'Never'}`);
    if (creds.metadata?.lastSync) {
      console.log(`Last sync details:`, creds.metadata.lastSync);
    }
  }
}

checkSyncStatus().catch(console.error);
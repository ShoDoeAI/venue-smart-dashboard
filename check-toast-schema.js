#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  console.log('📊 Checking Toast Tables Schema\n');
  
  // Get a sample order to see actual columns
  const { data: sampleOrder, error: orderError } = await supabase
    .from('toast_orders')
    .select('*')
    .limit(1)
    .single();
  
  if (sampleOrder) {
    console.log('toast_orders columns:');
    console.log(Object.keys(sampleOrder).sort().join(', '));
  } else {
    console.log('No orders found or error:', orderError?.message);
  }
  
  // Get a sample check
  const { data: sampleCheck, error: checkError } = await supabase
    .from('toast_checks')
    .select('*')
    .limit(1)
    .single();
  
  if (sampleCheck) {
    console.log('\ntoast_checks columns:');
    console.log(Object.keys(sampleCheck).sort().join(', '));
  } else {
    console.log('\nNo checks found or error:', checkError?.message);
  }
}

checkSchema().catch(console.error);
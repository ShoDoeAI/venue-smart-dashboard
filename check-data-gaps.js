#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDataGaps() {
  console.log('🔍 Checking for Data Gaps in August 2025\n');
  
  // Get all business dates in August
  const { data: augustDates } = await supabase
    .from('toast_orders')
    .select('business_date')
    .gte('business_date', 20250801)
    .lte('business_date', 20250831)
    .order('business_date');
  
  // Get unique dates
  const uniqueDates = [...new Set(augustDates?.map(d => d.business_date) || [])];
  
  console.log('📅 Days with data in August 2025:');
  uniqueDates.forEach(date => {
    const dateStr = String(date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
    console.log(`   ${dateStr} (${dayOfWeek})`);
  });
  
  console.log(`\n📊 Total days with data: ${uniqueDates.length}`);
  console.log(`📊 Days in August so far: 10`);
  console.log(`📊 Missing days: ${10 - uniqueDates.length}`);
  
  // Check the most recent order
  const { data: recentOrder } = await supabase
    .from('toast_orders')
    .select('business_date, created_date')
    .order('created_date', { ascending: false })
    .limit(1)
    .single();
  
  if (recentOrder) {
    console.log('\n🕒 Most recent order:');
    console.log(`   Business Date: ${String(recentOrder.business_date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}`);
    console.log(`   Created: ${new Date(recentOrder.created_date).toLocaleString()}`);
  }
}

checkDataGaps().catch(console.error);
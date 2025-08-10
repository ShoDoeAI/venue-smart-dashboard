#!/usr/bin/env node

// Final verification that database matches Toast for August 1st

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyAug1Match() {
  console.log('✅ Verifying August 1st, 2025 Data Match\n');
  console.log('='.repeat(60));

  // Get data from database
  const { data: dbChecks } = await supabase
    .from('toast_checks')
    .select('check_guid, total_amount')
    .gte('created_date', '2025-08-01T00:00:00')
    .lte('created_date', '2025-08-01T23:59:59');

  const dbTotal = dbChecks?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;

  console.log(`📊 Database Total: $${dbTotal.toFixed(2)}`);
  console.log(`   Check Count: ${dbChecks?.length || 0}`);
  console.log(
    `   Average Check: $${dbChecks?.length ? (dbTotal / dbChecks.length).toFixed(2) : '0.00'}`,
  );

  console.log('\n🎯 Toast Dashboard Total: $1,295.00');
  console.log(`   Expected Checks: 53`);

  const match = Math.abs(dbTotal - 1295.0) < 0.01;
  console.log(`\n${match ? '✅ PERFECT MATCH!' : '❌ MISMATCH'}`);

  if (match) {
    console.log('\nYour database now matches Toast dashboard 100%');
    console.log('The AI will report accurate revenue data.');
  }
}

verifyAug1Match();

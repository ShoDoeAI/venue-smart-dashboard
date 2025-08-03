#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabaseSchema() {
  console.log('Database Schema Check');
  console.log('====================\n');
  
  // Get all tables
  const { data: tables, error } = await supabase
    .rpc('get_tables_info', {});
  
  if (error) {
    // Try alternative approach
    const { data: allTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Error fetching tables:', tablesError.message);
      
      // Just try known tables
      console.log('Checking known tables:');
      const knownTables = [
        'toast_checks',
        'toast_orders',
        'toast_payments',
        'toast_menu_items',
        'connector_credentials',
        'sync_logs',
        'venues'
      ];
      
      for (const table of knownTables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            console.log(`  ${table}: ❌ Does not exist`);
          } else {
            console.log(`  ${table}: ✓ Exists (${count} records)`);
          }
        } catch (e) {
          console.log(`  ${table}: ❌ Error`);
        }
      }
    } else {
      console.log('Public tables:');
      allTables?.forEach(t => console.log(`  - ${t.table_name}`));
    }
  } else {
    console.log('Tables in database:');
    tables?.forEach(t => console.log(`  - ${t.table_name}`));
  }
  
  // Check for the latest Toast check with non-zero amount
  console.log('\nChecking Toast data quality:');
  const { data: nonZeroChecks } = await supabase
    .from('toast_checks')
    .select('created_date, total_amount, payment_status')
    .gt('total_amount', 0)
    .order('created_date', { ascending: false })
    .limit(5);
  
  if (nonZeroChecks && nonZeroChecks.length > 0) {
    console.log('Recent checks with revenue:');
    nonZeroChecks.forEach(check => {
      console.log(`  ${check.created_date}: $${check.total_amount} (${check.payment_status})`);
    });
  } else {
    console.log('  No checks with revenue found!');
  }
  
  // Check total revenue
  const { data: stats } = await supabase
    .from('toast_checks')
    .select('total_amount');
  
  if (stats) {
    const totalRevenue = stats.reduce((sum, check) => sum + (check.total_amount || 0), 0);
    console.log(`\nTotal revenue in database: $${totalRevenue.toFixed(2)}`);
    console.log(`Total checks: ${stats.length}`);
  }
}

checkDatabaseSchema().catch(console.error);
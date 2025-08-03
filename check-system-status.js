#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSystemStatus() {
  console.log('VenueSync System Status Check');
  console.log('============================\n');
  
  // 1. Check API endpoints
  console.log('1. API Endpoints:');
  const endpoints = [
    'https://venue-smart-dashboard.vercel.app/api/health',
    'https://venue-smart-dashboard.vercel.app/api/dashboard',
    'https://venue-smart-dashboard.vercel.app/api/chat',
  ];
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: url.includes('chat') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: url.includes('chat') ? JSON.stringify({ message: 'test', conversationId: 'test' }) : undefined
      });
      console.log(`  ${url}: ${response.status} ${response.ok ? '✓' : '✗'}`);
    } catch (error) {
      console.log(`  ${url}: ERROR ✗`);
    }
  }
  
  // 2. Check database
  console.log('\n2. Database Status:');
  try {
    // Check Toast data
    const { data: toastChecks, error: toastError } = await supabase
      .from('toast_checks')
      .select('created_date, total_amount')
      .order('created_date', { ascending: false })
      .limit(5);
    
    if (toastError) {
      console.log(`  Toast checks: ERROR - ${toastError.message}`);
    } else {
      console.log(`  Toast checks: ${toastChecks?.length || 0} recent records found`);
      if (toastChecks && toastChecks.length > 0) {
        const latest = toastChecks[0];
        console.log(`  Latest check: ${latest.created_date} - $${latest.total_amount}`);
      }
    }
    
    // Check connector credentials
    const { data: creds, error: credsError } = await supabase
      .from('connector_credentials')
      .select('service, is_active, updated_at');
    
    if (credsError) {
      console.log(`  Credentials: ERROR - ${credsError.message}`);
    } else {
      console.log(`\n  Connector credentials:`);
      creds?.forEach(cred => {
        console.log(`    ${cred.service}: ${cred.is_active ? 'Active' : 'Inactive'} (updated: ${cred.updated_at})`);
      });
    }
    
  } catch (error) {
    console.log(`  Database connection: ERROR - ${error.message}`);
  }
  
  // 3. Check environment
  console.log('\n3. Environment:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`  Supabase URL: ${process.env.SUPABASE_URL ? '✓' : '✗'}`);
  console.log(`  Supabase Key: ${process.env.SUPABASE_SERVICE_KEY ? '✓' : '✗'}`);
  console.log(`  Anthropic Key: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗'}`);
  console.log(`  Toast Client ID: ${process.env.TOAST_CLIENT_ID ? '✓' : '✗'}`);
  
  // 4. Check recent sync activity
  console.log('\n4. Recent Sync Activity:');
  const { data: syncLogs } = await supabase
    .from('sync_logs')
    .select('service, status, records_synced, started_at, completed_at')
    .order('started_at', { ascending: false })
    .limit(5);
  
  if (syncLogs && syncLogs.length > 0) {
    syncLogs.forEach(log => {
      const duration = log.completed_at ? 
        new Date(log.completed_at) - new Date(log.started_at) : 'N/A';
      console.log(`  ${log.service}: ${log.status} - ${log.records_synced || 0} records (${duration}ms)`);
    });
  } else {
    console.log('  No sync logs found');
  }
  
  console.log('\n5. Summary:');
  console.log('  - Authentication: NOT IMPLEMENTED (Critical)');
  console.log('  - Rate Limiting: NOT IMPLEMENTED (High)');
  console.log('  - Error Monitoring: NOT IMPLEMENTED (Medium)');
  console.log('  - Security Headers: NOT CONFIGURED (Medium)');
  
  console.log('\n⚠️  IMPORTANT: The system is currently running without authentication!');
  console.log('This is a critical security issue that must be addressed before production use.');
}

checkSystemStatus().catch(console.error);
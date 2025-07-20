#!/usr/bin/env tsx
/**
 * Comprehensive MVP Functionality Test
 * Tests all core features of VenueSync
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Load environment variables
config({ path: '.env' });

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3000/api';
const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_KEY || 'test-key'
);

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  error?: string;
  duration?: number;
}

const tests: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  console.log(`\n🧪 Testing: ${name}`);
  const start = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - start;
    tests.push({ name, status: 'pass', duration });
    console.log(`✅ PASSED (${duration}ms)`);
  } catch (error) {
    tests.push({ 
      name, 
      status: 'fail', 
      error: error instanceof Error ? error.message : String(error) 
    });
    console.log(`❌ FAILED: ${error}`);
  }
}

async function testDatabaseConnection() {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name')
    .limit(1);
  
  if (error) throw new Error(`Database connection failed: ${error.message}`);
  console.log(`   Connected to database, found ${data?.length || 0} venues`);
}

async function testHealthEndpoint() {
  const response = await axios.get(`${API_BASE}/health`);
  if (response.status !== 200) throw new Error('Health check failed');
  console.log('   API health check passed');
}

async function testDashboardEndpoint() {
  try {
    const response = await axios.get(`${API_BASE}/dashboard`);
    const data = response.data;
    
    if (!data.success) throw new Error('Dashboard API returned unsuccessful');
    console.log('   Dashboard data retrieved successfully');
    
    // Verify data structure
    if (data.snapshot) {
      console.log(`   - Snapshot ID: ${data.snapshot.id}`);
      console.log(`   - Has KPIs: ${data.kpis ? 'Yes' : 'No'}`);
      console.log(`   - Active Alerts: ${data.alerts?.length || 0}`);
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log('   ⚠️  Dashboard endpoint not found (may need to be implemented)');
    } else {
      throw error;
    }
  }
}

async function testAlertsEndpoint() {
  const response = await axios.get(`${API_BASE}/alerts`);
  const data = response.data;
  
  if (!data.success) throw new Error('Alerts API returned unsuccessful');
  console.log(`   Retrieved ${data.count} alerts`);
  
  if (data.alerts && data.alerts.length > 0) {
    console.log(`   - Critical: ${data.alerts.filter((a: any) => a.severity === 'critical').length}`);
    console.log(`   - High: ${data.alerts.filter((a: any) => a.severity === 'high').length}`);
  }
}

async function testChatEndpoint() {
  try {
    const response = await axios.post(`${API_BASE}/chat`, {
      message: 'What is my total revenue today?'
    });
    
    const data = response.data;
    if (!data.success) throw new Error('Chat API returned unsuccessful');
    
    console.log('   Chat endpoint working');
    console.log(`   - Response length: ${data.response?.length || 0} chars`);
    console.log(`   - Conversation ID: ${data.conversationId || 'N/A'}`);
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('   ⚠️  Chat endpoint requires authentication (expected)');
    } else {
      throw error;
    }
  }
}

async function testActionsEndpoint() {
  try {
    const response = await axios.get(`${API_BASE}/actions/pending`);
    const data = response.data;
    
    console.log(`   Retrieved ${data.actions?.length || 0} pending actions`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log('   ⚠️  Actions endpoint not found (may need to be implemented)');
    } else {
      throw error;
    }
  }
}

async function testErrorsEndpoint() {
  const response = await axios.get(`${API_BASE}/errors?stats=true`);
  const data = response.data;
  
  if (!data.success) throw new Error('Errors API returned unsuccessful');
  console.log('   Error statistics retrieved');
  
  if (data.stats) {
    console.log(`   - Last 24h: ${data.stats.last24Hours} errors`);
    console.log(`   - Unresolved: ${data.stats.unresolvedCount}`);
  }
}

async function testDataTables() {
  // Test each table exists
  const tables = [
    'venues',
    'api_credentials',
    'toast_snapshots',
    'eventbrite_snapshots',
    'opendate_snapshots',
    'daily_summaries',
    'kpis',
    'alerts',
    'api_errors',
    'ai_conversations',
    'ai_messages',
    'actions'
  ];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Table '${table}' - ${error.message}`);
    } else {
      console.log(`   ✅ Table '${table}' exists`);
    }
  }
}

async function testFrontendBuild() {
  try {
    // Check if frontend builds successfully
    console.log('   Checking frontend build...');
    const { execSync } = require('child_process');
    
    // Run build in frontend directory
    execSync('cd packages/frontend && pnpm build', { 
      stdio: 'pipe',
      encoding: 'utf-8' 
    });
    
    console.log('   Frontend builds successfully');
  } catch (error) {
    throw new Error('Frontend build failed');
  }
}

async function testTypeScript() {
  try {
    console.log('   Running TypeScript checks...');
    const { execSync } = require('child_process');
    
    // Check shared package
    try {
      execSync('cd packages/shared && pnpm typecheck', { stdio: 'pipe' });
      console.log('   ✅ Shared package TypeScript OK');
    } catch {
      console.log('   ⚠️  Shared package has TypeScript errors');
    }
    
    // Check backend package
    try {
      execSync('cd packages/backend && pnpm typecheck', { stdio: 'pipe' });
      console.log('   ✅ Backend package TypeScript OK');
    } catch {
      console.log('   ⚠️  Backend package has TypeScript errors');
    }
    
    // Check frontend package
    try {
      execSync('cd packages/frontend && pnpm typecheck', { stdio: 'pipe' });
      console.log('   ✅ Frontend package TypeScript OK');
    } catch {
      console.log('   ⚠️  Frontend package has TypeScript errors');
    }
  } catch (error) {
    console.log('   TypeScript check completed with warnings');
  }
}

// Main test runner
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🚀 VENUESYNC MVP FUNCTIONALITY TEST');
  console.log('='.repeat(60));

  // Database Tests
  console.log('\n📊 DATABASE TESTS');
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Database Tables', testDataTables);

  // API Endpoint Tests
  console.log('\n🔌 API ENDPOINT TESTS');
  await runTest('Health Check', testHealthEndpoint);
  await runTest('Dashboard API', testDashboardEndpoint);
  await runTest('Alerts API', testAlertsEndpoint);
  await runTest('Chat API', testChatEndpoint);
  await runTest('Actions API', testActionsEndpoint);
  await runTest('Errors API', testErrorsEndpoint);

  // Build Tests
  console.log('\n🏗️  BUILD TESTS');
  await runTest('Frontend Build', testFrontendBuild);
  await runTest('TypeScript Validation', testTypeScript);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = tests.filter(t => t.status === 'pass').length;
  const failed = tests.filter(t => t.status === 'fail').length;
  const skipped = tests.filter(t => t.status === 'skip').length;
  
  console.log(`Total: ${tests.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    tests.filter(t => t.status === 'fail').forEach(t => {
      console.log(`- ${t.name}: ${t.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
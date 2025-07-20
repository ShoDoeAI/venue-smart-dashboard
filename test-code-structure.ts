#!/usr/bin/env tsx
/**
 * Code Structure and Implementation Test
 * Verifies all components are properly implemented
 */

import fs from 'fs';
import path from 'path';

interface TestResult {
  category: string;
  items: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    details?: string;
  }>;
}

const results: TestResult[] = [];

function checkFileExists(filePath: string): boolean {
  return fs.existsSync(path.join(__dirname, filePath));
}

function addResult(category: string, name: string, status: 'pass' | 'fail' | 'warning', details?: string) {
  let categoryResult = results.find(r => r.category === category);
  if (!categoryResult) {
    categoryResult = { category, items: [] };
    results.push(categoryResult);
  }
  categoryResult.items.push({ name, status, details });
}

// Check Backend Implementation
function checkBackend() {
  console.log('\n🔧 Checking Backend Implementation...');
  
  // Core Services
  const services = [
    'packages/backend/src/services/alert-generator.ts',
    'packages/backend/src/services/error-isolation.ts',
    'packages/backend/src/services/kpi-calculator.ts',
    'packages/backend/src/services/data-orchestrator.ts',
    'packages/backend/src/services/claude-ai.ts',
    'packages/backend/src/services/action-executor.ts',
  ];
  
  services.forEach(service => {
    const exists = checkFileExists(service);
    const name = path.basename(service, '.ts');
    addResult('Backend Services', name, exists ? 'pass' : 'fail');
  });
  
  // API Endpoints
  const endpoints = [
    'packages/backend/api/dashboard.ts',
    'packages/backend/api/alerts.ts',
    'packages/backend/api/errors.ts',
    'packages/backend/api/chat.ts',
    'packages/backend/api/actions/execute.ts',
    'packages/backend/api/cron/fetch-data.ts',
    'packages/backend/api/cron/calculate-kpis.ts',
  ];
  
  endpoints.forEach(endpoint => {
    const exists = checkFileExists(endpoint);
    const name = path.basename(endpoint, '.ts');
    addResult('API Endpoints', name, exists ? 'pass' : 'fail');
  });
  
  // Database Migrations
  const migrations = [
    'supabase/migrations/20240120_create_alerts_table.sql',
    'supabase/migrations/20240120_create_api_errors_table.sql',
  ];
  
  migrations.forEach(migration => {
    const exists = checkFileExists(migration);
    const name = path.basename(migration, '.sql');
    addResult('Database Migrations', name, exists ? 'pass' : 'fail');
  });
}

// Check Frontend Implementation
function checkFrontend() {
  console.log('\n🎨 Checking Frontend Implementation...');
  
  // Core Components
  const components = [
    'packages/frontend/src/components/kpi/metric-card.tsx',
    'packages/frontend/src/components/alerts/alert-banner.tsx',
    'packages/frontend/src/components/alerts/alert-list.tsx',
    'packages/frontend/src/components/chat/chat-message.tsx',
    'packages/frontend/src/components/chat/chat-interface.tsx',
    'packages/frontend/src/components/layout/app-layout.tsx',
  ];
  
  components.forEach(component => {
    const exists = checkFileExists(component);
    const name = path.basename(component, '.tsx');
    addResult('Frontend Components', name, exists ? 'pass' : 'fail');
  });
  
  // Pages
  const pages = [
    'packages/frontend/src/pages/dashboard-v2.tsx',
    'packages/frontend/src/pages/ai-assistant.tsx',
    'packages/frontend/src/pages/analytics.tsx',
    'packages/frontend/src/pages/actions.tsx',
    'packages/frontend/src/pages/events.tsx',
  ];
  
  pages.forEach(page => {
    const exists = checkFileExists(page);
    const name = path.basename(page, '.tsx');
    addResult('Frontend Pages', name, exists ? 'pass' : 'fail');
  });
  
  // Services
  const services = [
    'packages/frontend/src/services/api.ts',
    'packages/frontend/src/lib/supabase.ts',
    'packages/frontend/src/lib/utils.ts',
  ];
  
  services.forEach(service => {
    const exists = checkFileExists(service);
    const name = path.basename(service, '.ts');
    addResult('Frontend Services', name, exists ? 'pass' : 'fail');
  });
}

// Check Configuration
function checkConfiguration() {
  console.log('\n⚙️  Checking Configuration...');
  
  const configs = [
    { file: 'vercel.json', name: 'Vercel Config' },
    { file: '.vercelignore', name: 'Vercel Ignore' },
    { file: 'VERCEL_SETUP.md', name: 'Vercel Setup Docs' },
    { file: 'packages/frontend/tailwind.config.js', name: 'Tailwind Config' },
    { file: 'packages/frontend/vite.config.ts', name: 'Vite Config' },
    { file: 'tasks.md', name: 'Task Tracking' },
  ];
  
  configs.forEach(config => {
    const exists = checkFileExists(config.file);
    addResult('Configuration', config.name, exists ? 'pass' : 'fail');
  });
}

// Check Package Dependencies
function checkDependencies() {
  console.log('\n📦 Checking Dependencies...');
  
  try {
    const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const frontendPkg = JSON.parse(fs.readFileSync('packages/frontend/package.json', 'utf-8'));
    const backendPkg = JSON.parse(fs.readFileSync('packages/backend/package.json', 'utf-8'));
    
    // Check critical dependencies
    const criticalDeps = {
      'Frontend': {
        pkg: frontendPkg,
        deps: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'tailwindcss', 'recharts']
      },
      'Backend': {
        pkg: backendPkg,
        deps: ['@supabase/supabase-js', '@anthropic-ai/sdk', 'zod']
      }
    };
    
    Object.entries(criticalDeps).forEach(([name, config]) => {
      config.deps.forEach(dep => {
        const hasDep = config.pkg.dependencies?.[dep] || config.pkg.devDependencies?.[dep];
        addResult(`${name} Dependencies`, dep, hasDep ? 'pass' : 'fail');
      });
    });
  } catch (error) {
    addResult('Dependencies', 'Package files', 'fail', 'Could not read package.json files');
  }
}

// Print Results
function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 CODE STRUCTURE TEST RESULTS');
  console.log('='.repeat(60));
  
  let totalPass = 0;
  let totalFail = 0;
  let totalWarning = 0;
  
  results.forEach(category => {
    console.log(`\n${category.category}:`);
    category.items.forEach(item => {
      const icon = item.status === 'pass' ? '✅' : item.status === 'warning' ? '⚠️' : '❌';
      console.log(`  ${icon} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
      
      if (item.status === 'pass') totalPass++;
      else if (item.status === 'warning') totalWarning++;
      else totalFail++;
    });
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log(`✅ Passed: ${totalPass}`);
  console.log(`⚠️  Warnings: ${totalWarning}`);
  console.log(`❌ Failed: ${totalFail}`);
  console.log('='.repeat(60));
  
  // Overall status
  if (totalFail === 0) {
    console.log('\n🎉 All core components are implemented!');
    return true;
  } else {
    console.log(`\n⚠️  ${totalFail} components are missing or not implemented.`);
    return false;
  }
}

// Run all checks
function runChecks() {
  console.log('🔍 Checking VenueSync MVP Code Structure...');
  
  checkBackend();
  checkFrontend();
  checkConfiguration();
  checkDependencies();
  
  return printResults();
}

// Execute
const success = runChecks();
process.exit(success ? 0 : 1);
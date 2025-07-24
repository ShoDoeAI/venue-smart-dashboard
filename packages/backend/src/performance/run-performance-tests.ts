#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  metrics: any;
}

const performanceTests = [
  {
    name: 'API Endpoints',
    file: 'api-endpoints.perf.ts',
    description: 'Testing API response times and throughput',
  },
  {
    name: 'Data Processing',
    file: 'data-processing.perf.ts',
    description: 'Testing data transformation and aggregation performance',
  },
  {
    name: 'Real-time Operations',
    file: 'realtime.perf.ts',
    description: 'Testing WebSocket and real-time update performance',
  },
  {
    name: 'Database Operations',
    file: 'database.perf.ts',
    description: 'Testing database query and transaction performance',
  },
];

async function runTest(testFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';
    const vitestProcess = spawn('vitest', ['run', testFile, '--reporter=json'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' },
    });

    vitestProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    vitestProcess.stderr.on('data', (data) => {
      console.error(`Error in ${testFile}:`, data.toString());
    });

    vitestProcess.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Test ${testFile} failed with code ${code}`));
      }
    });
  });
}

async function runAllPerformanceTests() {
  console.log('🚀 Starting VenueSync Performance Test Suite\n');
  console.log('═'.repeat(60));
  
  const results: TestResult[] = [];
  const startTime = Date.now();

  for (const test of performanceTests) {
    console.log(`\n📊 Running ${test.name} Performance Tests`);
    console.log(`   ${test.description}`);
    console.log('─'.repeat(60));
    
    try {
      const testStart = Date.now();
      await runTest(test.file);
      const duration = Date.now() - testStart;
      
      results.push({
        suite: test.name,
        passed: true,
        duration,
        metrics: {}, // Would parse from JSON output in real implementation
      });
      
      console.log(`✅ ${test.name} completed in ${(duration / 1000).toFixed(2)}s`);
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error);
      results.push({
        suite: test.name,
        passed: false,
        duration: 0,
        metrics: {},
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  
  console.log('\n' + '═'.repeat(60));
  console.log('📈 Performance Test Summary\n');
  
  // Summary table
  console.log('Suite                  | Status | Duration');
  console.log('─'.repeat(45));
  results.forEach(result => {
    const status = result.passed ? '✅ Pass' : '❌ Fail';
    const duration = result.passed ? `${(result.duration / 1000).toFixed(2)}s` : 'N/A';
    console.log(`${result.suite.padEnd(20)} | ${status} | ${duration}`);
  });
  
  console.log('\n' + '─'.repeat(45));
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Success Rate: ${((results.filter(r => r.passed).length / results.length) * 100).toFixed(0)}%`);
  
  // Generate performance report
  const report = {
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
    },
    results,
    summary: {
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      successRate: (results.filter(r => r.passed).length / results.length) * 100,
    },
  };
  
  // Save report
  const reportPath = join(process.cwd(), 'performance-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Performance report saved to: ${reportPath}`);
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  console.log('─'.repeat(60));
  console.log('1. Monitor API response times - aim for <200ms p95');
  console.log('2. Set up alerts for database query times >100ms');
  console.log('3. Review memory usage trends for potential leaks');
  console.log('4. Consider caching for frequently accessed data');
  console.log('5. Implement connection pooling for database operations');
  
  process.exit(results.some(r => !r.passed) ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllPerformanceTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllPerformanceTests };
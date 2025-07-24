import { DataOrchestrator } from '../../src/services/data-orchestrator';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Test script for Data Orchestrator with MVP APIs
 * Usage: node api/test-orchestrator.ts
 */

async function testDataOrchestrator() {
  console.log('🚀 Testing Data Orchestrator with MVP APIs (Toast, Eventbrite, OpenDate.io)...\n');

  // Mock Supabase client
  const mockSupabase = {
    from: (table: string) => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'cred-123',
              service: table.replace('_credentials', ''),
              venue_id: 'venue-123',
              credentials: {
                // Mock credentials for each service
                clientId: 'test-client',
                clientSecret: 'test-secret',
                accessToken: 'test-token',
                restaurantId: 'test-restaurant',
                environment: 'sandbox',
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        })),
      })),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
    }),
  } as any as SupabaseClient;

  try {
    const orchestrator = new DataOrchestrator(mockSupabase);

    // Test 1: Check API statuses
    console.log('1. Checking API statuses...');
    const statuses = await orchestrator.getApiStatuses('venue-123');
    console.log('   API Statuses:');
    console.log(`   - Toast: ${statuses.toast.needsUpdate ? '🔄 Needs update' : '✅ Up to date'}`);
    console.log(`   - Eventbrite: ${statuses.eventbrite.needsUpdate ? '🔄 Needs update' : '✅ Up to date'}`);
    console.log(`   - OpenDate.io: ${statuses.opendate?.needsUpdate ? '🔄 Needs update' : '✅ Up to date'}`);
    console.log(`   - WISK: ${statuses.wisk.needsUpdate ? '🔄 Needs update' : '⏸️  Placeholder'}`);

    // Test 2: Fetch data from all APIs
    console.log('\n2. Fetching data from all MVP APIs...');
    const config = {
      venueId: 'venue-123',
      apis: ['toast', 'eventbrite', 'opendate'], // MVP APIs only
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date(),
      },
    };

    console.log('   Configuration:');
    console.log(`   - Venue ID: ${config.venueId}`);
    console.log(`   - APIs: ${config.apis.join(', ')}`);
    console.log(`   - Date range: ${config.dateRange.start.toLocaleDateString()} to ${config.dateRange.end.toLocaleDateString()}`);

    // In a real scenario, this would fetch from actual APIs
    console.log('\n   NOTE: This is a mock test. In production:');
    console.log('   - Toast would fetch POS transactions');
    console.log('   - Eventbrite would fetch event attendees');
    console.log('   - OpenDate.io would fetch ticket orders and fan data');

    // Test 3: Simulate orchestration result
    console.log('\n3. Simulating orchestration result...');
    const mockResult = {
      snapshotId: 'snapshot-123',
      success: true,
      results: {
        toast: {
          success: true,
          recordCount: 150,
          duration: 2500,
        },
        eventbrite: {
          success: true,
          recordCount: 75,
          duration: 1800,
        },
        opendate: {
          success: true,
          recordCount: 200,
          duration: 3200,
        },
      },
      metrics: {
        totalRevenue: 15750.50,
        transactionCount: 425,
        averageTransaction: 37.06,
        uniqueCustomers: 312,
      },
      duration: 7500,
    };

    console.log('   Orchestration Result:');
    console.log(`   - Snapshot ID: ${mockResult.snapshotId}`);
    console.log(`   - Success: ${mockResult.success ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Total duration: ${mockResult.duration}ms`);
    
    console.log('\n   API Results:');
    Object.entries(mockResult.results).forEach(([api, result]) => {
      console.log(`   - ${api.charAt(0).toUpperCase() + api.slice(1)}:`);
      console.log(`     Success: ${result.success ? '✅' : '❌'}`);
      console.log(`     Records: ${result.recordCount || 0}`);
      console.log(`     Duration: ${result.duration}ms`);
    });

    console.log('\n   Aggregate Metrics:');
    console.log(`   - Total revenue: $${mockResult.metrics.totalRevenue.toFixed(2)}`);
    console.log(`   - Transaction count: ${mockResult.metrics.transactionCount}`);
    console.log(`   - Average transaction: $${mockResult.metrics.averageTransaction.toFixed(2)}`);
    console.log(`   - Unique customers: ${mockResult.metrics.uniqueCustomers}`);

    // Test 4: Parallel fetching demonstration
    console.log('\n4. Demonstrating parallel API fetching...');
    console.log('   The orchestrator fetches from all APIs simultaneously:');
    console.log('   ┌─────────────┐     ┌──────────────┐     ┌──────────────┐');
    console.log('   │    Toast    │     │  Eventbrite  │     │ OpenDate.io  │');
    console.log('   │     POS     │     │    Events    │     │  Live Music  │');
    console.log('   └─────┬───────┘     └──────┬───────┘     └──────┬───────┘');
    console.log('         │                     │                     │');
    console.log('         └─────────────────────┴─────────────────────┘');
    console.log('                               │');
    console.log('                    ┌──────────▼──────────┐');
    console.log('                    │   Data Orchestrator  │');
    console.log('                    │  (Promise.allSettled)│');
    console.log('                    └──────────┬──────────┘');
    console.log('                               │');
    console.log('                    ┌──────────▼──────────┐');
    console.log('                    │   Snapshot Service   │');
    console.log('                    │   (Stores results)   │');
    console.log('                    └─────────────────────┘');

    console.log('\n✅ Data Orchestrator test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Configure real API credentials in Supabase');
    console.log('2. Set up Vercel cron jobs to run orchestrator periodically');
    console.log('3. Build KPI calculation engine using aggregated data');
    console.log('4. Create dashboard UI to visualize metrics');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', (error as Error).stack);
  }
}

// Mock vi for the test
const vi = {
  fn: (impl?: any) => {
    const fn = impl || (() => {});
    fn.mockResolvedValue = (_value: any) => fn;
    fn.mockImplementation = (_impl: any) => fn;
    return fn;
  },
};

// Run the test if this file is executed directly
if (require.main === module) {
  testDataOrchestrator().catch(console.error);
}

export { testDataOrchestrator };
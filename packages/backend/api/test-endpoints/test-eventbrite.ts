import { EventbriteConnector } from '@venuesync/shared';
import type { ConnectorCredentials, ConnectorConfig } from '@venuesync/shared';

/**
 * Test script for Eventbrite API integration
 * Usage: node api/test-eventbrite.ts
 */

async function testEventbriteIntegration() {
  console.log('🎫 Testing Eventbrite API Integration...\n');

  // Mock credentials for testing (replace with real ones for actual testing)
  const credentials: ConnectorCredentials = {
    id: 'test-eventbrite-connector',
    service: 'eventbrite',
    isActive: true,
    credentials: {
      accessToken: process.env.EVENTBRITE_ACCESS_TOKEN || 'test-token',
      environment: 'production',
      organizationId: process.env.EVENTBRITE_ORGANIZATION_ID,
    },
    metadata: {
      name: 'Test Eventbrite Integration',
      description: 'Testing Eventbrite API connectivity',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: ConnectorConfig = {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  };

  // Create mock Supabase client for testing
  const mockSupabase = {
    from: () => ({
      insert: () => ({ error: null }),
      select: () => ({ data: [], error: null }),
    }),
  } as any;

  try {
    const connector = new EventbriteConnector(credentials, config, mockSupabase);

    // Test 1: Connection
    console.log('1. Testing connection...');
    const connectionResult = await connector.testConnection();
    console.log('   Connection result:', connectionResult.success ? '✅ Success' : '❌ Failed');
    if (!connectionResult.success) {
      console.log('   Error:', connectionResult.error?.message);
    }

    // Test 2: Validate credentials
    console.log('\n2. Validating credentials...');
    const credentialsValid = await connector.validateCredentials();
    console.log('   Credentials valid:', credentialsValid ? '✅ Yes' : '❌ No');

    if (connectionResult.success && credentialsValid) {
      // Test 3: Fetch organizations
      console.log('\n3. Fetching organizations...');
      const orgsResult = await connector.fetchOrganizations();
      console.log('   Organizations result:', orgsResult.success ? '✅ Success' : '❌ Failed');
      if (orgsResult.success && orgsResult.data) {
        console.log(`   Found ${orgsResult.data.length} organization(s)`);
        orgsResult.data.slice(0, 2).forEach((org, i) => {
          console.log(`   ${i + 1}. ${org.name} (ID: ${org.id})`);
        });
      }

      // Test 4: Fetch events
      console.log('\n4. Fetching events...');
      const eventsResult = await connector.fetchEvents();
      console.log('   Events result:', eventsResult.success ? '✅ Success' : '❌ Failed');
      if (eventsResult.success && eventsResult.data) {
        console.log(`   Found ${eventsResult.data.total || eventsResult.data.data.length} event(s)`);
        eventsResult.data.data.slice(0, 3).forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.name.text} (${event.status})`);
          console.log(`      Start: ${event.start.local} | Currency: ${event.currency}`);
        });

        // Test 5: Fetch attendees for first event (if available)
        if (eventsResult.data.data.length > 0) {
          const firstEvent = eventsResult.data.data[0];
          console.log(`\n5. Fetching attendees for event: ${firstEvent.name.text}...`);
          const attendeesResult = await connector.fetchEventAttendees(firstEvent.id);
          console.log('   Attendees result:', attendeesResult.success ? '✅ Success' : '❌ Failed');
          if (attendeesResult.success && attendeesResult.data) {
            console.log(`   Found ${attendeesResult.data.total || attendeesResult.data.data.length} attendee(s)`);
            attendeesResult.data.data.slice(0, 2).forEach((attendee, i) => {
              console.log(`   ${i + 1}. ${attendee.profile.name || attendee.profile.email} (${attendee.status})`);
              console.log(`      Ticket: ${attendee.ticket_class_name} | Checked in: ${attendee.checked_in}`);
            });

            // Test 6: Transform to transactions
            console.log(`\n6. Testing transaction transformation...`);
            const transactionsResult = await connector.fetchAllTransactions(firstEvent.id);
            console.log('   Transformation result:', transactionsResult.success ? '✅ Success' : '❌ Failed');
            if (transactionsResult.success && transactionsResult.data) {
              console.log(`   Generated ${transactionsResult.data.length} transaction(s)`);
              if (transactionsResult.data.length > 0) {
                const tx = transactionsResult.data[0];
                console.log(`   Sample transaction:`);
                console.log(`     ID: ${tx.transaction_id}`);
                console.log(`     Amount: ${tx.currency} ${(tx.total_amount / 100).toFixed(2)}`);
                console.log(`     Attendee: ${tx.attendee_name || tx.attendee_email}`);
                console.log(`     Status: ${tx.status} | Checked in: ${tx.checked_in}`);
              }
            }
          }
        }
      }
    }

    console.log('\n🎉 Eventbrite integration test completed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', (error as Error).stack);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEventbriteIntegration().catch(console.error);
}

export { testEventbriteIntegration };
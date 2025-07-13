import { OpenDateConnector } from '@venuesync/shared';
import type { ConnectorCredentials, ConnectorConfig } from '@venuesync/shared';

/**
 * Test script for OpenDate.io Live Music Venue Management API integration
 * Usage: node api/test-opendate.ts
 */

async function testOpenDateIntegration() {
  console.log('🎸 Testing OpenDate.io Live Music Venue Management API Integration...\n');

  // Mock credentials for testing (replace with real ones for actual testing)
  const credentials: ConnectorCredentials = {
    id: 'test-opendate-connector',
    service: 'opendate',
    credentials: {
      clientId: process.env.OPENDATE_CLIENT_ID || 'test-client-id',
      clientSecret: process.env.OPENDATE_CLIENT_SECRET || 'test-client-secret',
      accessToken: process.env.OPENDATE_ACCESS_TOKEN || 'test-access-token',
      refreshToken: process.env.OPENDATE_REFRESH_TOKEN,
      environment: 'production',
    },
    metadata: {
      name: 'Test OpenDate Integration',
      description: 'Testing OpenDate.io live music venue API connectivity',
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
    const connector = new OpenDateConnector(credentials, config, mockSupabase);

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
      // Test 3: Fetch venues
      console.log('\n3. Fetching venues...');
      const venuesResult = await connector.fetchVenues();
      console.log('   Venues result:', venuesResult.success ? '✅ Success' : '❌ Failed');
      if (venuesResult.success && venuesResult.data) {
        console.log(`   Found ${venuesResult.data.data.length} venue(s)`);
        venuesResult.data.data.slice(0, 2).forEach((venue, i) => {
          console.log(`   ${i + 1}. ${venue.name} - Capacity: ${venue.capacity}`);
          console.log(`      ${venue.address.city}, ${venue.address.state}`);
        });
      }

      // Test 4: Fetch artists
      console.log('\n4. Fetching artists...');
      const artistsResult = await connector.fetchArtists();
      console.log('   Artists result:', artistsResult.success ? '✅ Success' : '❌ Failed');
      if (artistsResult.success && artistsResult.data) {
        console.log(`   Found ${artistsResult.data.total || artistsResult.data.data.length} artist(s)`);
        artistsResult.data.data.slice(0, 3).forEach((artist, i) => {
          console.log(`   ${i + 1}. ${artist.name} (${artist.genre || 'N/A'})`);
          console.log(`      Booking fee: $${artist.booking_fee || 'N/A'} | Active: ${artist.is_active}`);
        });
      }

      // Test 5: Fetch upcoming events/shows (confirms)
      console.log('\n5. Fetching upcoming events/shows...');
      const confirmsResult = await connector.fetchConfirms({
        start_date: new Date().toISOString(),
        status: 'confirmed',
      });
      console.log('   Events result:', confirmsResult.success ? '✅ Success' : '❌ Failed');
      if (confirmsResult.success && confirmsResult.data) {
        console.log(`   Found ${confirmsResult.data.total || confirmsResult.data.data.length} event(s)`);
        confirmsResult.data.data.slice(0, 3).forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.artist_name} at ${event.venue_name}`);
          console.log(`      Date: ${new Date(event.show_date).toLocaleDateString()} | Status: ${event.status}`);
          console.log(`      Tickets: ${event.tickets_sold}/${event.capacity} sold`);
          console.log(`      Revenue: $${event.total_gross.toFixed(2)} | Artist payout: $${event.artist_payout.toFixed(2)}`);
        });

        // Test 6: Fetch orders for first event (if available)
        if (confirmsResult.data.data.length > 0) {
          const firstEvent = confirmsResult.data.data[0];
          console.log(`\n6. Fetching orders for event: ${firstEvent.artist_name}...`);
          const ordersResult = await connector.fetchOrders({
            confirm_id: firstEvent.id,
            status: 'completed',
          });
          console.log('   Orders result:', ordersResult.success ? '✅ Success' : '❌ Failed');
          if (ordersResult.success && ordersResult.data) {
            console.log(`   Found ${ordersResult.data.total || ordersResult.data.data.length} order(s)`);
            ordersResult.data.data.slice(0, 2).forEach((order, i) => {
              console.log(`   ${i + 1}. Order #${order.order_number}`);
              console.log(`      Customer: ${order.customer_email || 'Guest'} | Tickets: ${order.ticket_count}`);
              console.log(`      Total: $${order.total.toFixed(2)} | Status: ${order.payment_status}`);
            });
          }
        }
      }

      // Test 7: Fetch fans
      console.log('\n7. Fetching fan data...');
      const fansResult = await connector.fetchFans({
        marketing_opt_in: true,
      });
      console.log('   Fans result:', fansResult.success ? '✅ Success' : '❌ Failed');
      if (fansResult.success && fansResult.data) {
        console.log(`   Found ${fansResult.data.total || fansResult.data.data.length} fan(s)`);
        fansResult.data.data.slice(0, 2).forEach((fan, i) => {
          console.log(`   ${i + 1}. ${fan.first_name || 'Unknown'} ${fan.last_name || ''} (${fan.email})`);
          console.log(`      Shows attended: ${fan.shows_attended} | Lifetime value: $${fan.lifetime_value.toFixed(2)}`);
          console.log(`      Location: ${fan.city || 'Unknown'}, ${fan.state || 'Unknown'}`);
        });
      }

      // Test 8: Fetch settlements
      console.log('\n8. Fetching recent settlements...');
      const settlementsResult = await connector.fetchSettlements(
        undefined, // All venues
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        new Date().toISOString()
      );
      console.log('   Settlements result:', settlementsResult.success ? '✅ Success' : '❌ Failed');
      if (settlementsResult.success && settlementsResult.data) {
        console.log(`   Found ${settlementsResult.data.total || settlementsResult.data.data.length} settlement(s)`);
        settlementsResult.data.data.slice(0, 2).forEach((settlement, i) => {
          console.log(`   ${i + 1}. Settlement for ${new Date(settlement.settlement_date).toLocaleDateString()}`);
          console.log(`      Gross revenue: $${settlement.total_gross_revenue.toFixed(2)}`);
          console.log(`      Artist payout: $${settlement.artist_total_payout.toFixed(2)}`);
          console.log(`      Venue profit: $${settlement.venue_total_profit.toFixed(2)}`);
          console.log(`      Status: ${settlement.payment_status}`);
        });
      }

      // Test 9: Fetch analytics
      console.log('\n9. Fetching venue analytics...');
      const analyticsResult = await connector.fetchAnalytics(
        undefined, // All venues
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
        new Date().toISOString()
      );
      console.log('   Analytics result:', analyticsResult.success ? '✅ Success' : '❌ Failed');
      if (analyticsResult.success && analyticsResult.data) {
        const analytics = analyticsResult.data;
        console.log('   Analytics Summary:');
        console.log(`     Total events: ${analytics.total_events}`);
        console.log(`     Total revenue: $${analytics.total_revenue.toFixed(2)}`);
        console.log(`     - Ticket revenue: $${analytics.ticket_revenue.toFixed(2)}`);
        console.log(`     - Bar revenue: $${analytics.bar_revenue.toFixed(2)}`);
        console.log(`     - Merchandise revenue: $${analytics.merchandise_revenue.toFixed(2)}`);
        console.log(`     Average attendance rate: ${analytics.average_attendance_rate.toFixed(1)}%`);
        console.log(`     Sold out shows: ${analytics.sold_out_shows}`);
        console.log(`     Total customers: ${analytics.total_customers}`);
        console.log(`     Customer retention rate: ${analytics.customer_retention_rate.toFixed(1)}%`);
        
        if (analytics.top_artists.length > 0) {
          console.log('     Top Artists:');
          analytics.top_artists.slice(0, 3).forEach((artist, i) => {
            console.log(`       ${i + 1}. ${artist.artist_name} - ${artist.shows_count} shows, $${artist.total_revenue.toFixed(2)}`);
          });
        }
      }

      // Test 10: Transform to transactions
      console.log('\n10. Testing transaction transformation...');
      const transactionsResult = await connector.fetchAllTransactions(
        undefined, // All venues
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        new Date().toISOString()
      );
      console.log('   Transformation result:', transactionsResult.success ? '✅ Success' : '❌ Failed');
      if (transactionsResult.success && transactionsResult.data) {
        console.log(`   Generated ${transactionsResult.data.length} transaction(s)`);
        if (transactionsResult.data.length > 0) {
          const tx = transactionsResult.data[0];
          console.log(`   Sample transaction:`);
          console.log(`     ID: ${tx.transaction_id}`);
          console.log(`     Type: ${tx.transaction_type}`);
          console.log(`     Amount: ${tx.currency} ${tx.amount.toFixed(2)}`);
          console.log(`     Customer: ${tx.customer_name || tx.customer_email || 'N/A'}`);
          console.log(`     Source: ${tx.source}`);
        }
      }
    }

    console.log('\n🎉 OpenDate.io live music venue integration test completed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', (error as Error).stack);
    console.log('\nTroubleshooting:');
    console.log('1. Verify OPENDATE_CLIENT_ID environment variable is set');
    console.log('2. Verify OPENDATE_CLIENT_SECRET environment variable is set');
    console.log('3. Verify OPENDATE_ACCESS_TOKEN environment variable is set');
    console.log('4. Check API documentation at https://opendate.readme.io');
    console.log('5. Ensure your OAuth credentials have proper scopes');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testOpenDateIntegration().catch(console.error);
}

export { testOpenDateIntegration };
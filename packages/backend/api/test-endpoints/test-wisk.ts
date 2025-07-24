import { WiskConnector } from '@venuesync/shared';
import type { ConnectorCredentials, ConnectorConfig } from '@venuesync/shared';

/**
 * Test script for WISK Inventory Management API integration
 * Usage: node api/test-wisk.ts
 */

async function testWiskIntegration() {
  console.log('📦 Testing WISK Inventory Management API Integration...\n');

  // Mock credentials for testing (replace with real ones for actual testing)
  const credentials: ConnectorCredentials = {
    id: 'test-wisk-connector',
    service: 'wisk',
    isActive: true,
    credentials: {
      apiKey: process.env.WISK_API_KEY || 'test-api-key',
      accountId: process.env.WISK_ACCOUNT_ID || 'test-account-id',
      environment: 'production',
    },
    metadata: {
      name: 'Test WISK Integration',
      description: 'Testing WISK inventory management API connectivity',
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
    const connector = new WiskConnector(credentials, config, mockSupabase);

    // Test 1: Connection
    console.log('1. Testing connection...');
    const connectionResult = await connector.testConnection();
    console.log('   Connection result:', connectionResult.success ? '✅ Success' : '❌ Failed');
    if (!connectionResult.success) {
      console.log('   Error:', connectionResult.error?.message);
      console.log('   Note: WISK API documentation is not publicly available.');
      console.log('   This test uses placeholder endpoints. Contact support@wisk.ai for real API access.');
    }

    // Test 2: Validate credentials
    console.log('\n2. Validating credentials...');
    const credentialsValid = await connector.validateCredentials();
    console.log('   Credentials valid:', credentialsValid ? '✅ Yes' : '❌ No');

    if (connectionResult.success && credentialsValid) {
      // Test 3: Fetch locations
      console.log('\n3. Fetching locations...');
      const locationsResult = await connector.fetchLocations();
      console.log('   Locations result:', locationsResult.success ? '✅ Success' : '❌ Failed');
      if (locationsResult.success && locationsResult.data) {
        console.log(`   Found ${locationsResult.data.data.length} location(s)`);
        locationsResult.data.data.slice(0, 2).forEach((location, i) => {
          console.log(`   ${i + 1}. ${location.name} (${location.type}) - ${location.currency}`);
        });
      }

      // Test 4: Fetch inventory items
      console.log('\n4. Fetching inventory items...');
      const inventoryResult = await connector.fetchInventoryItems();
      console.log('   Inventory result:', inventoryResult.success ? '✅ Success' : '❌ Failed');
      if (inventoryResult.success && inventoryResult.data) {
        console.log(`   Found ${inventoryResult.data.total || inventoryResult.data.data.length} item(s)`);
        inventoryResult.data.data.slice(0, 3).forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.name} - Current Stock: ${item.current_stock} ${item.unit_of_measure}`);
          console.log(`      Cost: $${item.cost_per_unit} | Category: ${item.category_name || 'N/A'}`);
        });

        // Test 5: Fetch suppliers
        console.log('\n5. Fetching suppliers...');
        const suppliersResult = await connector.fetchSuppliers();
        console.log('   Suppliers result:', suppliersResult.success ? '✅ Success' : '❌ Failed');
        if (suppliersResult.success && suppliersResult.data) {
          console.log(`   Found ${suppliersResult.data.total || suppliersResult.data.data.length} supplier(s)`);
          suppliersResult.data.data.slice(0, 2).forEach((supplier, i) => {
            console.log(`   ${i + 1}. ${supplier.name} (${supplier.currency})`);
            console.log(`      Contact: ${supplier.contact_name || 'N/A'} | ${supplier.email || 'N/A'}`);
          });
        }

        // Test 6: Fetch stock movements
        console.log('\n6. Fetching stock movements...');
        const movementsResult = await connector.fetchStockMovements({
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          end_date: new Date().toISOString(),
        });
        console.log('   Stock movements result:', movementsResult.success ? '✅ Success' : '❌ Failed');
        if (movementsResult.success && movementsResult.data) {
          console.log(`   Found ${movementsResult.data.total || movementsResult.data.data.length} movement(s)`);
          movementsResult.data.data.slice(0, 3).forEach((movement, i) => {
            console.log(`   ${i + 1}. ${movement.item_name} - ${movement.movement_type} (${movement.quantity})`);
            console.log(`      Cost: $${movement.total_cost || 'N/A'} | User: ${movement.user_name || 'N/A'}`);
          });

          // Test 7: Transform to transactions
          console.log('\n7. Testing transaction transformation...');
          const transactionsResult = await connector.fetchAllTransactions(
            undefined, // All locations
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
            new Date().toISOString()
          );
          console.log('   Transformation result:', transactionsResult.success ? '✅ Success' : '❌ Failed');
          if (transactionsResult.success && transactionsResult.data) {
            console.log(`   Generated ${transactionsResult.data.length} transaction(s)`);
            if (transactionsResult.data.length > 0) {
              const tx = transactionsResult.data[0];
              console.log(`   Sample transaction:`);
              console.log(`     ID: ${tx.transaction_id}`);
              console.log(`     Item: ${tx.item_name} (${tx.movement_type})`);
              console.log(`     Amount: ${tx.currency} ${tx.total_amount.toFixed(2)}`);
              console.log(`     Location: ${tx.location_name || 'N/A'}`);
              console.log(`     Source: ${tx.source}`);
            }
          }
        }

        // Test 8: Fetch recipes
        console.log('\n8. Fetching recipes...');
        const recipesResult = await connector.fetchRecipes();
        console.log('   Recipes result:', recipesResult.success ? '✅ Success' : '❌ Failed');
        if (recipesResult.success && recipesResult.data) {
          console.log(`   Found ${recipesResult.data.total || recipesResult.data.data.length} recipe(s)`);
          recipesResult.data.data.slice(0, 2).forEach((recipe, i) => {
            console.log(`   ${i + 1}. ${recipe.name} - Cost: $${recipe.cost_per_serving}/serving`);
            console.log(`      Ingredients: ${recipe.ingredients.length} | Prep time: ${recipe.prep_time_minutes || 'N/A'} min`);
          });
        }

        // Test 9: Fetch waste entries
        console.log('\n9. Fetching waste entries...');
        const wasteResult = await connector.fetchWasteEntries(
          undefined, // All locations
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          new Date().toISOString()
        );
        console.log('   Waste entries result:', wasteResult.success ? '✅ Success' : '❌ Failed');
        if (wasteResult.success && wasteResult.data) {
          console.log(`   Found ${wasteResult.data.total || wasteResult.data.data.length} waste entry(ies)`);
          wasteResult.data.data.slice(0, 2).forEach((waste, i) => {
            console.log(`   ${i + 1}. ${waste.item_name} - ${waste.reason} (${waste.quantity} ${waste.unit_of_measure})`);
            console.log(`      Cost: $${waste.total_cost} | By: ${waste.recorded_by}`);
          });
        }

        // Test 10: Fetch inventory analytics
        console.log('\n10. Fetching inventory analytics...');
        const analyticsResult = await connector.fetchInventoryAnalytics(
          undefined, // All locations
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          new Date().toISOString()
        );
        console.log('   Analytics result:', analyticsResult.success ? '✅ Success' : '❌ Failed');
        if (analyticsResult.success && analyticsResult.data) {
          const analytics = analyticsResult.data;
          console.log(`   Analytics Summary:`);
          console.log(`     Total Inventory Value: ${analytics.currency} ${analytics.total_inventory_value.toFixed(2)}`);
          console.log(`     Total Purchases: ${analytics.currency} ${analytics.total_purchases.toFixed(2)}`);
          console.log(`     Total Sales: ${analytics.currency} ${analytics.total_sales.toFixed(2)}`);
          console.log(`     Total Waste: ${analytics.currency} ${analytics.total_waste.toFixed(2)} (${analytics.waste_percentage.toFixed(1)}%)`);
          console.log(`     Top Selling Items: ${analytics.top_selling_items.length}`);
          console.log(`     Low Stock Items: ${analytics.low_stock_items.length}`);
        }
      }
    }

    console.log('\n🎉 WISK inventory management integration test completed!');
    console.log('\nNote: Since WISK API documentation is not publicly available,');
    console.log('this test uses estimated endpoints based on common inventory management patterns.');
    console.log('For real integration, contact WISK support at support@wisk.ai');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', (error as Error).stack);
    console.log('\nTroubleshooting:');
    console.log('1. Verify WISK_API_KEY environment variable is set');
    console.log('2. Verify WISK_ACCOUNT_ID environment variable is set');
    console.log('3. Contact support@wisk.ai for API documentation and access');
    console.log('4. Ensure your API key has proper permissions for inventory access');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWiskIntegration().catch(console.error);
}

export { testWiskIntegration };
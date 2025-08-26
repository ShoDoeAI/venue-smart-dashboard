const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDatabaseFunctions() {
  console.log('🔍 Testing Database RPC Functions\n');
  
  // Test 1: get_menu_items_sold
  console.log('1. Testing get_menu_items_sold...');
  try {
    const { data, error } = await supabase.rpc('get_menu_items_sold', {
      start_date: '2025-08-01',
      end_date: '2025-08-26',
      category_filter: null
    });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} menu items`);
      if (data && data.length > 0) {
        console.log('Sample item:', {
          name: data[0].item_name,
          quantity: data[0].total_quantity,
          revenue: data[0].total_revenue
        });
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: get_top_selling_items
  console.log('2. Testing get_top_selling_items...');
  try {
    const { data, error } = await supabase.rpc('get_top_selling_items', {
      start_date: '2025-08-01',
      end_date: '2025-08-26',
      limit_count: 5,
      category_filter: null
    });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log(`✅ Found top ${data?.length || 0} items`);
      if (data && data.length > 0) {
        console.log('\nTop 5 Best Sellers:');
        data.forEach(item => {
          console.log(`  ${item.rank}. ${item.item_name} - ${item.total_quantity} sold, $${item.total_revenue}`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: get_menu_category_performance
  console.log('3. Testing get_menu_category_performance...');
  try {
    const { data, error } = await supabase.rpc('get_menu_category_performance', {
      start_date: '2025-08-01',
      end_date: '2025-08-26'
    });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} categories`);
      if (data && data.length > 0) {
        console.log('\nCategory Performance:');
        data.forEach(cat => {
          console.log(`  ${cat.category_name}: ${cat.item_count} items, $${cat.total_revenue} (${cat.revenue_percentage}%)`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 4: Check if we have any toast_selections data
  console.log('4. Checking raw toast_selections data...');
  try {
    const { data, error, count } = await supabase
      .from('toast_selections')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log(`✅ Total selections in database: ${count}`);
      if (data && data.length > 0) {
        console.log('Sample selection:', {
          item_name: data[0].item_name,
          quantity: data[0].quantity,
          price: data[0].price,
          category: data[0].sales_category_name
        });
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testDatabaseFunctions().catch(console.error);
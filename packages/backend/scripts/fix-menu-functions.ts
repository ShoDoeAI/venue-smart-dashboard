import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

const fixSQL = `
-- Drop existing functions to recreate with fixes
DROP FUNCTION IF EXISTS get_menu_items_sold(DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS get_top_selling_items(DATE, DATE, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_menu_category_performance(DATE, DATE);

-- Create RPC function for menu item analytics (fixed)
CREATE OR REPLACE FUNCTION get_menu_items_sold(
  start_date DATE,
  end_date DATE,
  category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  item_guid TEXT,
  item_name TEXT,
  sales_category_name TEXT,
  total_quantity NUMERIC,
  total_revenue NUMERIC,
  transaction_count BIGINT,
  avg_price NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  WITH menu_sales AS (
    SELECT 
      ts.item_guid as item_guid_calc,
      ts.item_name as item_name_calc,
      ts.sales_category_name as sales_category_name_calc,
      SUM(ts.quantity) as total_quantity_calc,
      SUM(ts.price / 100.0) as total_revenue_calc,
      COUNT(DISTINCT ts.check_guid) as transaction_count_calc,
      AVG(ts.price / 100.0 / NULLIF(ts.quantity, 0)) as avg_price_calc
    FROM toast_selections ts
    INNER JOIN toast_checks tc ON ts.check_guid = tc.check_guid 
      AND ts.snapshot_timestamp = tc.snapshot_timestamp
    WHERE ts.voided = FALSE
      AND tc.voided = FALSE
      AND DATE(tc.created_date) >= start_date
      AND DATE(tc.created_date) <= end_date
      AND (category_filter IS NULL OR LOWER(ts.sales_category_name) LIKE LOWER('%' || category_filter || '%'))
    GROUP BY ts.item_guid, ts.item_name, ts.sales_category_name
  )
  SELECT 
    item_guid_calc,
    item_name_calc,
    COALESCE(sales_category_name_calc, 'Uncategorized'),
    total_quantity_calc,
    total_revenue_calc,
    transaction_count_calc,
    avg_price_calc
  FROM menu_sales
  ORDER BY total_revenue_calc DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get top selling items for a period (fixed)
CREATE OR REPLACE FUNCTION get_top_selling_items(
  start_date DATE,
  end_date DATE,
  limit_count INTEGER DEFAULT 10,
  category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  rank INTEGER,
  item_guid TEXT,
  item_name TEXT,
  sales_category_name TEXT,
  total_quantity NUMERIC,
  total_revenue NUMERIC,
  transaction_count BIGINT,
  revenue_rank INTEGER
)
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_items AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY SUM(ts.quantity) DESC)::INTEGER as quantity_rank,
      ROW_NUMBER() OVER (ORDER BY SUM(ts.price / 100.0) DESC)::INTEGER as revenue_rank_calc,
      ts.item_guid as item_guid_calc,
      ts.item_name as item_name_calc,
      COALESCE(ts.sales_category_name, 'Uncategorized') as sales_category_name_calc,
      SUM(ts.quantity) as total_quantity_calc,
      SUM(ts.price / 100.0) as total_revenue_calc,
      COUNT(DISTINCT ts.check_guid) as transaction_count_calc
    FROM toast_selections ts
    INNER JOIN toast_checks tc ON ts.check_guid = tc.check_guid 
      AND ts.snapshot_timestamp = tc.snapshot_timestamp
    WHERE ts.voided = FALSE
      AND tc.voided = FALSE
      AND DATE(tc.created_date) >= start_date
      AND DATE(tc.created_date) <= end_date
      AND (category_filter IS NULL OR LOWER(ts.sales_category_name) LIKE LOWER('%' || category_filter || '%'))
    GROUP BY ts.item_guid, ts.item_name, ts.sales_category_name
  )
  SELECT 
    quantity_rank,
    item_guid_calc,
    item_name_calc,
    sales_category_name_calc,
    total_quantity_calc,
    total_revenue_calc,
    transaction_count_calc,
    revenue_rank_calc
  FROM ranked_items
  WHERE quantity_rank <= limit_count
  ORDER BY quantity_rank;
END;
$$ LANGUAGE plpgsql;

-- Create function to get menu category performance (fixed)
CREATE OR REPLACE FUNCTION get_menu_category_performance(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  category_name TEXT,
  total_quantity NUMERIC,
  total_revenue NUMERIC,
  item_count BIGINT,
  avg_item_price NUMERIC,
  revenue_percentage NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  WITH category_sales AS (
    SELECT 
      COALESCE(ts.sales_category_name, 'Uncategorized') as category_name_calc,
      SUM(ts.quantity) as total_quantity_calc,
      SUM(ts.price / 100.0) as total_revenue_calc,
      COUNT(DISTINCT ts.item_guid) as item_count_calc,
      AVG(ts.price / 100.0 / NULLIF(ts.quantity, 0)) as avg_item_price_calc
    FROM toast_selections ts
    INNER JOIN toast_checks tc ON ts.check_guid = tc.check_guid 
      AND ts.snapshot_timestamp = tc.snapshot_timestamp
    WHERE ts.voided = FALSE
      AND tc.voided = FALSE
      AND DATE(tc.created_date) >= start_date
      AND DATE(tc.created_date) <= end_date
    GROUP BY ts.sales_category_name
  ),
  total_sales AS (
    SELECT SUM(total_revenue_calc) as grand_total
    FROM category_sales
  )
  SELECT 
    cs.category_name_calc,
    cs.total_quantity_calc,
    cs.total_revenue_calc,
    cs.item_count_calc,
    cs.avg_item_price_calc,
    ROUND((cs.total_revenue_calc / NULLIF(t.grand_total, 0) * 100)::NUMERIC, 2)
  FROM category_sales cs
  CROSS JOIN total_sales t
  ORDER BY cs.total_revenue_calc DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_menu_items_sold(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_menu_items_sold(DATE, DATE, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_top_selling_items(DATE, DATE, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_selling_items(DATE, DATE, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_menu_category_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_menu_category_performance(DATE, DATE) TO anon;
`;

async function fixMenuFunctions() {
  console.log('🔧 Fixing menu RPC functions...\n');
  
  try {
    // Execute SQL directly
    const { error } = await supabase.rpc('query', {
      query: fixSQL
    }).single();
    
    if (error) {
      // Try a different approach - execute as raw SQL
      console.log('❌ Direct RPC failed, trying alternative method...');
      console.log('Please run the following SQL in Supabase SQL editor:');
      console.log('\n' + fixSQL);
    } else {
      console.log('✅ Functions fixed successfully!');
    }
  } catch (err) {
    console.error('❌ Error:', err);
    console.log('\nPlease run the SQL manually in Supabase dashboard');
  }
}

fixMenuFunctions().catch(console.error);
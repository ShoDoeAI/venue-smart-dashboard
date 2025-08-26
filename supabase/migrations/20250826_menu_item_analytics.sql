-- Create RPC function for menu item analytics
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
      ts.item_guid,
      ts.item_name,
      ts.sales_category_name,
      SUM(ts.quantity) as total_quantity,
      SUM(ts.price / 100.0) as total_revenue, -- Convert cents to dollars
      COUNT(DISTINCT ts.check_guid) as transaction_count,
      AVG(ts.price / 100.0 / NULLIF(ts.quantity, 0)) as avg_price
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
    item_guid,
    item_name,
    COALESCE(sales_category_name, 'Uncategorized') as sales_category_name,
    total_quantity,
    total_revenue,
    transaction_count,
    avg_price
  FROM menu_sales
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get top selling items for a period
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
      ROW_NUMBER() OVER (ORDER BY SUM(ts.quantity) DESC) as quantity_rank,
      ROW_NUMBER() OVER (ORDER BY SUM(ts.price / 100.0) DESC) as revenue_rank_calc,
      ts.item_guid,
      ts.item_name,
      COALESCE(ts.sales_category_name, 'Uncategorized') as sales_category_name,
      SUM(ts.quantity) as total_quantity,
      SUM(ts.price / 100.0) as total_revenue,
      COUNT(DISTINCT ts.check_guid) as transaction_count
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
    quantity_rank::INTEGER as rank,
    item_guid,
    item_name,
    sales_category_name,
    total_quantity,
    total_revenue,
    transaction_count,
    revenue_rank_calc::INTEGER as revenue_rank
  FROM ranked_items
  WHERE quantity_rank <= limit_count
  ORDER BY quantity_rank;
END;
$$ LANGUAGE plpgsql;

-- Create function to get menu category performance
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
      COALESCE(ts.sales_category_name, 'Uncategorized') as category_name,
      SUM(ts.quantity) as total_quantity,
      SUM(ts.price / 100.0) as total_revenue,
      COUNT(DISTINCT ts.item_guid) as item_count,
      AVG(ts.price / 100.0 / NULLIF(ts.quantity, 0)) as avg_item_price
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
    SELECT SUM(total_revenue) as grand_total
    FROM category_sales
  )
  SELECT 
    cs.category_name,
    cs.total_quantity,
    cs.total_revenue,
    cs.item_count,
    cs.avg_item_price,
    ROUND((cs.total_revenue / NULLIF(t.grand_total, 0) * 100)::NUMERIC, 2) as revenue_percentage
  FROM category_sales cs
  CROSS JOIN total_sales t
  ORDER BY cs.total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_menu_items_sold(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_menu_items_sold(DATE, DATE, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_top_selling_items(DATE, DATE, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_selling_items(DATE, DATE, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_menu_category_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_menu_category_performance(DATE, DATE) TO anon;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_toast_checks_created_date ON toast_checks(created_date);
CREATE INDEX IF NOT EXISTS idx_toast_selections_item_guid ON toast_selections(item_guid);
CREATE INDEX IF NOT EXISTS idx_toast_selections_sales_category ON toast_selections(sales_category_name);
-- Create a view that maps toast_checks to the expected simple_transactions format
-- This fixes the dashboard by providing data in the format the KPI calculator expects

CREATE OR REPLACE VIEW simple_transactions AS
SELECT 
  check_guid as id,
  check_guid as transaction_id,
  order_guid,
  'bfb355cb-55e4-4f57-af16-d0d18c11ad3c' as venue_id, -- Default venue ID
  'toast' as source,
  created_date as transaction_date,
  total_amount as amount, -- Already in dollars
  tax_amount as tax,
  tip_amount as tip,
  applied_discount_amount as discount,
  payment_status as status,
  CASE 
    WHEN payment_status IN ('PAID', 'CLOSED') THEN 'completed'
    WHEN payment_status = 'OPEN' THEN 'pending'
    ELSE 'other'
  END as transaction_status,
  NULL::text as customer_id,
  NULL::text as customer_email,
  NULL::text as customer_name,
  'POS Sale' as transaction_type,
  NULL::text as payment_method,
  jsonb_build_object(
    'check_guid', check_guid,
    'order_guid', order_guid,
    'amount', amount,
    'tax', tax_amount,
    'tip', tip_amount,
    'closed_date', closed_date
  ) as metadata,
  created_at as created_at,
  created_at as updated_at
FROM toast_checks
WHERE total_amount > 0;  -- Exclude $0 checks

-- Grant permissions
GRANT SELECT ON simple_transactions TO authenticated;
GRANT SELECT ON simple_transactions TO anon;
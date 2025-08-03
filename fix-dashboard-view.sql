-- Create a view that maps toast_checks to the expected simple_transactions format
CREATE OR REPLACE VIEW simple_transactions AS
SELECT 
  check_guid as id,
  check_guid as transaction_id,
  order_guid,
  location_id as venue_id,
  'toast' as source,
  created_date as transaction_date,
  total_amount as amount, -- Already in dollars
  tax_amount as tax,
  tip_amount as tip,
  discount_amount as discount,
  payment_status as status,
  CASE 
    WHEN payment_status IN ('PAID', 'CLOSED') THEN 'completed'
    WHEN payment_status = 'OPEN' THEN 'pending'
    ELSE 'other'
  END as transaction_status,
  NULL as customer_id,
  NULL as customer_email,
  NULL as customer_name,
  'POS Sale' as transaction_type,
  NULL as payment_method,
  jsonb_build_object(
    'check_guid', check_guid,
    'order_guid', order_guid,
    'amount_cents', amount,
    'tax_cents', tax_amount,
    'tip_cents', tip_amount,
    'closed_date', closed_date
  ) as metadata,
  synced_at as created_at,
  synced_at as updated_at
FROM toast_checks
WHERE total_amount > 0;  -- Exclude $0 checks

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simple_transactions_date ON toast_checks(created_date);
CREATE INDEX IF NOT EXISTS idx_simple_transactions_venue ON toast_checks(location_id);
CREATE INDEX IF NOT EXISTS idx_simple_transactions_status ON toast_checks(payment_status);
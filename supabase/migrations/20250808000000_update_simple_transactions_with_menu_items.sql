-- Update simple_transactions view to include menu items from toast_selections
-- This fixes the "false menu items" issue by properly joining with selections data

CREATE OR REPLACE VIEW simple_transactions AS
SELECT 
  tc.check_guid as id,
  tc.check_guid as transaction_id,
  tc.order_guid,
  'bfb355cb-55e4-4f57-af16-d0d18c11ad3c' as venue_id, -- Default venue ID
  'toast' as source,
  tc.created_date as transaction_date,
  tc.total_amount as amount, -- Already in dollars
  tc.tax_amount as tax,
  tc.tip_amount as tip,
  tc.applied_discount_amount as discount,
  tc.payment_status as status,
  CASE 
    WHEN tc.payment_status IN ('PAID', 'CLOSED') THEN 'completed'
    WHEN tc.payment_status = 'OPEN' THEN 'pending'
    ELSE 'other'
  END as transaction_status,
  tc.customer_guid as customer_id,
  tc.customer_email as customer_email,
  COALESCE(
    NULLIF(CONCAT(tc.customer_first_name, ' ', tc.customer_last_name), ' '),
    tc.customer_first_name,
    tc.customer_last_name
  ) as customer_name,
  'POS Sale' as transaction_type,
  NULL::text as payment_method,
  jsonb_build_object(
    'check_guid', tc.check_guid,
    'order_guid', tc.order_guid,
    'amount', tc.amount,
    'tax', tc.tax_amount,
    'tip', tc.tip_amount,
    'closed_date', tc.closed_date,
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', ts.item_name,
            'quantity', ts.quantity,
            'price', ts.price / 100.0, -- Convert cents to dollars
            'sales_category', ts.sales_category_name
          )
        )
        FROM toast_selections ts
        WHERE ts.check_guid = tc.check_guid
          AND ts.voided = false
      ),
      '[]'::jsonb
    )
  ) as metadata,
  tc.created_at as created_at,
  tc.created_at as updated_at
FROM toast_checks tc
WHERE tc.total_amount > 0  -- Exclude $0 checks
  AND tc.voided = false;   -- Exclude voided checks

-- Grant permissions
GRANT SELECT ON simple_transactions TO authenticated;
GRANT SELECT ON simple_transactions TO anon;

-- Add index on toast_selections for better join performance
CREATE INDEX IF NOT EXISTS idx_toast_selections_check_guid ON toast_selections(check_guid);
CREATE INDEX IF NOT EXISTS idx_toast_selections_voided ON toast_selections(voided);
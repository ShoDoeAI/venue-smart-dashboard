-- Add historical data support to the underlying toast tables
-- Since toast_transactions is a view, we need to add the flag to the base tables

-- Add historical flag to toast_payments (the main table that drives transactions)
ALTER TABLE toast_payments 
ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE;

-- Add historical flag to toast_checks and toast_orders for consistency
ALTER TABLE toast_checks 
ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE;

ALTER TABLE toast_orders 
ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE;

-- Add indexes for historical data queries on the base tables
CREATE INDEX IF NOT EXISTS idx_toast_payments_historical 
ON toast_payments (is_historical, paid_date);

CREATE INDEX IF NOT EXISTS idx_toast_payments_snapshot 
ON toast_payments (snapshot_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_toast_orders_historical 
ON toast_orders (is_historical, created_date);

CREATE INDEX IF NOT EXISTS idx_toast_orders_snapshot 
ON toast_orders (snapshot_timestamp DESC);

-- Update the toast_transactions view to include historical flag
CREATE OR REPLACE VIEW public.toast_transactions AS 
SELECT p.id,
    p.snapshot_timestamp,
    p.payment_guid AS transaction_id,
    o.location_id,
    o.created_date AS created_at,
    (p.amount + COALESCE(p.tip_amount, 0::numeric)) AS total_amount,
    c.tax_amount,
    p.tip_amount,
    abs(COALESCE(c.applied_discount_amount, 0::numeric)) AS discount_amount,
    COALESCE((((c.applied_service_charges -> 0) ->> 'amount'::text))::numeric, 0) AS service_charge_amount,
    p.type AS source_type,
        CASE
            WHEN (p.refund_status IS NOT NULL) THEN p.refund_status
            WHEN (o.paid_date IS NOT NULL) THEN 'COMPLETED'::text
            ELSE 'PENDING'::text
        END AS status,
    o.order_number AS receipt_number,
    NULL::text AS receipt_url,
    c.customer_guid AS customer_id,
    ((c.customer_first_name || ' '::text) || c.customer_last_name) AS customer_name,
    c.customer_email,
    o.server_guid AS team_member_id,
    NULL::text AS device_id,
    ( SELECT count(*) AS count
           FROM toast_selections s
          WHERE ((s.check_guid = c.check_guid) AND (s.snapshot_timestamp = p.snapshot_timestamp))) AS item_count,
    ( SELECT count(DISTINCT s.item_guid) AS count
           FROM toast_selections s
          WHERE ((s.check_guid = c.check_guid) AND (s.snapshot_timestamp = p.snapshot_timestamp))) AS unique_item_count,
    o.void_date,
    'toast'::text AS source,
    o.paid_date,
    jsonb_build_object('check', c, 'order', o, 'payment', p) AS raw_data,
    -- Add historical flag from the payment record (primary transaction driver)
    p.is_historical
   FROM ((toast_payments p
     JOIN toast_checks c ON ((((p.check_guid = c.check_guid) AND (p.snapshot_timestamp = c.snapshot_timestamp)) AND (c.voided = false))))
     JOIN toast_orders o ON ((((p.order_guid = o.order_guid) AND (p.snapshot_timestamp = o.snapshot_timestamp)) AND (o.voided = false))))
  WHERE (p.voided = false);

-- Create a view for easy historical vs real-time data access
CREATE OR REPLACE VIEW toast_transactions_with_period AS
SELECT 
  *,
  CASE 
    WHEN is_historical = TRUE THEN 'historical'
    ELSE 'real-time'
  END as data_period,
  DATE(created_at) as transaction_date,
  EXTRACT(YEAR FROM created_at) as transaction_year,
  EXTRACT(MONTH FROM created_at) as transaction_month,
  EXTRACT(WEEK FROM created_at) as transaction_week,
  EXTRACT(DOW FROM created_at) as day_of_week
FROM toast_transactions;

-- Create aggregated daily revenue view for faster queries
CREATE OR REPLACE VIEW daily_revenue_summary AS
SELECT 
  location_id,
  DATE(created_at) as date,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_revenue,
  SUM(tax_amount) as total_tax,
  SUM(tip_amount) as total_tips,
  SUM(discount_amount) as total_discounts,
  AVG(total_amount) as avg_transaction_value,
  MIN(created_at) as first_transaction,
  MAX(created_at) as last_transaction,
  COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL) as unique_customers
FROM toast_transactions
GROUP BY location_id, DATE(created_at)
ORDER BY date DESC;

-- Create weekly revenue summary view
CREATE OR REPLACE VIEW weekly_revenue_summary AS
SELECT 
  location_id,
  DATE_TRUNC('week', created_at)::date as week_start,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_revenue,
  SUM(tax_amount) as total_tax,
  SUM(tip_amount) as total_tips,
  AVG(total_amount) as avg_transaction_value,
  COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL) as unique_customers
FROM toast_transactions
GROUP BY location_id, DATE_TRUNC('week', created_at)
ORDER BY week_start DESC;

-- Create monthly revenue summary view
CREATE OR REPLACE VIEW monthly_revenue_summary AS
SELECT 
  location_id,
  DATE_TRUNC('month', created_at)::date as month_start,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_revenue,
  SUM(tax_amount) as total_tax,
  SUM(tip_amount) as total_tips,
  AVG(total_amount) as avg_transaction_value,
  COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL) as unique_customers
FROM toast_transactions
GROUP BY location_id, DATE_TRUNC('month', created_at)
ORDER BY month_start DESC;

-- Add comment explaining the historical data strategy
COMMENT ON COLUMN toast_transactions.is_historical IS 'TRUE for data imported from historical sync (2+ years back), FALSE for real-time data';
COMMENT ON VIEW daily_revenue_summary IS 'Pre-aggregated daily revenue metrics for fast dashboard queries';
COMMENT ON VIEW weekly_revenue_summary IS 'Pre-aggregated weekly revenue metrics for trend analysis';
COMMENT ON VIEW monthly_revenue_summary IS 'Pre-aggregated monthly revenue metrics for long-term analysis';
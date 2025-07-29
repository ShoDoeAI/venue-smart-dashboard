-- Fix Toast amount columns to store dollar amounts instead of cents
-- Toast API returns amounts in dollars (e.g., 10.50) so we should store them as decimals

-- First, drop the view that depends on these columns
DROP VIEW IF EXISTS public.toast_transactions;

-- Update toast_checks table
ALTER TABLE public.toast_checks 
  ALTER COLUMN amount TYPE numeric(10,2) USING amount::numeric / 100,
  ALTER COLUMN tax_amount TYPE numeric(10,2) USING tax_amount::numeric / 100,
  ALTER COLUMN tip_amount TYPE numeric(10,2) USING tip_amount::numeric / 100,
  ALTER COLUMN total_amount TYPE numeric(10,2) USING total_amount::numeric / 100,
  ALTER COLUMN applied_discount_amount TYPE numeric(10,2) USING applied_discount_amount::numeric / 100;

-- Update toast_payments table
ALTER TABLE public.toast_payments
  ALTER COLUMN amount TYPE numeric(10,2) USING amount::numeric / 100,
  ALTER COLUMN tip_amount TYPE numeric(10,2) USING tip_amount::numeric / 100,
  ALTER COLUMN amount_tendered TYPE numeric(10,2) USING amount_tendered::numeric / 100,
  ALTER COLUMN mca_repayment_amount TYPE numeric(10,2) USING mca_repayment_amount::numeric / 100;

-- Update toast_selections table (has different column names)
ALTER TABLE public.toast_selections
  ALTER COLUMN price TYPE numeric(10,2) USING price::numeric / 100,
  ALTER COLUMN tax TYPE numeric(10,2) USING tax::numeric / 100,
  ALTER COLUMN pre_discount_price TYPE numeric(10,2) USING pre_discount_price::numeric / 100,
  ALTER COLUMN receipt_line_price TYPE numeric(10,2) USING receipt_line_price::numeric / 100;

-- Update toast_menu_items table (if it exists and has price column)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'toast_menu_items' 
    AND column_name = 'price'
  ) THEN
    ALTER TABLE public.toast_menu_items
      ALTER COLUMN price TYPE numeric(10,2) USING price::numeric / 100;
  END IF;
END $$;

-- Recreate the toast_transactions view with updated column types
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
    jsonb_build_object('check', c, 'order', o, 'payment', p) AS raw_data
   FROM ((toast_payments p
     JOIN toast_checks c ON ((((p.check_guid = c.check_guid) AND (p.snapshot_timestamp = c.snapshot_timestamp)) AND (c.voided = false))))
     JOIN toast_orders o ON ((((p.order_guid = o.order_guid) AND (p.snapshot_timestamp = o.snapshot_timestamp)) AND (o.voided = false))))
  WHERE (p.voided = false);

-- Add comments to document the change
COMMENT ON COLUMN public.toast_checks.amount IS 'Check amount in dollars (not cents)';
COMMENT ON COLUMN public.toast_checks.tax_amount IS 'Tax amount in dollars (not cents)';
COMMENT ON COLUMN public.toast_checks.tip_amount IS 'Tip amount in dollars (not cents)';
COMMENT ON COLUMN public.toast_checks.total_amount IS 'Total amount in dollars (not cents)';
COMMENT ON COLUMN public.toast_checks.applied_discount_amount IS 'Applied discount amount in dollars (not cents)';

COMMENT ON COLUMN public.toast_payments.amount IS 'Payment amount in dollars (not cents)';
COMMENT ON COLUMN public.toast_payments.tip_amount IS 'Tip amount in dollars (not cents)';
COMMENT ON COLUMN public.toast_payments.amount_tendered IS 'Amount tendered in dollars (not cents)';
COMMENT ON COLUMN public.toast_payments.mca_repayment_amount IS 'MCA repayment amount in dollars (not cents)';
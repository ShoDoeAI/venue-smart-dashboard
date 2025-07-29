-- Fix Toast amount columns to store dollar amounts instead of cents
-- Toast API returns amounts in dollars (e.g., 10.50) so we should store them as decimals

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

-- Update toast_selections table (if it has price columns)
ALTER TABLE public.toast_selections
  ALTER COLUMN unit_price TYPE numeric(10,2) USING unit_price::numeric / 100,
  ALTER COLUMN total_price TYPE numeric(10,2) USING total_price::numeric / 100,
  ALTER COLUMN tax_amount TYPE numeric(10,2) USING tax_amount::numeric / 100;

-- Update toast_menu_items table (if it has price columns)
ALTER TABLE public.toast_menu_items
  ALTER COLUMN price TYPE numeric(10,2) USING price::numeric / 100;

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
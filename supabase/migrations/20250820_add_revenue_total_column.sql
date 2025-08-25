-- Add revenue_total column to revenue_overrides table
-- This column is needed for the sync script to work properly

ALTER TABLE revenue_overrides 
ADD COLUMN IF NOT EXISTS revenue_total numeric(10,2);

-- Copy actual_revenue to revenue_total for existing records
UPDATE revenue_overrides 
SET revenue_total = actual_revenue 
WHERE revenue_total IS NULL;
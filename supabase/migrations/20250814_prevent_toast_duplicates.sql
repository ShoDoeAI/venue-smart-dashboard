-- Migration: Add unique constraint to prevent duplicate toast_checks
-- This ensures each check_guid can only appear once in the database

-- First, remove any existing duplicates (keeping the first occurrence)
DELETE FROM toast_checks a
USING toast_checks b
WHERE a.id > b.id 
  AND a.check_guid = b.check_guid;

-- Add unique constraint on check_guid
ALTER TABLE toast_checks 
ADD CONSTRAINT toast_checks_check_guid_unique 
UNIQUE (check_guid);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_toast_checks_check_guid 
ON toast_checks(check_guid);

-- Add similar constraint for toast_orders
DELETE FROM toast_orders a
USING toast_orders b
WHERE a.id > b.id 
  AND a.order_guid = b.order_guid;

ALTER TABLE toast_orders 
ADD CONSTRAINT toast_orders_order_guid_unique 
UNIQUE (order_guid);

CREATE INDEX IF NOT EXISTS idx_toast_orders_order_guid 
ON toast_orders(order_guid);
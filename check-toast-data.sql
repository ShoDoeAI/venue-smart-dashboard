-- Check what Toast data we have in the database

-- 1. Count orders
SELECT COUNT(*) as total_orders, 
       COUNT(DISTINCT order_guid) as unique_orders,
       MIN(created_date) as oldest_order,
       MAX(created_date) as newest_order
FROM toast_orders;

-- 2. Count checks
SELECT COUNT(*) as total_checks,
       COUNT(DISTINCT check_guid) as unique_checks,
       COUNT(DISTINCT order_guid) as orders_with_checks
FROM toast_checks;

-- 3. Count payments
SELECT COUNT(*) as total_payments,
       COUNT(DISTINCT payment_guid) as unique_payments,
       SUM(amount) / 100.0 as total_revenue
FROM toast_payments;

-- 4. Sample recent orders to see their structure
SELECT order_guid, created_date, paid_date, server_first_name, server_last_name, 
       voided, dining_option_name
FROM toast_orders
ORDER BY created_date DESC
LIMIT 10;
EOF < /dev/null
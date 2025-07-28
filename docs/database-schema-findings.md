# Database Schema Findings

## Key Discovery

The `toast_transactions` is indeed a **VIEW**, not a table. It aggregates data from multiple Toast-related tables.

## Toast Database Structure

### Base Tables

1. **toast_payments** - Core payment records
2. **toast_checks** - Check/bill information
3. **toast_orders** - Order details
4. **toast_selections** - Individual items ordered
5. **toast_employees** - Staff information
6. **toast_menu_items** - Menu item definitions
7. **toast_restaurant_info** - Restaurant configuration

### The View Definition

`toast_transactions` is a VIEW that:

- Joins `toast_payments`, `toast_checks`, and `toast_orders`
- Calculates totals (amount + tips)
- Formats customer names
- Counts items from `toast_selections`
- Provides a unified transaction interface

## The Problem

Our sync endpoints are trying to INSERT into this VIEW, which is read-only by nature.

## Solution Options

### Option 1: Use the Existing Tables (Recommended)

Instead of inserting into `toast_transactions`, we should insert into the base tables:

- `toast_payments` for payment data
- `toast_checks` for check data
- `toast_orders` for order data
- `toast_selections` for item details

### Option 2: Create simple_transactions Table

If we want a simpler structure, create a new table specifically for simplified transaction storage.

### Option 3: Modify the View

Create a trigger on the view to handle inserts (complex, not recommended).

## Next Steps

1. **Update Sync Logic**: Modify Toast sync endpoints to insert into the proper base tables
2. **Data Mapping**: Map Toast API response to the correct tables:

   ```javascript
   // Toast API Order → Multiple tables
   order → toast_orders
   order.checks → toast_checks
   order.checks[].payments → toast_payments
   order.checks[].selections → toast_selections
   ```

3. **Remove Unnecessary Endpoints**: Clean up all the diagnostic endpoints created during debugging

## Sample Insert Strategy

Instead of:

```sql
INSERT INTO toast_transactions (...) VALUES (...);
```

Use:

```sql
-- 1. Insert order
INSERT INTO toast_orders (...) VALUES (...);

-- 2. Insert checks
INSERT INTO toast_checks (...) VALUES (...);

-- 3. Insert payments
INSERT INTO toast_payments (...) VALUES (...);

-- 4. Insert selections
INSERT INTO toast_selections (...) VALUES (...);
```

The view will automatically show the aggregated data once the base tables are populated.

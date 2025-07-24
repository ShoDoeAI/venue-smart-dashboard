-- Comprehensive Toast POS Database Schema
-- Based on Toast API v2 documentation and actual API responses

-- Drop existing tables if needed (be careful in production!)
-- DROP TABLE IF EXISTS toast_transactions CASCADE;

-- Main Orders table (top-level entity)
CREATE TABLE IF NOT EXISTS toast_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Order identifiers
    order_guid TEXT NOT NULL,
    external_id TEXT,
    display_number INTEGER,
    order_number TEXT,
    
    -- Order metadata
    source TEXT, -- "In Store", "Online", "API", etc.
    business_date INTEGER, -- YYYYMMDD format
    revenue_center_guid TEXT,
    revenue_center_name TEXT,
    
    -- Timestamps
    created_date TIMESTAMPTZ NOT NULL,
    modified_date TIMESTAMPTZ,
    opened_date TIMESTAMPTZ,
    closed_date TIMESTAMPTZ,
    paid_date TIMESTAMPTZ,
    deleted_date TIMESTAMPTZ,
    
    -- Status
    voided BOOLEAN DEFAULT false,
    void_date TIMESTAMPTZ,
    void_business_date INTEGER,
    approval_status TEXT,
    
    -- Guest info
    guest_count INTEGER,
    dining_option_guid TEXT,
    dining_option_name TEXT,
    
    -- Server/Employee
    server_guid TEXT,
    server_first_name TEXT,
    server_last_name TEXT,
    server_external_id TEXT,
    
    -- Location
    location_id TEXT NOT NULL,
    
    -- Delivery/pickup info (stored as JSONB for flexibility)
    delivery_info JSONB,
    curbside_pickup_info JSONB,
    
    -- Indexes for performance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_guid, snapshot_timestamp)
);

-- Guest Checks table (bills within orders)
CREATE TABLE IF NOT EXISTS toast_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Check identifiers
    check_guid TEXT NOT NULL,
    order_guid TEXT NOT NULL,
    tab_name TEXT,
    
    -- Amounts (stored in cents)
    amount INTEGER DEFAULT 0, -- Subtotal before tax/tip
    tax_amount INTEGER DEFAULT 0,
    tip_amount INTEGER DEFAULT 0,
    total_amount INTEGER DEFAULT 0,
    applied_discount_amount INTEGER DEFAULT 0,
    
    -- Timestamps
    created_date TIMESTAMPTZ,
    opened_date TIMESTAMPTZ,
    closed_date TIMESTAMPTZ,
    
    -- Status
    voided BOOLEAN DEFAULT false,
    void_date TIMESTAMPTZ,
    payment_status TEXT,
    
    -- Customer info
    customer_guid TEXT,
    customer_first_name TEXT,
    customer_last_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    customer_company_name TEXT,
    
    -- Service charges (array of applied charges)
    applied_service_charges JSONB,
    
    -- Applied discounts (array)
    applied_discounts JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(check_guid, snapshot_timestamp)
);

-- Payments table
CREATE TABLE IF NOT EXISTS toast_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Payment identifiers
    payment_guid TEXT NOT NULL,
    check_guid TEXT NOT NULL,
    order_guid TEXT NOT NULL,
    
    -- Amounts (in cents)
    amount INTEGER NOT NULL, -- Payment amount excluding tip
    tip_amount INTEGER DEFAULT 0,
    amount_tendered INTEGER, -- For cash payments
    
    -- Payment details
    type TEXT, -- "CREDIT", "CASH", "EXTERNAL", etc.
    card_type TEXT, -- Card brand if applicable
    last_4_digits TEXT,
    external_payment_guid TEXT,
    
    -- Timestamps
    paid_date TIMESTAMPTZ,
    paid_business_date INTEGER,
    
    -- Status
    house BOOLEAN DEFAULT false, -- If house/comp payment
    refund_status TEXT,
    
    -- Void info
    voided BOOLEAN DEFAULT false,
    void_date TIMESTAMPTZ,
    void_user_guid TEXT,
    void_user_name TEXT,
    
    -- Refund details (if applicable)
    refund JSONB,
    
    -- MCA repayment
    mca_repayment_amount INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(payment_guid, snapshot_timestamp)
);

-- Menu selections (items ordered)
CREATE TABLE IF NOT EXISTS toast_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Selection identifiers
    selection_guid TEXT NOT NULL,
    check_guid TEXT NOT NULL,
    order_guid TEXT NOT NULL,
    
    -- Item details
    item_guid TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_group_guid TEXT,
    item_group_name TEXT,
    
    -- Quantity and pricing (prices in cents)
    quantity DECIMAL(10,3) NOT NULL,
    price INTEGER, -- Unit price
    tax INTEGER,
    pre_discount_price INTEGER,
    receipt_line_price INTEGER,
    
    -- Display info
    display_name TEXT,
    selection_type TEXT,
    
    -- Sales category
    sales_category_guid TEXT,
    sales_category_name TEXT,
    
    -- Status
    voided BOOLEAN DEFAULT false,
    void_date TIMESTAMPTZ,
    void_business_date INTEGER,
    void_reason_guid TEXT,
    void_reason_name TEXT,
    
    -- Fulfillment
    fulfillment_status TEXT,
    deferred_price INTEGER,
    
    -- Modifiers (array of modifier objects)
    modifiers JSONB,
    
    -- Applied discounts (array)
    applied_discounts JSONB,
    
    -- Refund details
    refund_details JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(selection_guid, snapshot_timestamp)
);

-- Menu catalog (current menu items)
CREATE TABLE IF NOT EXISTS toast_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Item identifiers
    item_guid TEXT NOT NULL,
    external_id TEXT,
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    
    -- Categorization
    menu_group_guid TEXT,
    menu_group_name TEXT,
    sales_category_guid TEXT,
    sales_category_name TEXT,
    
    -- Pricing (in cents)
    base_price INTEGER,
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    visibility TEXT[], -- Array of visibility contexts
    
    -- Options
    option_groups JSONB, -- Array of option groups
    
    -- Metadata
    images JSONB, -- Array of image URLs
    allergen_info JSONB,
    nutritional_info JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_guid, snapshot_timestamp)
);

-- Employees/Staff table
CREATE TABLE IF NOT EXISTS toast_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Employee identifiers
    employee_guid TEXT NOT NULL UNIQUE,
    external_id TEXT,
    
    -- Basic info
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    
    -- Employment details
    hire_date DATE,
    termination_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Roles and permissions
    job_roles JSONB, -- Array of job roles
    wage_info JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant configuration
CREATE TABLE IF NOT EXISTS toast_restaurant_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Restaurant identifiers
    restaurant_guid TEXT NOT NULL,
    location_guid TEXT NOT NULL UNIQUE,
    
    -- Basic info
    name TEXT NOT NULL,
    location_name TEXT,
    
    -- Address
    address1 TEXT,
    address2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    
    -- Contact
    phone TEXT,
    website TEXT,
    
    -- Operating hours (JSONB for flexibility)
    hours_of_operation JSONB,
    
    -- Settings
    timezone TEXT DEFAULT 'America/Los_Angeles',
    currency TEXT DEFAULT 'USD',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simplified transactions view (for backward compatibility)
CREATE OR REPLACE VIEW toast_transactions AS
SELECT 
    p.id,
    p.snapshot_timestamp,
    p.payment_guid as transaction_id,
    o.location_id,
    o.created_date as created_at,
    p.amount + COALESCE(p.tip_amount, 0) as total_amount,
    c.tax_amount,
    p.tip_amount,
    ABS(COALESCE(c.applied_discount_amount, 0)) as discount_amount,
    COALESCE((c.applied_service_charges->0->>'amount')::INTEGER, 0) as service_charge_amount,
    p.type as source_type,
    CASE 
        WHEN p.refund_status IS NOT NULL THEN p.refund_status
        WHEN o.paid_date IS NOT NULL THEN 'COMPLETED'
        ELSE 'PENDING'
    END as status,
    o.order_number as receipt_number,
    NULL as receipt_url,
    c.customer_guid as customer_id,
    c.customer_first_name || ' ' || c.customer_last_name as customer_name,
    c.customer_email,
    o.server_guid as team_member_id,
    NULL as device_id,
    (SELECT COUNT(*) FROM toast_selections s WHERE s.check_guid = c.check_guid AND s.snapshot_timestamp = p.snapshot_timestamp) as item_count,
    (SELECT COUNT(DISTINCT s.item_guid) FROM toast_selections s WHERE s.check_guid = c.check_guid AND s.snapshot_timestamp = p.snapshot_timestamp) as unique_item_count,
    (SELECT json_agg(s.*) FROM toast_selections s WHERE s.check_guid = c.check_guid AND s.snapshot_timestamp = p.snapshot_timestamp) as itemizations,
    json_build_object(
        'payment_guid', p.payment_guid,
        'type', p.type,
        'card_type', p.card_type,
        'last_4_digits', p.last_4_digits
    ) as payment_details,
    p.refund as refunds,
    p.created_at as created_at_db
FROM toast_payments p
JOIN toast_checks c ON p.check_guid = c.check_guid AND p.snapshot_timestamp = c.snapshot_timestamp
JOIN toast_orders o ON p.order_guid = o.order_guid AND p.snapshot_timestamp = o.snapshot_timestamp
WHERE p.voided = false AND c.voided = false AND o.voided = false;

-- Create indexes for performance
CREATE INDEX idx_toast_orders_guid ON toast_orders(order_guid);
CREATE INDEX idx_toast_orders_date ON toast_orders(created_date DESC);
CREATE INDEX idx_toast_orders_business_date ON toast_orders(business_date DESC);
CREATE INDEX idx_toast_orders_location ON toast_orders(location_id, created_date DESC);
CREATE INDEX idx_toast_orders_snapshot ON toast_orders(snapshot_timestamp DESC);

CREATE INDEX idx_toast_checks_guid ON toast_checks(check_guid);
CREATE INDEX idx_toast_checks_order ON toast_checks(order_guid);
CREATE INDEX idx_toast_checks_customer ON toast_checks(customer_email);
CREATE INDEX idx_toast_checks_snapshot ON toast_checks(snapshot_timestamp DESC);

CREATE INDEX idx_toast_payments_guid ON toast_payments(payment_guid);
CREATE INDEX idx_toast_payments_check ON toast_payments(check_guid);
CREATE INDEX idx_toast_payments_order ON toast_payments(order_guid);
CREATE INDEX idx_toast_payments_date ON toast_payments(paid_date DESC);
CREATE INDEX idx_toast_payments_type ON toast_payments(type);
CREATE INDEX idx_toast_payments_snapshot ON toast_payments(snapshot_timestamp DESC);

CREATE INDEX idx_toast_selections_guid ON toast_selections(selection_guid);
CREATE INDEX idx_toast_selections_check ON toast_selections(check_guid);
CREATE INDEX idx_toast_selections_item ON toast_selections(item_guid);
CREATE INDEX idx_toast_selections_snapshot ON toast_selections(snapshot_timestamp DESC);

CREATE INDEX idx_toast_menu_items_guid ON toast_menu_items(item_guid);
CREATE INDEX idx_toast_menu_items_group ON toast_menu_items(menu_group_guid);
CREATE INDEX idx_toast_menu_items_snapshot ON toast_menu_items(snapshot_timestamp DESC);

-- Enable Row Level Security
ALTER TABLE toast_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE toast_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE toast_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE toast_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE toast_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE toast_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE toast_restaurant_info ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can view toast orders" ON toast_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view toast checks" ON toast_checks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view toast payments" ON toast_payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view toast selections" ON toast_selections
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view toast menu" ON toast_menu_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view toast employees" ON toast_employees
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view restaurant info" ON toast_restaurant_info
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role policies for backend operations
CREATE POLICY "Service role full access toast_orders" ON toast_orders
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access toast_checks" ON toast_checks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access toast_payments" ON toast_payments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access toast_selections" ON toast_selections
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access toast_menu_items" ON toast_menu_items
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access toast_employees" ON toast_employees
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access toast_restaurant_info" ON toast_restaurant_info
    FOR ALL USING (auth.role() = 'service_role');

-- Function to calculate revenue metrics
CREATE OR REPLACE FUNCTION calculate_toast_revenue_metrics(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    location_id_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_revenue DECIMAL,
    total_orders BIGINT,
    total_checks BIGINT,
    total_payments BIGINT,
    average_order_value DECIMAL,
    average_check_value DECIMAL,
    total_tips DECIMAL,
    total_tax DECIMAL,
    total_discounts DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(p.amount + COALESCE(p.tip_amount, 0))::DECIMAL / 100 as total_revenue,
        COUNT(DISTINCT o.order_guid) as total_orders,
        COUNT(DISTINCT c.check_guid) as total_checks,
        COUNT(DISTINCT p.payment_guid) as total_payments,
        (SUM(p.amount + COALESCE(p.tip_amount, 0))::DECIMAL / NULLIF(COUNT(DISTINCT o.order_guid), 0) / 100) as average_order_value,
        (SUM(p.amount + COALESCE(p.tip_amount, 0))::DECIMAL / NULLIF(COUNT(DISTINCT c.check_guid), 0) / 100) as average_check_value,
        SUM(COALESCE(p.tip_amount, 0))::DECIMAL / 100 as total_tips,
        SUM(COALESCE(c.tax_amount, 0))::DECIMAL / 100 as total_tax,
        SUM(ABS(COALESCE(c.applied_discount_amount, 0)))::DECIMAL / 100 as total_discounts
    FROM toast_payments p
    JOIN toast_checks c ON p.check_guid = c.check_guid 
        AND p.snapshot_timestamp = c.snapshot_timestamp
    JOIN toast_orders o ON p.order_guid = o.order_guid 
        AND p.snapshot_timestamp = o.snapshot_timestamp
    WHERE 
        o.created_date >= start_date
        AND o.created_date < end_date
        AND (location_id_param IS NULL OR o.location_id = location_id_param)
        AND p.voided = false 
        AND c.voided = false 
        AND o.voided = false;
END;
$$ LANGUAGE plpgsql;
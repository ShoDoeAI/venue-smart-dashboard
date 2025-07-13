# VenueSync Complete Supabase Database Schema

## Overview

This schema uses a hybrid approach:
- Core business fields as columns for fast querying and aggregation
- Complex nested data stored in JSONB columns
- Complete historical snapshots for trend analysis
- Optimized indexes for common queries

## Database Schema

### 1. Core Tables

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main venue configuration (single venue)
CREATE TABLE venue_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API credentials (encrypted)
CREATE TABLE api_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service TEXT NOT NULL UNIQUE,
    credentials JSONB NOT NULL, -- Encrypted with pgcrypto
    is_active BOOLEAN DEFAULT true,
    last_successful_fetch TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_service CHECK (service IN (
        'eventbrite', 'toast', 'wisk', 'resy', 
        'audience_republic', 'meta', 'opentable'
    ))
);
```

### 2. Eventbrite Data

```sql
-- Eventbrite events (historical)
CREATE TABLE eventbrite_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    created TIMESTAMPTZ,
    changed TIMESTAMPTZ,
    published TIMESTAMPTZ,
    status TEXT,
    currency TEXT,
    online_event BOOLEAN,
    listed BOOLEAN,
    shareable BOOLEAN,
    invite_only BOOLEAN,
    capacity INTEGER,
    capacity_is_custom BOOLEAN,
    
    -- Venue information
    venue_id TEXT,
    venue_name TEXT,
    venue_address JSONB, -- {address_1, address_2, city, region, postal_code, country}
    
    -- Organizer
    organizer_id TEXT,
    organizer_name TEXT,
    
    -- Category and format
    category_id TEXT,
    subcategory_id TEXT,
    format_id TEXT,
    
    -- Ticketing summary (detailed breakdown in JSONB)
    tickets_sold INTEGER DEFAULT 0,
    tickets_available INTEGER,
    total_revenue DECIMAL(10,2),
    
    -- Complex nested data
    ticket_classes JSONB, -- Array of ticket types with pricing
    promotional_codes JSONB, -- Active promo codes
    
    -- Calculated fields
    sell_through_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN capacity > 0 
        THEN (tickets_sold::DECIMAL / capacity * 100)
        ELSE 0 END
    ) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_eventbrite_snapshot (snapshot_timestamp DESC),
    INDEX idx_eventbrite_event (event_id, snapshot_timestamp DESC),
    INDEX idx_eventbrite_dates (start_time, end_time)
);

-- Eventbrite attendees (historical snapshots)
CREATE TABLE eventbrite_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    event_id TEXT NOT NULL,
    attendee_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    created TIMESTAMPTZ,
    changed TIMESTAMPTZ,
    ticket_class_id TEXT,
    ticket_class_name TEXT,
    status TEXT, -- attending, not_attending, checked_in
    checked_in BOOLEAN DEFAULT false,
    refunded BOOLEAN DEFAULT false,
    
    -- Profile information
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    
    -- Ticket details
    quantity INTEGER,
    costs JSONB, -- {base_price, eventbrite_fee, gross, payment_fee, tax}
    
    -- Barcode and affiliate
    barcode TEXT,
    affiliate TEXT,
    
    -- Complex data
    answers JSONB, -- Custom question answers
    promotional_code JSONB, -- If used
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_attendee_snapshot (snapshot_timestamp DESC),
    INDEX idx_attendee_event (event_id, snapshot_timestamp DESC),
    INDEX idx_attendee_checkin (event_id, checked_in)
);
```

### 3. Toast POS Data

```sql
-- Toast transactions (historical)
CREATE TABLE toast_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    transaction_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    
    -- Money amounts (in cents)
    total_amount INTEGER NOT NULL,
    tax_amount INTEGER DEFAULT 0,
    tip_amount INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    service_charge_amount INTEGER DEFAULT 0,
    
    -- Transaction details
    source_type TEXT, -- CARD, CASH, EXTERNAL, etc.
    status TEXT, -- COMPLETED, FAILED, PENDING
    receipt_number TEXT,
    receipt_url TEXT,
    
    -- Customer info
    customer_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    
    -- Staff and device
    team_member_id TEXT,
    device_id TEXT,
    
    -- Itemization summary (detailed in JSONB)
    item_count INTEGER,
    unique_item_count INTEGER,
    
    -- Complex data
    itemizations JSONB, -- Array of items sold
    payment_details JSONB, -- Card details, entry method, etc.
    refunds JSONB, -- Any refunds applied
    
    created_at_db TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_square_snapshot (snapshot_timestamp DESC),
    INDEX idx_square_created (created_at DESC),
    INDEX idx_square_location (location_id, created_at DESC)
);

-- Square catalog items (current state + history)
CREATE TABLE square_catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    item_id TEXT NOT NULL,
    version BIGINT,
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT,
    category_name TEXT,
    
    -- Pricing (in cents)
    price_amount INTEGER,
    price_currency TEXT DEFAULT 'USD',
    
    -- Inventory
    track_inventory BOOLEAN DEFAULT false,
    available_online BOOLEAN DEFAULT true,
    available_for_pickup BOOLEAN DEFAULT true,
    
    -- Modifiers and variations
    modifier_list_info JSONB, -- Available modifications
    variations JSONB, -- Size/type variations
    
    -- Tax and reporting
    tax_ids JSONB,
    reporting_category TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_catalog_snapshot (snapshot_timestamp DESC),
    INDEX idx_catalog_item (item_id, snapshot_timestamp DESC)
);
```

### 4. WISK Inventory Data

```sql
-- WISK inventory items (historical snapshots)
CREATE TABLE wisk_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    item_id TEXT NOT NULL,
    
    -- Basic info
    name TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    supplier TEXT,
    brand TEXT,
    
    -- Current levels
    current_stock DECIMAL(10,3),
    unit_of_measure TEXT,
    container_size DECIMAL(10,3),
    containers_in_stock DECIMAL(10,3),
    
    -- Par levels and alerts
    par_level DECIMAL(10,3),
    critical_level DECIMAL(10,3),
    is_below_par BOOLEAN,
    is_critical BOOLEAN,
    
    -- Costs
    unit_cost DECIMAL(10,2),
    total_value DECIMAL(10,2),
    last_purchase_price DECIMAL(10,2),
    average_cost DECIMAL(10,2),
    
    -- Usage and variance
    usage_last_period DECIMAL(10,3),
    variance_amount DECIMAL(10,3),
    variance_percentage DECIMAL(5,2),
    
    -- Complex data
    locations JSONB, -- Storage locations within venue
    recent_counts JSONB, -- Last 5 physical counts
    purchase_history JSONB, -- Recent purchases
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_wisk_snapshot (snapshot_timestamp DESC),
    INDEX idx_wisk_critical (is_critical, snapshot_timestamp DESC),
    INDEX idx_wisk_variance (variance_percentage, snapshot_timestamp DESC)
);

-- WISK recipes and theoretical usage
CREATE TABLE wisk_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    recipe_id TEXT NOT NULL,
    pos_item_id TEXT, -- Links to Square catalog
    
    name TEXT NOT NULL,
    category TEXT,
    selling_price DECIMAL(10,2),
    
    -- Costs
    total_cost DECIMAL(10,2),
    cost_percentage DECIMAL(5,2),
    profit_margin DECIMAL(5,2),
    
    -- Ingredients
    ingredients JSONB, -- Array of {item_id, quantity, unit, cost}
    
    -- Sales data
    quantity_sold_period INTEGER,
    revenue_period DECIMAL(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_recipe_snapshot (snapshot_timestamp DESC),
    INDEX idx_recipe_margin (profit_margin, snapshot_timestamp DESC)
);
```

### 5. Resy Reservation Data

```sql
-- Resy reservations (historical)
CREATE TABLE resy_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    reservation_id TEXT NOT NULL,
    
    -- Basic info
    date DATE NOT NULL,
    time TIME NOT NULL,
    party_size INTEGER NOT NULL,
    table_ids JSONB, -- Array of assigned tables
    
    -- Guest info
    guest_id TEXT,
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    is_vip BOOLEAN DEFAULT false,
    
    -- Status
    status TEXT, -- confirmed, seated, completed, cancelled, no_show
    source TEXT, -- resy, phone, walk_in
    
    -- Timing
    created_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    seated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Financial
    prepaid_amount DECIMAL(10,2),
    minimum_spend DECIMAL(10,2),
    actual_spend DECIMAL(10,2),
    
    -- Notes and preferences
    notes TEXT,
    dietary_restrictions JSONB,
    special_occasions JSONB,
    guest_preferences JSONB,
    
    -- Waitlist info
    waitlist_position INTEGER,
    quoted_wait_time INTEGER, -- minutes
    actual_wait_time INTEGER,
    
    created_at_db TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_resy_snapshot (snapshot_timestamp DESC),
    INDEX idx_resy_date (date, time),
    INDEX idx_resy_status (status, date)
);

-- Resy shifts and availability
CREATE TABLE resy_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    date DATE NOT NULL,
    shift TEXT, -- lunch, dinner
    
    -- Capacity
    total_seats INTEGER,
    reserved_seats INTEGER,
    available_seats INTEGER,
    
    -- Time slots
    time_slots JSONB, -- Array of {time, available, party_sizes}
    
    -- Pacing
    turn_time_average INTEGER, -- minutes
    covers_per_turn DECIMAL(5,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_resy_avail_date (date, snapshot_timestamp DESC)
);
```

### 6. Marketing Platform Data

```sql
-- Audience Republic campaigns
CREATE TABLE audience_republic_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    campaign_id TEXT NOT NULL,
    
    -- Basic info
    name TEXT NOT NULL,
    type TEXT, -- email, sms, social
    status TEXT, -- draft, active, completed
    
    -- Timing
    created_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Audience
    audience_size INTEGER,
    segment_criteria JSONB,
    
    -- Performance
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    converted_count INTEGER DEFAULT 0,
    
    -- Rates
    delivery_rate DECIMAL(5,2),
    open_rate DECIMAL(5,2),
    click_rate DECIMAL(5,2),
    conversion_rate DECIMAL(5,2),
    
    -- Revenue attribution
    attributed_revenue DECIMAL(10,2),
    attributed_tickets INTEGER,
    roi DECIMAL(10,2),
    
    -- Content
    subject_line TEXT,
    preview_text TEXT,
    content_snapshot JSONB,
    
    created_at_db TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_ar_snapshot (snapshot_timestamp DESC),
    INDEX idx_ar_performance (conversion_rate DESC, snapshot_timestamp DESC)
);

-- Audience Republic contacts
CREATE TABLE audience_republic_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    contact_id TEXT NOT NULL,
    
    -- Basic info
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    
    -- Engagement
    total_events_attended INTEGER DEFAULT 0,
    last_event_date DATE,
    lifetime_value DECIMAL(10,2),
    average_spend DECIMAL(10,2),
    
    -- Preferences
    genres JSONB,
    preferred_days JSONB,
    marketing_consent JSONB, -- {email: true, sms: false}
    
    -- Segmentation
    tags JSONB,
    segments JSONB,
    vip_status TEXT,
    
    -- Activity
    last_email_open TIMESTAMPTZ,
    last_click TIMESTAMPTZ,
    last_purchase TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_ar_contact_snapshot (snapshot_timestamp DESC),
    INDEX idx_ar_contact_value (lifetime_value DESC)
);
```

### 7. Meta Business Suite Data

```sql
-- Meta (Facebook/Instagram) insights
CREATE TABLE meta_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    platform TEXT NOT NULL, -- facebook, instagram
    
    -- Page/Account metrics
    page_id TEXT,
    followers_count INTEGER,
    followers_change INTEGER, -- since last snapshot
    
    -- Engagement (period metrics)
    impressions INTEGER,
    reach INTEGER,
    engagement_count INTEGER,
    engagement_rate DECIMAL(5,2),
    
    -- Post performance
    posts_published INTEGER,
    average_reach_per_post INTEGER,
    average_engagement_per_post INTEGER,
    
    -- Event specific
    event_responses JSONB, -- {interested, going, maybe}
    event_discussion_posts INTEGER,
    
    -- Demographics
    audience_demographics JSONB, -- age, gender, location breakdowns
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_meta_snapshot (snapshot_timestamp DESC),
    INDEX idx_meta_platform (platform, snapshot_timestamp DESC)
);

-- Meta ad campaigns
CREATE TABLE meta_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    campaign_id TEXT NOT NULL,
    
    -- Basic info
    name TEXT NOT NULL,
    objective TEXT, -- REACH, TRAFFIC, CONVERSIONS
    status TEXT, -- ACTIVE, PAUSED, COMPLETED
    
    -- Budget and spend
    daily_budget DECIMAL(10,2),
    lifetime_budget DECIMAL(10,2),
    spent_amount DECIMAL(10,2),
    
    -- Performance
    impressions INTEGER,
    reach INTEGER,
    clicks INTEGER,
    conversions INTEGER,
    
    -- Costs
    cpm DECIMAL(10,2), -- cost per mille
    cpc DECIMAL(10,2), -- cost per click
    cpa DECIMAL(10,2), -- cost per acquisition
    
    -- ROI
    revenue_attributed DECIMAL(10,2),
    roas DECIMAL(10,2), -- return on ad spend
    
    -- Targeting
    audience_size INTEGER,
    targeting_spec JSONB,
    
    -- Creative
    ad_creative_ids JSONB,
    top_performing_ad JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_meta_campaign_snapshot (snapshot_timestamp DESC),
    INDEX idx_meta_campaign_roas (roas DESC, snapshot_timestamp DESC)
);
```

### 8. OpenTable Data

```sql
-- OpenTable reservations
CREATE TABLE opentable_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    confirmation_number TEXT NOT NULL,
    
    -- Similar structure to Resy but with OpenTable specifics
    date_time TIMESTAMPTZ NOT NULL,
    party_size INTEGER NOT NULL,
    
    -- Guest info
    guest_id TEXT,
    guest_name TEXT,
    guest_phone TEXT,
    is_vip BOOLEAN DEFAULT false,
    
    -- OpenTable specific
    points_earned INTEGER,
    points_type TEXT, -- standard, bonus
    
    -- Status and source
    reservation_status TEXT,
    booking_source TEXT, -- opentable, restaurant
    
    -- Reviews
    dined BOOLEAN DEFAULT false,
    review_status TEXT, -- pending, submitted
    review_rating INTEGER,
    
    -- Financial
    estimated_total DECIMAL(10,2),
    actual_total DECIMAL(10,2),
    
    -- Notes
    special_requests TEXT,
    restaurant_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_ot_snapshot (snapshot_timestamp DESC),
    INDEX idx_ot_datetime (date_time)
);

-- OpenTable guest metrics
CREATE TABLE opentable_guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    guest_id TEXT NOT NULL,
    
    -- Metrics
    total_reservations INTEGER,
    no_show_count INTEGER,
    cancellation_count INTEGER,
    
    -- Dining history
    first_visit DATE,
    last_visit DATE,
    favorite_table TEXT,
    average_party_size DECIMAL(3,1),
    
    -- Spend patterns
    average_check DECIMAL(10,2),
    total_spent DECIMAL(10,2),
    
    -- Preferences
    dietary_preferences JSONB,
    wine_preferences JSONB,
    seating_preferences JSONB,
    
    -- Status
    vip_status TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_ot_guest_snapshot (snapshot_timestamp DESC),
    INDEX idx_ot_guest_value (total_spent DESC)
);
```

### 9. Aggregated Data & Analytics

```sql
-- Master snapshots table (ties everything together)
CREATE TABLE venue_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Quick reference to know which APIs were successfully fetched
    eventbrite_fetched BOOLEAN DEFAULT false,
    toast_fetched BOOLEAN DEFAULT false,
    wisk_fetched BOOLEAN DEFAULT false,
    resy_fetched BOOLEAN DEFAULT false,
    audience_republic_fetched BOOLEAN DEFAULT false,
    meta_fetched BOOLEAN DEFAULT false,
    opentable_fetched BOOLEAN DEFAULT false,
    
    -- Aggregated KPIs
    kpis JSONB, -- All calculated KPIs
    alerts JSONB, -- Generated alerts
    
    -- Fetch metadata
    fetch_duration_ms INTEGER,
    errors JSONB, -- Any API errors encountered
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_snapshot_timestamp (snapshot_timestamp DESC)
);

-- Calculated daily summaries (for faster historical queries)
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    
    -- Ticketing & Attendance
    total_events INTEGER,
    total_tickets_sold INTEGER,
    total_capacity INTEGER,
    average_sell_through DECIMAL(5,2),
    gross_ticket_revenue DECIMAL(10,2),
    
    -- Revenue
    total_bar_revenue DECIMAL(10,2),
    total_food_revenue DECIMAL(10,2),
    total_revenue DECIMAL(10,2),
    transaction_count INTEGER,
    average_transaction DECIMAL(10,2),
    
    -- Inventory
    low_stock_items INTEGER,
    critical_stock_items INTEGER,
    average_variance DECIMAL(5,2),
    inventory_value DECIMAL(10,2),
    
    -- Reservations
    total_reservations INTEGER,
    total_covers INTEGER,
    no_show_count INTEGER,
    average_party_size DECIMAL(3,1),
    
    -- Marketing
    emails_sent INTEGER,
    email_open_rate DECIMAL(5,2),
    email_click_rate DECIMAL(5,2),
    marketing_attributed_revenue DECIMAL(10,2),
    
    -- Meta
    social_reach INTEGER,
    social_engagement INTEGER,
    ad_spend DECIMAL(10,2),
    ad_revenue DECIMAL(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_daily_date (date DESC)
);
```

### 10. Chat and Action History

```sql
-- Claude chat history
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Message
    role TEXT NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    
    -- Context used (for assistant messages)
    snapshot_timestamp TIMESTAMPTZ,
    context_data JSONB, -- What data was provided to Claude
    
    -- Recommendations made
    recommendations JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_chat_session (session_id, timestamp DESC)
);

-- Action execution log
CREATE TABLE action_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Action details
    platform TEXT NOT NULL,
    action_type TEXT NOT NULL,
    parameters JSONB,
    
    -- Execution
    status TEXT, -- pending, confirmed, executed, failed, rolled_back
    executed_at TIMESTAMPTZ,
    executed_by TEXT, -- user id or system
    
    -- Results
    result JSONB,
    error_message TEXT,
    
    -- Audit trail
    confirmation_required BOOLEAN DEFAULT true,
    confirmed_at TIMESTAMPTZ,
    rollback_data JSONB, -- Info needed to undo
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_action_timestamp (timestamp DESC),
    INDEX idx_action_status (status, timestamp DESC)
);
```

### 11. Functions and Triggers

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_venue_config_updated_at BEFORE UPDATE ON venue_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_credentials_updated_at BEFORE UPDATE ON api_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check inventory alerts
CREATE OR REPLACE FUNCTION check_inventory_alerts()
RETURNS TABLE (
    item_name TEXT,
    current_stock DECIMAL,
    par_level DECIMAL,
    alert_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.name,
        w.current_stock,
        w.par_level,
        CASE 
            WHEN w.is_critical THEN 'critical'
            WHEN w.is_below_par THEN 'low'
            ELSE 'ok'
        END as alert_type
    FROM wisk_inventory w
    WHERE w.snapshot_timestamp = (
        SELECT MAX(snapshot_timestamp) FROM wisk_inventory
    )
    AND (w.is_critical OR w.is_below_par)
    ORDER BY w.is_critical DESC, w.current_stock ASC;
END;
$$ LANGUAGE 'plpgsql';

-- Function to calculate venue metrics for a date range
CREATE OR REPLACE FUNCTION calculate_venue_metrics(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'revenue', jsonb_build_object(
            'total', COALESCE(SUM(s.total_amount) / 100.0, 0),
            'transactions', COUNT(s.transaction_id),
            'average', COALESCE(AVG(s.total_amount) / 100.0, 0)
        ),
        'ticketing', jsonb_build_object(
            'events', COUNT(DISTINCT e.event_id),
            'tickets_sold', COALESCE(SUM(e.tickets_sold), 0),
            'capacity', COALESCE(SUM(e.capacity), 0),
            'revenue', COALESCE(SUM(e.total_revenue), 0)
        ),
        'inventory', jsonb_build_object(
            'low_stock_items', COUNT(*) FILTER (WHERE w.is_below_par),
            'critical_items', COUNT(*) FILTER (WHERE w.is_critical),
            'total_value', COALESCE(SUM(w.total_value), 0)
        ),
        'marketing', jsonb_build_object(
            'campaigns_sent', COUNT(DISTINCT ar.campaign_id),
            'avg_open_rate', COALESCE(AVG(ar.open_rate), 0),
            'total_attributed_revenue', COALESCE(SUM(ar.attributed_revenue), 0)
        )
    ) INTO metrics
    FROM venue_snapshots vs
    LEFT JOIN toast_transactions s ON s.snapshot_timestamp = vs.snapshot_timestamp
    LEFT JOIN eventbrite_events e ON e.snapshot_timestamp = vs.snapshot_timestamp
    LEFT JOIN wisk_inventory w ON w.snapshot_timestamp = vs.snapshot_timestamp
    LEFT JOIN audience_republic_campaigns ar ON ar.snapshot_timestamp = vs.snapshot_timestamp
    WHERE vs.snapshot_timestamp BETWEEN start_date AND end_date;
    
    RETURN metrics;
END;
$$ LANGUAGE 'plpgsql';
```

### 12. Indexes for Performance

```sql
-- Additional performance indexes
CREATE INDEX idx_square_daily ON toast_transactions(date_trunc('day', created_at), location_id);
CREATE INDEX idx_eventbrite_upcoming ON eventbrite_events(start_time) WHERE start_time > NOW();
CREATE INDEX idx_wisk_reorder ON wisk_inventory(is_critical, is_below_par) WHERE snapshot_timestamp = (SELECT MAX(snapshot_timestamp) FROM wisk_inventory);
CREATE INDEX idx_resy_today ON resy_reservations(date, status) WHERE date = CURRENT_DATE;
CREATE INDEX idx_meta_recent ON meta_insights(platform, snapshot_timestamp) WHERE snapshot_timestamp > NOW() - INTERVAL '7 days';

-- Composite indexes for common queries
CREATE INDEX idx_venue_snapshot_complete ON venue_snapshots(snapshot_timestamp DESC) 
    WHERE eventbrite_fetched AND toast_fetched AND wisk_fetched;

-- Full text search on guest names
CREATE INDEX idx_guest_search ON resy_reservations USING gin(to_tsvector('english', guest_name));
CREATE INDEX idx_opentable_guest_search ON opentable_guests USING gin(to_tsvector('english', notes));
```

### 13. Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE venue_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventbrite_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE toast_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wisk_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE resy_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_republic_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE opentable_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;

-- Create policies (example for authenticated users)
CREATE POLICY "Users can view all venue data" ON venue_config
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view all events" ON eventbrite_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view all transactions" ON toast_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add similar policies for all tables
```

## Usage Examples

### 1. Get Current Inventory Status
```sql
SELECT 
    name,
    current_stock,
    par_level,
    ROUND((current_stock / par_level * 100), 1) as stock_percentage,
    is_critical,
    unit_cost * current_stock as value
FROM wisk_inventory
WHERE snapshot_timestamp = (SELECT MAX(snapshot_timestamp) FROM wisk_inventory)
    AND is_below_par = true
ORDER BY is_critical DESC, stock_percentage ASC;
```

### 2. Revenue Trend Analysis
```sql
WITH daily_revenue AS (
    SELECT 
        date_trunc('day', created_at) as day,
        SUM(total_amount) / 100.0 as revenue,
        COUNT(*) as transactions,
        AVG(total_amount) / 100.0 as avg_transaction
    FROM toast_transactions
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
)
SELECT 
    day,
    revenue,
    transactions,
    avg_transaction,
    revenue - LAG(revenue) OVER (ORDER BY day) as revenue_change,
    ROUND(((revenue - LAG(revenue) OVER (ORDER BY day)) / LAG(revenue) OVER (ORDER BY day) * 100), 1) as percent_change
FROM daily_revenue
ORDER BY day DESC;
```

### 3. Event Performance Comparison
```sql
SELECT 
    e1.name,
    e1.start_time,
    e1.capacity,
    e1.tickets_sold,
    e1.sell_through_rate,
    e2.tickets_sold as same_time_yesterday,
    e1.tickets_sold - e2.tickets_sold as difference
FROM eventbrite_events e1
LEFT JOIN eventbrite_events e2 
    ON e1.event_id = e2.event_id 
    AND e2.snapshot_timestamp = e1.snapshot_timestamp - INTERVAL '24 hours'
WHERE e1.snapshot_timestamp = (SELECT MAX(snapshot_timestamp) FROM eventbrite_events)
    AND e1.start_time > NOW()
ORDER BY e1.start_time;
```

### 4. Marketing ROI Analysis
```sql
SELECT 
    ar.name as campaign_name,
    ar.type as campaign_type,
    ar.sent_count,
    ar.conversion_rate,
    ar.attributed_revenue,
    m.ad_spend,
    (ar.attributed_revenue - COALESCE(m.ad_spend, 0)) as profit,
    CASE 
        WHEN m.ad_spend > 0 THEN ROUND((ar.attributed_revenue / m.ad_spend), 2)
        ELSE NULL 
    END as roi
FROM audience_republic_campaigns ar
LEFT JOIN meta_campaigns m 
    ON ar.snapshot_timestamp = m.snapshot_timestamp
    AND ar.name ILIKE '%' || m.name || '%'
WHERE ar.snapshot_timestamp >= NOW() - INTERVAL '7 days'
    AND ar.status = 'completed'
ORDER BY roi DESC NULLS LAST;
```

## Notes

1. **JSONB Usage**: Complex nested data (like ticket classes, payment details, ingredients) is stored as JSONB for flexibility while maintaining queryability.

2. **Historical Tracking**: Every table includes snapshot_timestamp to maintain complete history for trend analysis.

3. **Calculated Fields**: Some fields (like sell_through_rate) are calculated and stored for query performance.

4. **Indexes**: Focused on common query patterns - time-based queries, status filters, and performance metrics.

5. **Data Retention**: No automatic deletion - implement a retention policy based on your needs (e.g., detailed data for 2 years, summaries forever).

This schema provides a complete historical record of all venue operations while maintaining query performance through strategic indexing and summary tables.

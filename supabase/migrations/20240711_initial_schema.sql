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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    
    created_at_db TIMESTAMPTZ DEFAULT NOW()
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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_snapshot_timestamp ON venue_snapshots(snapshot_timestamp DESC);
CREATE INDEX idx_eventbrite_snapshot ON eventbrite_events(snapshot_timestamp DESC);
CREATE INDEX idx_eventbrite_event ON eventbrite_events(event_id, snapshot_timestamp DESC);
CREATE INDEX idx_eventbrite_dates ON eventbrite_events(start_time, end_time);
CREATE INDEX idx_attendee_snapshot ON eventbrite_attendees(snapshot_timestamp DESC);
CREATE INDEX idx_attendee_event ON eventbrite_attendees(event_id, snapshot_timestamp DESC);
CREATE INDEX idx_attendee_checkin ON eventbrite_attendees(event_id, checked_in);
CREATE INDEX idx_square_snapshot ON toast_transactions(snapshot_timestamp DESC);
CREATE INDEX idx_square_created ON toast_transactions(created_at DESC);
CREATE INDEX idx_square_location ON toast_transactions(location_id, created_at DESC);
CREATE INDEX idx_catalog_snapshot ON square_catalog_items(snapshot_timestamp DESC);
CREATE INDEX idx_catalog_item ON square_catalog_items(item_id, snapshot_timestamp DESC);
CREATE INDEX idx_wisk_snapshot ON wisk_inventory(snapshot_timestamp DESC);
CREATE INDEX idx_wisk_critical ON wisk_inventory(is_critical, snapshot_timestamp DESC);
CREATE INDEX idx_wisk_variance ON wisk_inventory(variance_percentage, snapshot_timestamp DESC);
CREATE INDEX idx_recipe_snapshot ON wisk_recipes(snapshot_timestamp DESC);
CREATE INDEX idx_recipe_margin ON wisk_recipes(profit_margin, snapshot_timestamp DESC);
CREATE INDEX idx_daily_date ON daily_summaries(date DESC);
CREATE INDEX idx_chat_session ON chat_history(session_id, timestamp DESC);
CREATE INDEX idx_action_timestamp ON action_log(timestamp DESC);
CREATE INDEX idx_action_status ON action_log(status, timestamp DESC);

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

CREATE TRIGGER update_daily_summaries_updated_at BEFORE UPDATE ON daily_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE venue_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventbrite_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventbrite_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE toast_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wisk_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wisk_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for authenticated users
CREATE POLICY "Authenticated users can view venue_config" ON venue_config
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view api_credentials" ON api_credentials
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all data" ON venue_snapshots
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view eventbrite data" ON eventbrite_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view eventbrite attendees" ON eventbrite_attendees
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view square data" ON toast_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view catalog" ON square_catalog_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view inventory" ON wisk_inventory
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view recipes" ON wisk_recipes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view summaries" ON daily_summaries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage chat" ON chat_history
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage actions" ON action_log
    FOR ALL USING (auth.role() = 'authenticated');

-- Service role policies for backend operations
CREATE POLICY "Service role full access" ON venue_config
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access api_credentials" ON api_credentials
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access snapshots" ON venue_snapshots
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access eventbrite" ON eventbrite_events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access attendees" ON eventbrite_attendees
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access square" ON toast_transactions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access catalog" ON square_catalog_items
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access wisk" ON wisk_inventory
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access recipes" ON wisk_recipes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access summaries" ON daily_summaries
    FOR ALL USING (auth.role() = 'service_role');

-- Insert initial venue configuration
INSERT INTO venue_config (name, timezone) VALUES ('VenueSync Demo', 'America/Los_Angeles');
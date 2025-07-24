-- Fix missing tables for Toast integration and data orchestrator

-- Create venues table (replacing venue_config for consistency with code)
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate data from venue_config if it exists
INSERT INTO venues (id, name, timezone, settings, created_at, updated_at)
SELECT id, name, timezone, settings, created_at, updated_at
FROM venue_config
WHERE NOT EXISTS (SELECT 1 FROM venues);

-- Update api_credentials to use venue_id foreign key
ALTER TABLE api_credentials 
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;

-- Create api_sync_status table for tracking sync states
CREATE TABLE IF NOT EXISTS api_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    service TEXT NOT NULL CHECK (service IN (
        'eventbrite', 'toast', 'wisk', 'resy', 
        'audience_republic', 'meta', 'opentable', 'opendate'
    )),
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    last_error TEXT,
    is_syncing BOOLEAN DEFAULT false,
    sync_frequency_minutes INTEGER DEFAULT 180, -- 3 hours default
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(venue_id, service)
);

-- Create cron_logs table for cron job logging
CREATE TABLE IF NOT EXISTS cron_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial_success')),
    duration_ms INTEGER,
    metadata JSONB,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix venue_snapshots table to match code expectations
ALTER TABLE venue_snapshots 
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'scheduled', 'webhook')),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS transaction_count INTEGER,
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS unique_customers INTEGER,
ADD COLUMN IF NOT EXISTS opendate_fetched BOOLEAN DEFAULT false;

-- Create daily_summaries table if not exists
CREATE TABLE IF NOT EXISTS daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    total_revenue DECIMAL(10,2),
    transaction_count INTEGER,
    average_transaction DECIMAL(10,2),
    unique_customers INTEGER,
    snapshot_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(venue_id, summary_date)
);

-- Create transaction tables for each service if they don't exist
CREATE TABLE IF NOT EXISTS eventbrite_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    transaction_id TEXT NOT NULL,
    amount DECIMAL(10,2),
    customer_id TEXT,
    customer_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opendate_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    transaction_id TEXT NOT NULL,
    amount DECIMAL(10,2),
    customer_id TEXT,
    customer_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_venues_active ON venues(is_active);
CREATE INDEX IF NOT EXISTS idx_api_sync_venue ON api_sync_status(venue_id);
CREATE INDEX IF NOT EXISTS idx_api_sync_service ON api_sync_status(service);
CREATE INDEX IF NOT EXISTS idx_cron_logs_job ON cron_logs(job_name, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_venue ON venue_snapshots(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_venue_date ON daily_summaries(venue_id, summary_date DESC);

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventbrite_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opendate_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can view venues" ON venues
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view sync status" ON api_sync_status
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view cron logs" ON cron_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view daily summaries" ON daily_summaries
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role policies
CREATE POLICY "Service role full access venues" ON venues
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sync_status" ON api_sync_status
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access cron_logs" ON cron_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access daily_summaries" ON daily_summaries
    FOR ALL USING (auth.role() = 'service_role');

-- Insert default venue if venues is empty
INSERT INTO venues (name, timezone, is_active)
SELECT 'VenueSync Demo', 'America/Los_Angeles', true
WHERE NOT EXISTS (SELECT 1 FROM venues);

-- Update triggers
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_sync_status_updated_at BEFORE UPDATE ON api_sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Missing tables created successfully!';
END $$;
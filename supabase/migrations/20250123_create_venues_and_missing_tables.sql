-- Simple migration to create venues table and other missing tables

-- 1. Create venues table first
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert a default venue
INSERT INTO venues (name, timezone, is_active)
SELECT 'VenueSync Demo', 'America/Los_Angeles', true
WHERE NOT EXISTS (SELECT 1 FROM venues);

-- 3. Create api_sync_status table
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
    sync_frequency_minutes INTEGER DEFAULT 180,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(venue_id, service)
);

-- 4. Create cron_logs table
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

-- 5. Create daily_summaries table
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

-- 6. Add venue_id to api_credentials table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'api_credentials') 
       AND NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_name = 'api_credentials' AND column_name = 'venue_id') THEN
        ALTER TABLE api_credentials ADD COLUMN venue_id UUID;
        
        -- Link existing credentials to the default venue
        UPDATE api_credentials 
        SET venue_id = (SELECT id FROM venues LIMIT 1)
        WHERE venue_id IS NULL;
        
        -- Add foreign key constraint
        ALTER TABLE api_credentials 
        ADD CONSTRAINT fk_api_credentials_venue 
        FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Enable RLS on new tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for authenticated users
CREATE POLICY "venues_select" ON venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "api_sync_status_select" ON api_sync_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "cron_logs_select" ON cron_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_summaries_select" ON daily_summaries FOR SELECT TO authenticated USING (true);

-- 9. Create RLS policies for service role
CREATE POLICY "venues_all" ON venues FOR ALL TO service_role USING (true);
CREATE POLICY "api_sync_status_all" ON api_sync_status FOR ALL TO service_role USING (true);
CREATE POLICY "cron_logs_all" ON cron_logs FOR ALL TO service_role USING (true);
CREATE POLICY "daily_summaries_all" ON daily_summaries FOR ALL TO service_role USING (true);

-- 10. Create indexes
CREATE INDEX IF NOT EXISTS idx_venues_active ON venues(is_active);
CREATE INDEX IF NOT EXISTS idx_api_sync_venue ON api_sync_status(venue_id);
CREATE INDEX IF NOT EXISTS idx_api_sync_service ON api_sync_status(service);
CREATE INDEX IF NOT EXISTS idx_cron_logs_job ON cron_logs(job_name, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_venue_date ON daily_summaries(venue_id, summary_date DESC);

-- Success!
SELECT 'Migration completed successfully!' as message;
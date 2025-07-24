-- Safe migration that only creates what's missing without modifying existing tables

-- Step 1: Create venues table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Insert default venue (only if table is empty)
INSERT INTO venues (name, timezone, is_active)
SELECT 'VenueSync Demo', 'America/Los_Angeles', true
WHERE NOT EXISTS (SELECT 1 FROM venues);

-- Step 3: Create other missing tables (these reference venues.id)
CREATE TABLE IF NOT EXISTS api_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    last_error TEXT,
    is_syncing BOOLEAN DEFAULT false,
    sync_frequency_minutes INTEGER DEFAULT 180,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(venue_id, service)
);

CREATE TABLE IF NOT EXISTS cron_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER,
    metadata JSONB,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Step 4: Create simple eventbrite and opendate transaction tables
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

-- Step 5: Enable RLS (safe - won't error if already enabled)
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Step 6: Create basic policies (using IF NOT EXISTS pattern)
DO $$
BEGIN
    -- For venues
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venues' AND policyname = 'venues_select') THEN
        CREATE POLICY "venues_select" ON venues FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venues' AND policyname = 'venues_all') THEN
        CREATE POLICY "venues_all" ON venues FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    -- For api_sync_status
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_sync_status' AND policyname = 'api_sync_status_select') THEN
        CREATE POLICY "api_sync_status_select" ON api_sync_status FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_sync_status' AND policyname = 'api_sync_status_all') THEN
        CREATE POLICY "api_sync_status_all" ON api_sync_status FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    -- For cron_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cron_logs' AND policyname = 'cron_logs_select') THEN
        CREATE POLICY "cron_logs_select" ON cron_logs FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cron_logs' AND policyname = 'cron_logs_all') THEN
        CREATE POLICY "cron_logs_all" ON cron_logs FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    -- For daily_summaries
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_summaries' AND policyname = 'daily_summaries_select') THEN
        CREATE POLICY "daily_summaries_select" ON daily_summaries FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_summaries' AND policyname = 'daily_summaries_all') THEN
        CREATE POLICY "daily_summaries_all" ON daily_summaries FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Done! Let's check what we created
SELECT 'Tables created successfully!' as status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'venues') as venues_exists,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'api_sync_status') as api_sync_status_exists,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'cron_logs') as cron_logs_exists,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'daily_summaries') as daily_summaries_exists;
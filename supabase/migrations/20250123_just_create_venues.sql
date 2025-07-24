-- Ultra simple migration - just create the essential tables

-- 1. Create venues table
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create api_sync_status table  
CREATE TABLE IF NOT EXISTS api_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID,
    service TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    last_error TEXT,
    is_syncing BOOLEAN DEFAULT false,
    sync_frequency_minutes INTEGER DEFAULT 180,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create cron_logs table
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

-- 4. Insert a venue
INSERT INTO venues (name) 
SELECT 'VenueSync Demo' 
WHERE NOT EXISTS (SELECT 1 FROM venues);

-- That's it! No foreign keys, no constraints, just tables.
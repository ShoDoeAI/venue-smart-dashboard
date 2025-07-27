-- Insert Jack's on Water Street venue with the specific ID used throughout the codebase
INSERT INTO venues (id, name, timezone, settings, is_active)
VALUES (
    'bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid,
    'Jack''s on Water Street',
    'America/Los_Angeles',
    '{
        "toast_location_id": "bfb355cb-55e4-4f57-af16-d0d18c11ad3c",
        "capacity": 500
    }'::jsonb,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    settings = EXCLUDED.settings,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Initialize API sync status for this venue
INSERT INTO api_sync_status (venue_id, service, sync_frequency_minutes)
VALUES 
    ('bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid, 'toast', 3),
    ('bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid, 'eventbrite', 180),
    ('bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid, 'opendate', 180),
    ('bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid, 'wisk', 180),
    ('bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid, 'resy', 180),
    ('bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid, 'audiencerepublic', 180),
    ('bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid, 'meta', 180),
    ('bfb355cb-55e4-4f57-af16-d0d18c11ad3c'::uuid, 'opentable', 180)
ON CONFLICT DO NOTHING;
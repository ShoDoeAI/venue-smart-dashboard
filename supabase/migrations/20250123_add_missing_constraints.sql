-- Add missing unique constraint for api_sync_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'api_sync_status_venue_id_service_key'
    ) THEN
        ALTER TABLE api_sync_status 
        ADD CONSTRAINT api_sync_status_venue_id_service_key 
        UNIQUE (venue_id, service);
    END IF;
END $$;

-- Ensure Toast environment variable is used
UPDATE api_credentials 
SET credentials = jsonb_set(
    credentials, 
    '{environment}', 
    '"sandbox"'::jsonb
)
WHERE api_name = 'toast' 
AND credentials->>'environment' IS NULL;
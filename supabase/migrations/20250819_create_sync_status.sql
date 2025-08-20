-- Create sync_status table to track long-running sync operations
CREATE TABLE IF NOT EXISTS sync_status (
  id TEXT PRIMARY KEY,
  status JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sync_status_created_at ON sync_status(created_at DESC);

-- Add RLS policies
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage sync status
CREATE POLICY "Service role can manage sync status" ON sync_status
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
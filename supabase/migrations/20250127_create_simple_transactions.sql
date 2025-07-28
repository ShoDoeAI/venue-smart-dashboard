-- Create a simple transactions table for single-venue use
CREATE TABLE IF NOT EXISTS simple_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL, -- 'toast', 'eventbrite', 'opendate'
  transaction_id TEXT NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(10,2) NOT NULL, -- In dollars, not cents
  customer_name TEXT,
  customer_email TEXT,
  items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  raw_data JSONB, -- Store the full transaction for reference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, transaction_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simple_transactions_date 
ON simple_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_simple_transactions_source 
ON simple_transactions(source);

-- Disable Row Level Security (this is a single-venue app)
ALTER TABLE simple_transactions DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON simple_transactions TO authenticated;
GRANT ALL ON simple_transactions TO service_role;
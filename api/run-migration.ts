import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use Supabase Management API to run migrations
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`
        },
        body: JSON.stringify({
          sql: `
            -- Create simple transactions table if it doesn't exist
            CREATE TABLE IF NOT EXISTS simple_transactions (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              source TEXT NOT NULL,
              transaction_id TEXT NOT NULL,
              transaction_date TIMESTAMPTZ NOT NULL,
              amount DECIMAL(10,2) NOT NULL,
              customer_name TEXT,
              customer_email TEXT,
              items INTEGER DEFAULT 0,
              status TEXT DEFAULT 'completed',
              raw_data JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              UNIQUE(source, transaction_id)
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_simple_transactions_date 
            ON simple_transactions(transaction_date);

            CREATE INDEX IF NOT EXISTS idx_simple_transactions_source 
            ON simple_transactions(source);
          `
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      // Table might already exist, which is fine
      console.log('Migration note:', result);
    }

    return res.status(200).json({
      success: true,
      message: 'Migration attempted',
      details: result
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}
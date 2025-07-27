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
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Create a simple transactions table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
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

        -- Create index for date queries
        CREATE INDEX IF NOT EXISTS idx_simple_transactions_date 
        ON simple_transactions(transaction_date);

        -- Create index for source
        CREATE INDEX IF NOT EXISTS idx_simple_transactions_source 
        ON simple_transactions(source);
      `
    });

    if (createError) {
      // If RPC doesn't work, table might already exist
      console.log('Note: Could not create table via RPC:', createError.message);
    }

    // Test the table by inserting a dummy record
    const { error: insertError } = await supabase
      .from('simple_transactions')
      .upsert({
        source: 'test',
        transaction_id: 'test-' + Date.now(),
        transaction_date: new Date().toISOString(),
        amount: 0,
        status: 'test'
      });

    if (insertError) {
      return res.status(500).json({
        success: false,
        error: 'Table might not exist or have different schema',
        details: insertError.message
      });
    }

    // Delete the test record
    await supabase
      .from('simple_transactions')
      .delete()
      .eq('source', 'test');

    return res.status(200).json({
      success: true,
      message: 'Simple transactions table ready'
    });

  } catch (error: any) {
    console.error('Create tables error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}
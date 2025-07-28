const { Pool } = require('pg');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Create the simple_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.simple_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_simple_transactions_date 
      ON public.simple_transactions(transaction_date)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_simple_transactions_source 
      ON public.simple_transactions(source)
    `);

    // Check if table was created
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'simple_transactions'
      )
    `);

    await pool.end();

    return res.status(200).json({
      success: true,
      message: 'Table created successfully',
      tableExists: result.rows[0].exists,
    });
  } catch (error) {
    await pool.end();
    console.error('Create table error:', error);
    return res.status(500).json({
      error: 'Failed to create table',
      details: error.message,
    });
  }
};

import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_type, table_name
    `);

    // Get view definition for toast_transactions
    const viewDefResult = await pool.query(`
      SELECT definition 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname = 'toast_transactions'
    `);

    await pool.end();

    return res.status(200).json({
      tables: tablesResult.rows,
      toastTransactionsViewDef: viewDefResult.rows[0]?.definition || 'View not found'
    });
  } catch (error) {
    await pool.end();
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Database query failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
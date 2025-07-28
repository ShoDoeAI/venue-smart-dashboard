import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Try all possible database URL environment variables
    const dbUrls = [
      process.env.DATABASE_URL,
      process.env.POSTGRES_URL,
      process.env.POSTGRES_URL_NON_POOLING,
      process.env.POSTGRES_PRISMA_URL
    ].filter(Boolean);

    if (dbUrls.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No database URL found in environment variables',
        availableEnvVars: Object.keys(process.env).filter(key => 
          key.includes('POSTGRES') || key.includes('DATABASE') || key.includes('SUPABASE')
        )
      });
    }

    // Try each URL until one works
    let successfulUrl = '';
    let lastError = null;

    for (const url of dbUrls) {
      try {
        const pool = new Pool({
          connectionString: url,
          ssl: {
            rejectUnauthorized: false
          }
        });

        // Test the connection
        const result = await pool.query('SELECT NOW() as time, current_database() as db');
        
        // Check if simple_transactions table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'simple_transactions'
          ) as table_exists
        `);

        await pool.end();
        
        successfulUrl = url?.substring(0, 20) + '...'; // Partial URL for security
        
        return res.status(200).json({
          success: true,
          message: 'Database connection successful',
          dbInfo: {
            time: result.rows[0].time,
            database: result.rows[0].db,
            tableExists: tableCheck.rows[0].table_exists
          }
        });
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    // If we get here, all URLs failed
    return res.status(500).json({
      success: false,
      error: 'All database URLs failed',
      lastError: lastError instanceof Error ? lastError.message : 'Unknown error',
      triedUrls: dbUrls.length
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Add revenue_total column if it doesn't exist
    const { error } = await supabase.rpc('query', {
      query: `
        ALTER TABLE revenue_overrides 
        ADD COLUMN IF NOT EXISTS revenue_total numeric(10,2);
        
        -- Copy actual_revenue to revenue_total for existing records
        UPDATE revenue_overrides 
        SET revenue_total = actual_revenue 
        WHERE revenue_total IS NULL;
      `
    });

    if (error) {
      // Try a different approach using direct SQL
      const { data, error: sqlError } = await supabase
        .from('revenue_overrides')
        .select('*')
        .limit(1);
        
      return res.status(200).json({
        success: false,
        message: 'Column might already exist or needs manual migration',
        error: error.message,
        currentColumns: data ? Object.keys(data[0] || {}) : []
      });
    }

    res.status(200).json({
      success: true,
      message: 'revenue_total column added successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add column',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
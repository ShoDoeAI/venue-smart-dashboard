import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Try to query simple_transactions
    const { data, error, count } = await supabase
      .from('simple_transactions')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return res.status(200).json({
        tableExists: false,
        error: error.message,
        suggestion: 'Table does not exist. Run migrations in Supabase dashboard.'
      });
    }

    return res.status(200).json({
      tableExists: true,
      rowCount: count || 0,
      message: 'Table exists and is ready to use'
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}
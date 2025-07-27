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

    // First, add the missing 'type' column to venues table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE venues ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'restaurant';`
    });

    if (alterError) {
      console.log('Note: Could not alter table via RPC, updating via data API instead');
    }

    // Update the venue to ensure it has a type
    const { data: venue, error: updateError } = await supabase
      .from('venues')
      .update({ 
        type: 'restaurant' 
      } as any)
      .eq('id', 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c')
      .select()
      .single();

    if (updateError) {
      console.error('Error updating venue:', updateError);
      // If update fails, the column might not exist. Let's try a different approach.
      // We'll modify the AI context aggregator instead
    }

    return res.status(200).json({
      success: true,
      message: "Venue schema fix attempted",
      venue
    });
  } catch (error) {
    console.error('Fix venue schema error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
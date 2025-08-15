import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Updating Toast to use PRODUCTION credentials from environment variables...');

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // Get venue
    const { data: venues, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .limit(1);

    if (venueError) throw venueError;
    const venue = venues?.[0];
    if (!venue) throw new Error('No venue found');

    // Check current credentials
    const { data: currentCreds } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venue.id)
      .eq('api_name', 'toast')
      .single();

    console.log('Current environment:', currentCreds?.credentials?.environment);
    console.log('Updating to:', process.env.TOAST_ENVIRONMENT || 'production');

    // Delete old credentials
    await supabase
      .from('api_credentials')
      .delete()
      .eq('venue_id', venue.id)
      .eq('api_name', 'toast');

    // Insert production credentials from environment variables
    const { error: credError } = await supabase
      .from('api_credentials')
      .insert({
        venue_id: venue.id,
        api_name: 'toast',
        credentials: {
          clientId: process.env.TOAST_CLIENT_ID!,
          clientSecret: process.env.TOAST_CLIENT_SECRET!,
          locationGuid: process.env.TOAST_LOCATION_ID!,
          environment: process.env.TOAST_ENVIRONMENT || 'production'
        },
        is_active: true
      });

    if (credError) throw credError;

    // Clear any existing data since we're switching environments
    console.log('Clearing old sandbox data...');
    
    // We'll keep the data for now - just mark that we've updated
    await supabase
      .from('api_sync_status')
      .update({
        last_sync_at: null,
        last_successful_sync_at: null,
        last_error: 'Switched to production - ready for new sync'
      })
      .eq('venue_id', venue.id)
      .eq('service', 'toast');

    return res.status(200).json({
      success: true,
      message: 'Successfully updated to production credentials',
      configuration: {
        environment: process.env.TOAST_ENVIRONMENT || 'production',
        location_id: process.env.TOAST_LOCATION_ID,
        venue_id: venue.id,
        venue_name: venue.name
      },
      next_steps: [
        '1. Run /api/cron/fetch-data to fetch real production data',
        '2. Verify with /api/verify-toast-data to confirm real data'
      ]
    });

  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Setting up Toast credentials...');

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. Get or create venue
    const { data: venues, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .limit(1);

    if (venueError) throw venueError;
    
    let venue = venues?.[0];
    if (!venue) {
      const { data: newVenue, error: createError } = await supabase
        .from('venues')
        .insert({ name: 'VenueSync Demo', is_active: true })
        .select()
        .single();
      
      if (createError) throw createError;
      venue = newVenue;
    }

    // 2. Delete existing Toast credentials
    await supabase
      .from('api_credentials')
      .delete()
      .eq('venue_id', venue.id)
      .eq('api_name', 'toast');

    // 3. Insert new Toast credentials
    const { error: credError } = await supabase
      .from('api_credentials')
      .insert({
        venue_id: venue.id,
        api_name: 'toast',
        credentials: {
          clientId: process.env.TOAST_CLIENT_ID!,
          clientSecret: process.env.TOAST_CLIENT_SECRET!,
          locationGuid: process.env.TOAST_LOCATION_ID!,
          environment: process.env.TOAST_ENVIRONMENT || 'sandbox'
        },
        is_active: true
      });

    if (credError) throw credError;

    // 4. Set up sync status
    const { error: syncError } = await supabase
      .from('api_sync_status')
      .upsert({
        venue_id: venue.id,
        service: 'toast',
        sync_frequency_minutes: 3,
        is_syncing: false
      }, {
        onConflict: 'venue_id,service',
        ignoreDuplicates: false
      });

    if (syncError) {
      console.log('Sync status warning:', syncError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Toast credentials configured successfully',
      venue_id: venue.id,
      venue_name: venue.name
    });

  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
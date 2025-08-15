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

  // Get credentials from request body
  const { clientId, clientSecret, locationId, environment } = req.body;

  if (!clientId || !clientSecret || !locationId) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['clientId', 'clientSecret', 'locationId'],
      optional: ['environment (defaults to production)']
    });
  }

  console.log('Setting Toast credentials explicitly...');
  console.log('Environment:', environment || 'production');
  console.log('Location ID:', locationId);

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

    // Delete existing Toast credentials
    await supabase
      .from('api_credentials')
      .delete()
      .eq('venue_id', venue.id)
      .eq('api_name', 'toast');

    // Insert new credentials
    const { error: credError } = await supabase
      .from('api_credentials')
      .insert({
        venue_id: venue.id,
        api_name: 'toast',
        credentials: {
          clientId,
          clientSecret,
          locationGuid: locationId,
          environment: environment || 'production'
        },
        is_active: true
      });

    if (credError) throw credError;

    // Reset sync status
    await supabase
      .from('api_sync_status')
      .upsert({
        venue_id: venue.id,
        service: 'toast',
        last_sync_at: null,
        last_successful_sync_at: null,
        last_error: null,
        sync_frequency_minutes: 3,
        is_syncing: false
      }, {
        onConflict: 'venue_id,service',
        ignoreDuplicates: false
      });

    // Clear old data to avoid mixing sandbox and production data
    console.log('Clearing old data...');
    const tables = ['toast_orders', 'toast_payments', 'toast_checks', 'toast_selections'];
    
    for (const table of tables) {
      await supabase.from(table).delete().gte('created_at', '2000-01-01');
    }

    return res.status(200).json({
      success: true,
      message: 'Toast credentials updated successfully',
      configuration: {
        environment: environment || 'production',
        location_id: locationId,
        venue_id: venue.id,
        venue_name: venue.name
      },
      next_steps: [
        '1. Run: curl -X POST https://venue-smart-dashboard.vercel.app/api/cron/fetch-data -H "Authorization: Bearer dev-cron-secret-2025"',
        '2. Then verify: curl -X GET https://venue-smart-dashboard.vercel.app/api/verify-toast-data -H "Authorization: Bearer dev-cron-secret-2025"'
      ]
    });

  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
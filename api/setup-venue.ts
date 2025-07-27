import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Insert Jack's on Water Street venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .upsert({
        id: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
        name: "Jack's on Water Street",
        timezone: 'America/Los_Angeles',
        settings: {
          toast_location_id: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
          capacity: 500
        } as any,
        is_active: true
      })
      .select()
      .single();

    if (venueError) {
      console.error('Error creating venue:', venueError);
      return res.status(500).json({ error: venueError.message });
    }

    // Initialize API sync status
    const services = ['toast', 'eventbrite', 'opendate', 'wisk', 'resy', 'audiencerepublic', 'meta', 'opentable'];
    const syncStatuses = services.map(service => ({
      venue_id: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
      service,
      sync_frequency_minutes: service === 'toast' ? 3 : 180
    }));

    const { error: syncError } = await supabase
      .from('api_sync_status')
      .upsert(syncStatuses);

    if (syncError) {
      console.error('Error creating sync status:', syncError);
    }

    return res.status(200).json({
      success: true,
      venue,
      message: "Venue created successfully"
    });
  } catch (error) {
    console.error('Setup venue error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
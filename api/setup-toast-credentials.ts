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

    // Insert Toast API credentials
    const { data: credentials, error } = await supabase
      .from('api_credentials')
      .upsert({
        service: 'toast',
        credentials: {
          client_id: process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7',
          client_secret: process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4',
          location_id: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
          venue_id: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c'
        },
        is_active: true
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error setting up Toast credentials:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: "Toast credentials configured successfully",
      credentials: {
        ...credentials,
        client_secret: '***' // Don't expose secret
      }
    });
  } catch (error) {
    console.error('Setup Toast credentials error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
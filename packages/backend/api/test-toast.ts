import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ToastConnector } from '@venuesync/shared';
import type { Database } from '@venuesync/shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Testing Toast connection...');

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. Get venue
    const { data: venues, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (venueError) throw venueError;
    if (!venues || venues.length === 0) {
      throw new Error('No active venue found');
    }

    const venue = venues[0];

    // 2. Check Toast credentials
    const { data: creds, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venue.id)
      .eq('api_name', 'toast')
      .eq('is_active', true)
      .single();

    if (credError || !creds) {
      throw new Error('Toast credentials not found. Run /api/setup-toast first.');
    }

    // 3. Test Toast API connection
    const connectorConfig = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000
    };
    
    const connector = new ToastConnector(creds, connectorConfig, supabase);
    
    // Fetch last 24 hours of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 24);

    console.log(`Fetching Toast data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Fetch orders
    const ordersResult = await connector.fetchOrders(
      creds.credentials.locationGuid,
      startDate,
      endDate
    );
    
    const orders = Array.isArray(ordersResult.data) 
      ? ordersResult.data 
      : (ordersResult.data && 'data' in ordersResult.data ? ordersResult.data.data : []);
    
    const data = {
      orders: orders || [],
      payments: [],
      lineItems: [],
      customers: []
    };

    // 4. Check what data we got
    const summary = {
      venue: venue.name,
      venue_id: venue.id,
      credentials_found: true,
      toast_location_id: creds.credentials.locationGuid,
      environment: creds.credentials.environment || 'production',
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      data_fetched: {
        orders: data.orders?.length || 0,
        payments: data.payments?.length || 0,
        line_items: data.lineItems?.length || 0,
        customers: data.customers?.length || 0
      },
      sample_order: data.orders?.[0] ? {
        guid: data.orders[0].guid,
        created_date: data.orders[0].createdDate,
        total: data.orders[0].totalAmount
      } : null
    };

    return res.status(200).json({
      success: true,
      message: 'Toast connection test successful',
      summary
    });

  } catch (error: any) {
    console.error('Test error:', error);
    
    // Provide detailed error info
    const errorDetails: any = {
      success: false,
      error: error.message
    };

    if (error.response) {
      errorDetails.toast_response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    }

    return res.status(500).json(errorDetails);
  }
}
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Create Supabase client with service role key - this SHOULD bypass RLS
    // Using service_role explicitly
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    
    console.log('Using Supabase URL:', supabaseUrl);
    console.log('Service key exists:', !!supabaseServiceKey);
    
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Toast credentials
    const clientId = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
    const clientSecret = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
    const locationId = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

    // Authenticate with Toast
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      { clientId, clientSecret, userAccessType: 'TOAST_MACHINE_CLIENT' }
    );
    const token = authResponse.data.token.accessToken;

    // Fetch just ONE order for testing
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ordersResponse = await axios.get(
      'https://ws-api.toasttab.com/orders/v2/ordersBulk',
      {
        params: {
          startDate: today.toISOString(),
          endDate: new Date().toISOString(),
          pageSize: 1, // Just 1 for testing
          page: 1
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': locationId
        }
      }
    );

    const orders = ordersResponse.data || [];
    
    if (orders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No orders found',
        orderCount: 0
      });
    }

    // Process just the first order
    const order = orders[0];
    const check = order.checks?.[0];
    
    if (!check) {
      return res.status(200).json({
        success: true,
        message: 'Order has no checks',
        order
      });
    }

    const amount = (check.totalAmount || 0) / 100;
    
    const testTransaction = {
      source: 'toast',
      transaction_id: `${check.guid}-bypass-test`,
      transaction_date: new Date().toISOString(),
      amount: amount,
      customer_name: 'Bypass RLS Test',
      status: 'completed'
    };

    console.log('Attempting to insert:', testTransaction);

    // Try direct SQL insert as a last resort
    const { data, error } = await supabase
      .from('simple_transactions')
      .insert([testTransaction])
      .select();

    if (error) {
      console.error('Insert failed:', error);
      
      // Try raw SQL query
      const { data: sqlData, error: sqlError } = await supabase.rpc('query', {
        query_text: `
          INSERT INTO simple_transactions (source, transaction_id, transaction_date, amount, customer_name, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        query_params: [
          testTransaction.source,
          testTransaction.transaction_id,
          testTransaction.transaction_date,
          testTransaction.amount,
          testTransaction.customer_name,
          testTransaction.status
        ]
      });

      if (sqlError) {
        return res.status(200).json({
          success: false,
          message: 'Both insert methods failed',
          directError: error,
          sqlError: sqlError,
          suggestion: 'RLS is definitely blocking inserts. Please disable RLS in Supabase dashboard.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'SQL insert worked!',
        data: sqlData
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Insert successful!',
      data,
      testTransaction
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack
    });
  }
}
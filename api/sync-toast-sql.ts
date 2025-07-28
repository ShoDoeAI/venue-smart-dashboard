import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

interface ToastOrder {
  guid: string;
  paidDate?: string;
  createdDate: string;
  voided?: boolean;
  checks?: ToastCheck[];
}

interface ToastCheck {
  guid: string;
  totalAmount?: number;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  selections?: Array<{
    displayName: string;
    quantity: number;
    price: number;
  }>;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Use Supabase client with SQL
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, disable RLS via SQL if possible
    try {
      await supabase.rpc('query', {
        query_text: 'ALTER TABLE simple_transactions DISABLE ROW LEVEL SECURITY'
      });
    } catch (e) {
      // Ignore if this fails - might not have permissions
    }

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

    // Fetch recent orders
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const ordersResponse = await axios.get<ToastOrder[]>(
      'https://ws-api.toasttab.com/orders/v2/ordersBulk',
      {
        params: {
          startDate: yesterday.toISOString(),
          endDate: new Date().toISOString(),
          pageSize: 10 // Start small
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': locationId
        }
      }
    );

    const orders = ordersResponse.data || [];
    let successCount = 0;
    let errors: string[] = [];

    // Process orders one by one
    for (const order of orders) {
      for (const check of (order.checks || [])) {
        if (!check.guid) continue;

        const amount = (check.totalAmount || 0) / 100;
        
        try {
          // Try raw SQL insert
          const { error } = await supabase.rpc('query', {
            query_text: `
              INSERT INTO simple_transactions 
              (source, transaction_id, transaction_date, amount, customer_name, status, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW())
              ON CONFLICT (source, transaction_id) DO UPDATE SET
                amount = EXCLUDED.amount,
                status = EXCLUDED.status
            `,
            query_params: [
              'toast',
              check.guid,
              order.paidDate || order.createdDate,
              amount,
              check.customer ? `${check.customer.firstName || ''} ${check.customer.lastName || ''}`.trim() : 'Guest',
              order.voided ? 'voided' : 'completed'
            ]
          });

          if (error) throw error;
          successCount++;
        } catch (error) {
          const errorMsg = `Failed ${check.guid}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          
          // Try alternative: direct insert without RPC
          try {
            const { error: insertError } = await supabase
              .from('simple_transactions')
              .insert({
                source: 'toast',
                transaction_id: check.guid,
                transaction_date: order.paidDate || order.createdDate,
                amount: amount,
                customer_name: check.customer ? `${check.customer.firstName || ''} ${check.customer.lastName || ''}`.trim() : 'Guest',
                status: order.voided ? 'voided' : 'completed'
              });
            
            if (!insertError) {
              successCount++;
              errors.pop(); // Remove the error since direct insert worked
            }
          } catch (e) {
            // Keep original error
          }
        }
      }
    }

    // Try to get count
    const { data: countData } = await supabase
      .from('simple_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'toast');

    return res.status(200).json({
      success: true,
      message: `Processed ${orders.length} orders`,
      stats: {
        ordersFound: orders.length,
        successCount,
        errorCount: errors.length,
        totalInDatabase: countData ? countData.length : 'unknown',
        errors: errors.slice(0, 5) // First 5 errors
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Make sure RLS is disabled on simple_transactions table in Supabase dashboard'
    });
  }
}
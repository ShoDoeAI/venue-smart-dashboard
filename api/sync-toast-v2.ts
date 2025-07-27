import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
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

    // Fetch today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ordersResponse = await axios.get(
      'https://ws-api.toasttab.com/orders/v2/ordersBulk',
      {
        params: {
          startDate: today.toISOString(),
          endDate: new Date().toISOString(),
          pageSize: 100,
          page: 1
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': locationId
        }
      }
    );

    const orders = ordersResponse.data || [];
    
    // Process orders into simple transactions
    const transactions = [];
    let totalRevenue = 0;
    let transactionCount = 0;

    for (const order of orders) {
      if (order.checks && order.checks.length > 0) {
        for (const check of order.checks) {
          const amount = (check.totalAmount || 0) / 100; // Convert cents to dollars
          totalRevenue += amount;
          transactionCount++;

          transactions.push({
            source: 'toast',
            transaction_id: check.guid,
            transaction_date: order.paidDate || order.createdDate,
            amount: amount,
            customer_name: check.customer ? 
              `${check.customer.firstName || ''} ${check.customer.lastName || ''}`.trim() : null,
            customer_email: check.customer?.email || null,
            items: check.selections?.length || 0,
            status: order.voided ? 'voided' : 'completed',
            raw_data: {
              orderId: order.guid,
              orderNumber: order.displayNumber,
              checkNumber: check.displayNumber,
              server: order.server,
              source: order.source,
              items: check.selections?.map((s: any) => ({
                name: s.displayName,
                price: s.price,
                quantity: s.quantity
              })) || []
            }
          });
        }
      }
    }

    // Save to simple_transactions table
    if (transactions.length > 0) {
      console.log(`Attempting to save ${transactions.length} transactions`);
      console.log('Sample transaction:', JSON.stringify(transactions[0], null, 2));
      
      const { data: saved, error: saveError } = await supabase
        .from('simple_transactions')
        .insert(transactions)
        .select();

      if (saveError) {
        console.error('Save error:', saveError);
        console.error('Error details:', JSON.stringify(saveError, null, 2));
        throw new Error(`Failed to save transactions: ${saveError.message || JSON.stringify(saveError)}`);
      }

      console.log(`Saved ${saved?.length || 0} transactions`);
    }

    // Update daily summary
    const summaryDate = today.toISOString().split('T')[0];
    const { error: summaryError } = await supabase
      .from('daily_summaries')
      .upsert({
        venue_id: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
        summary_date: summaryDate,
        total_revenue: totalRevenue,
        transaction_count: transactionCount,
        average_transaction: transactionCount > 0 ? totalRevenue / transactionCount : 0,
        source_data: {
          toast: {
            orderCount: orders.length,
            revenue: totalRevenue,
            transactions: transactionCount,
            lastSync: new Date().toISOString()
          }
        } as any
      });

    if (summaryError) {
      console.error('Error updating summary:', summaryError);
    }

    return res.status(200).json({
      success: true,
      stats: {
        orderCount: orders.length,
        transactionCount,
        totalRevenue: totalRevenue.toFixed(2),
        averageTransaction: transactionCount > 0 ? (totalRevenue / transactionCount).toFixed(2) : '0.00',
        transactionsSaved: transactions.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.response?.data || 'No additional details',
      timestamp: new Date().toISOString()
    });
  }
}
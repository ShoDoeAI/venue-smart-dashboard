import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import type { Database } from '@venuesync/shared';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Toast credentials
    const clientId = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
    const clientSecret = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
    const locationId = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
    const venueId = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

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
    
    // Calculate metrics
    let totalRevenue = 0;
    let transactionCount = 0;
    const customerIds = new Set();

    orders.forEach((order: any) => {
      if (order.checks) {
        order.checks.forEach((check: any) => {
          totalRevenue += (check.totalAmount || 0) / 100;
          transactionCount++;
          if (check.customer?.guid) {
            customerIds.add(check.customer.guid);
          }
        });
      }
    });

    // Create or update today's summary
    const summaryDate = today.toISOString().split('T')[0];
    
    const { error: summaryError } = await supabase
      .from('daily_summaries')
      .upsert({
        venue_id: venueId,
        summary_date: summaryDate,
        total_revenue: totalRevenue,
        transaction_count: transactionCount,
        unique_customers: customerIds.size,
        average_transaction: transactionCount > 0 ? totalRevenue / transactionCount : 0,
        total_tickets_sold: 0, // Would come from Eventbrite
        total_attendance: customerIds.size,
        inventory_usage_percentage: 0, // Would come from WISK
        social_engagement_count: 0, // Would come from Meta
        reservations_count: 0, // Would come from Resy/OpenTable
        source_data: {
          toast: {
            orderCount: orders.length,
            lastSync: new Date().toISOString()
          }
        } as any
      });

    if (summaryError) {
      console.error('Error saving summary:', summaryError);
    }

    // Save individual transactions
    const transactions = [];
    const snapshotTimestamp = new Date().toISOString();
    
    for (const order of orders) {
      if (order.checks) {
        for (const check of order.checks) {
          transactions.push({
            snapshot_timestamp: snapshotTimestamp,
            transaction_id: check.guid,
            location_id: locationId,
            created_at: order.createdDate || new Date().toISOString(),
            total_amount: check.totalAmount || 0, // Already in cents
            tax_amount: check.taxAmount || 0,
            tip_amount: 0, // Would need to extract from payments
            discount_amount: 0, // Would need to extract from appliedDiscounts
            service_charge_amount: 0, // Would need to extract
            source_type: 'POS',
            status: order.voided ? 'VOIDED' : 'COMPLETED',
            receipt_number: check.displayNumber,
            customer_id: check.customer?.guid || null,
            customer_name: check.customer ? 
              `${check.customer.firstName || ''} ${check.customer.lastName || ''}`.trim() : null,
            customer_email: check.customer?.email || null,
            team_member_id: order.server?.guid || null,
            device_id: order.createdDevice?.id || null,
            business_date: order.businessDate?.toString() || null,
            revenue_center_id: order.revenueCenter?.guid || null,
            metadata: {
              orderId: order.guid,
              orderNumber: order.displayNumber,
              source: order.source,
              diningOption: order.diningOption,
              numberOfGuests: order.numberOfGuests
            } as any
          });
        }
      }
    }

    if (transactions.length > 0) {
      const { error: txError } = await supabase
        .from('toast_transactions')
        .upsert(transactions);
      
      if (txError) {
        console.error('Error saving transactions:', txError);
      }
    }

    return res.status(200).json({
      success: true,
      stats: {
        orderCount: orders.length,
        transactionCount,
        totalRevenue: totalRevenue.toFixed(2),
        uniqueCustomers: customerIds.size,
        transactionsSaved: transactions.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.response?.data || error.response?.statusText || 'No additional details',
      timestamp: new Date().toISOString()
    });
  }
}
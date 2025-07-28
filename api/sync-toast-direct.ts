import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { Pool } from 'pg';

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
  revenueCenterId?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  payments?: unknown[];
  selections?: Array<{
    displayName: string;
    quantity: number;
    price: number;
  }>;
}

interface AuthResponse {
  token: {
    accessToken: string;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Use direct PostgreSQL connection to bypass RLS entirely
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!databaseUrl) {
      return res.status(500).json({
        success: false,
        error: 'No database URL found in environment variables'
      });
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Toast credentials
    const clientId = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
    const clientSecret = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
    const locationId = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

    // Authenticate with Toast
    const authResponse = await axios.post<AuthResponse>(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      { clientId, clientSecret, userAccessType: 'TOAST_MACHINE_CLIENT' }
    );
    const token = authResponse.data.token.accessToken;

    // Fetch orders from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const ordersResponse = await axios.get<ToastOrder[]>(
      'https://ws-api.toasttab.com/orders/v2/ordersBulk',
      {
        params: {
          startDate: yesterday.toISOString(),
          endDate: new Date().toISOString(),
          pageSize: 100
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': locationId
        }
      }
    );

    const orders = ordersResponse.data || [];
    // eslint-disable-next-line no-console
    console.log(`Found ${orders.length} orders to sync`);

    let successCount = 0;
    let errorCount = 0;

    // Process each order
    for (const order of orders) {
      for (const check of (order.checks || [])) {
        if (!check.guid) continue;

        const amount = (check.totalAmount || 0) / 100;
        
        try {
          await pool.query(
            `INSERT INTO simple_transactions 
             (source, transaction_id, transaction_date, amount, customer_name, customer_email, items, status, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (source, transaction_id) DO UPDATE SET
               amount = EXCLUDED.amount,
               status = EXCLUDED.status,
               raw_data = EXCLUDED.raw_data`,
            [
              'toast',
              check.guid,
              order.paidDate || order.createdDate,
              amount,
              check.customer ? `${check.customer.firstName || ''} ${check.customer.lastName || ''}`.trim() : null,
              check.customer?.email || null,
              check.selections?.length || 0,
              order.voided ? 'voided' : 'completed',
              JSON.stringify({
                orderId: order.guid,
                checkId: check.guid,
                revenueCenterId: check.revenueCenterId,
                payments: check.payments,
                selections: check.selections?.map((s) => ({
                  name: s.displayName,
                  quantity: s.quantity,
                  price: s.price
                }))
              })
            ]
          );
          successCount++;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to insert check ${check.guid}:`, error instanceof Error ? error.message : 'Unknown error');
          errorCount++;
        }
      }
    }

    // Get summary stats
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue,
        MIN(transaction_date) as earliest,
        MAX(transaction_date) as latest
      FROM simple_transactions
      WHERE source = 'toast'
    `);

    await pool.end();

    return res.status(200).json({
      success: true,
      message: `Synced ${successCount} transactions successfully`,
      stats: {
        ordersFound: orders.length,
        successCount,
        errorCount,
        database: summaryResult.rows[0]
      }
    });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
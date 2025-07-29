import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ToastConnector } from '@venuesync/shared';
import type { Database } from '@venuesync/shared';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests for easy testing
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if we have Toast credentials
    const hasToastCredentials = !!process.env.TOAST_CLIENT_ID && 
                          !!process.env.TOAST_CLIENT_SECRET &&
                          !!process.env.TOAST_LOCATION_GUID;

    if (!hasToastCredentials) {
      // Return mock data for testing
      return res.status(200).json({
        success: true,
        mode: 'mock',
        message: 'Toast credentials not configured. Returning mock data.',
        stats: {
          transactionCount: 42,
          totalRevenue: 3250.50,
          averageTransaction: 77.39,
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        },
        sampleTransactions: [
          {
            id: 'MOCK_TXN_001',
            amount: 125.50,
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'COMPLETED',
            customer_name: 'John Doe',
          },
          {
            id: 'MOCK_TXN_002',
            amount: 89.25,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'COMPLETED',
            customer_name: 'Jane Smith',
          },
          {
            id: 'MOCK_TXN_003',
            amount: 234.00,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'COMPLETED',
            customer_name: 'Bob Johnson',
          },
        ],
        instructions: 'To use real Toast data, add TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, and TOAST_LOCATION_GUID to your .env.local file',
      });
    }

    // Initialize Toast connector with environment credentials
    const connector = new ToastConnector(
      {
        id: 'test-toast-api',
        service: 'toast',
        isActive: true,
        credentials: {
          clientId: process.env.TOAST_CLIENT_ID!,
          clientSecret: process.env.TOAST_CLIENT_SECRET!,
          locationGuid: process.env.TOAST_LOCATION_GUID!,
          environment: (process.env.TOAST_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      supabase
    );

    // Test connection
    const connectionTest = await connector.testConnection();
    if (!connectionTest.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to connect to Toast',
        details: connectionTest.error,
      });
    }

    // Fetch locations
    const locationsResult = await connector.fetchLocations();
    if (!locationsResult.success || !locationsResult.data || locationsResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No Toast locations found',
        hint: 'Make sure your Toast account has at least one location',
      });
    }

    const location = locationsResult.data[0];

    // Fetch recent transactions (last 7 days)
    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 7);

    const transactionsResult = await connector.fetchAllTransactions(
      location.id || location.guid,
      startTime,
      endTime
    );

    if (!transactionsResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        details: transactionsResult.error,
      });
    }

    const transactions = transactionsResult.data || [];

    // Calculate stats (amounts are already in dollars)
    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total_amount, 0);
    const avgTransaction = transactions.length > 0 
      ? totalRevenue / transactions.length 
      : 0;

    // Get additional data
    const customersResult = await connector.fetchCustomers();
    const teamMembersResult = await connector.fetchTeamMembers([location.id || location.guid]);

    return res.status(200).json({
      success: true,
      mode: 'live',
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
      },
      stats: {
        transactionCount: transactions.length,
        totalRevenue: totalRevenue, // Already in dollars
        averageTransaction: avgTransaction, // Already in dollars
        customerCount: customersResult.data?.data.length || 0,
        teamMemberCount: teamMembersResult.data?.data.length || 0,
        dateRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
      },
      sampleTransactions: transactions.slice(0, 5).map(tx => ({
        id: tx.transaction_id,
        amount: tx.total_amount, // Already in dollars
        created_at: tx.created_at,
        status: tx.status,
        customer_name: tx.customer_name,
      })),
      metrics: connector.getMetrics(),
      circuitBreaker: connector.getCircuitBreakerState(),
    });

  } catch (error) {
    console.error('Error in test-toast endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
import { createClient } from '@supabase/supabase-js';
import { ToastConnector } from '@venuesync/shared';
import type { Database, ConnectorCredentials } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Validate environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
}

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic authentication check (in production, use proper auth)
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { locationId, startDate, endDate } = req.body;

    // Validate request body
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }

    // Default to last 7 days if dates not provided
    const endTime = endDate ? new Date(endDate) : new Date();
    const startTime = startDate 
      ? new Date(startDate) 
      : new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch Toast credentials from database
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('service', 'toast')
      .single();

    if (credError || !credentials) {
      return res.status(404).json({ 
        error: 'Toast credentials not found in database' 
      });
    }

    // Initialize Toast connector
    const connector = new ToastConnector(
      {
        id: credentials.id,
        service: 'toast',
        credentials: credentials.credentials,
        isActive: true,
        metadata: credentials.metadata || {},
        created_at: credentials.created_at,
        updated_at: credentials.updated_at,
      } as ConnectorCredentials,
      {
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      supabase
    );

    // Validate credentials
    const isValid = await connector.validateCredentials();
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid Toast credentials' 
      });
    }

    // Create a new snapshot record
    const { data: snapshot, error: snapshotError } = await supabase
      .from('venue_snapshots')
      .insert({
        venue_id: credentials.venue_id,
        started_at: new Date().toISOString(),
        status: 'in_progress',
      })
      .select()
      .single();

    if (snapshotError || !snapshot) {
      return res.status(500).json({ 
        error: 'Failed to create snapshot record' 
      });
    }

    // Fetch transactions
    const result = await connector.fetchAllTransactions(
      locationId,
      startTime,
      endTime
    );

    if (!result.success) {
      // Update snapshot as failed
      await supabase
        .from('venue_snapshots')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: result.error?.message,
        })
        .eq('id', snapshot.id);

      return res.status(500).json({ 
        error: result.error?.message || 'Failed to fetch transactions' 
      });
    }

    const transactions = result.data || [];

    // Save transactions to database
    if (transactions.length > 0) {
      const saveResult = await connector.saveTransactions(
        transactions,
        snapshot.created_at
      );

      if (!saveResult.success) {
        await supabase
          .from('venue_snapshots')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: saveResult.error?.message,
          })
          .eq('id', snapshot.id);

        return res.status(500).json({ 
          error: 'Failed to save transactions' 
        });
      }
    }

    // Calculate basic KPIs
    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total_amount, 0);
    const avgTransaction = transactions.length > 0 
      ? totalRevenue / transactions.length 
      : 0;

    // Update snapshot with completion and stats
    await supabase
      .from('venue_snapshots')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        toast_fetched: true,
        transaction_count: transactions.length,
        total_revenue: totalRevenue,
      })
      .eq('id', snapshot.id);

    // Return success response
    return res.status(200).json({
      success: true,
      snapshotId: snapshot.id,
      stats: {
        transactionCount: transactions.length,
        totalRevenue: totalRevenue, // Already in dollars
        averageTransaction: avgTransaction,
        dateRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
      },
      metrics: connector.getMetrics(),
    });

  } catch (error) {
    console.error('Unexpected error in fetch-toast-data:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
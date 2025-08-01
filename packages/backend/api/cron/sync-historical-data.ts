import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ToastConnector } from '@venuesync/shared';
import type { Database, ConnectorCredentials, ConnectorConfig } from '@venuesync/shared';

/**
 * Vercel endpoint to sync historical data from Toast API going back 2 years
 * This is designed to be run once initially or triggered manually for backfill
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests and check for authorization
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authorization (can be called by admin or cron)
  const authHeader = req.headers.authorization;
  const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}` || 
                      authHeader === `Bearer ${process.env.ADMIN_SECRET}`;
  
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log(`[HISTORICAL-SYNC] Starting historical data sync at ${new Date().toISOString()}`);

  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get venue configuration - for now assume first venue
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`);
    }

    if (!venues || venues.length === 0) {
      return res.status(400).json({ error: 'No active venues found' });
    }

    const venue = venues[0];
    console.log(`[HISTORICAL-SYNC] Processing venue: ${venue.name} (${venue.id})`);

    // Get Toast credentials
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venue.id)
      .eq('service_name', 'toast')
      .eq('is_active', true)
      .single();

    if (credError || !credentials) {
      throw new Error(`Toast credentials not found: ${credError?.message || 'No credentials'}`);
    }

    // Initialize Toast connector
    const connectorCredentials: ConnectorCredentials = {
      id: credentials.id,
      service: 'toast',
      credentials: credentials.credentials,
      isActive: true,
      created_at: credentials.created_at,
      updated_at: credentials.updated_at,
    };

    const connectorConfig: ConnectorConfig = {
      timeout: 60000,
      maxRetries: 3,
      retryDelay: 1000,
    };

    const toastConnector = new ToastConnector(connectorCredentials, connectorConfig, supabase);

    // Calculate date range - 2 years back from today
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 2);

    console.log(`[HISTORICAL-SYNC] Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Check if we already have historical data to avoid duplicates
    const { data: existingData } = await supabase
      .from('toast_transactions')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })
      .limit(1);

    if (existingData && existingData.length > 0) {
      console.log(`[HISTORICAL-SYNC] Historical data already exists from ${existingData[0].created_at}`);
    }

    // Split the 2-year period into monthly chunks to avoid API limits
    const monthlyResults = [];
    const currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      const chunkStart = new Date(currentDate);
      const chunkEnd = new Date(currentDate);
      chunkEnd.setMonth(chunkEnd.getMonth() + 1);
      
      // Don't go beyond the end date
      if (chunkEnd > endDate) {
        chunkEnd.setTime(endDate.getTime());
      }

      console.log(`[HISTORICAL-SYNC] Processing chunk: ${chunkStart.toISOString()} to ${chunkEnd.toISOString()}`);

      try {
        // Fetch transactions for this chunk
        const result = await toastConnector.fetchAllTransactions(
          credentials.credentials.locationGuid,
          chunkStart,
          chunkEnd
        );

        if (result.success && result.data) {
          console.log(`[HISTORICAL-SYNC] Fetched ${result.data.length} transactions for chunk`);

          // Save transactions to the base tables with historical flag
          if (result.data.length > 0) {
            // Since toast_transactions is a view, we need to save to the base tables
            // Extract unique orders, checks, and payments
            const ordersMap = new Map();
            const checksMap = new Map();
            const paymentsMap = new Map();
            
            // Group transactions by their base components
            // For now, we'll create synthetic base records from the transformed data
            for (const tx of result.data) {
              // Create a synthetic order
              const orderGuid = `order_${tx.transaction_id}`;
              ordersMap.set(orderGuid, {
                order_guid: orderGuid,
                location_id: tx.location_id,
                created_date: tx.created_at,
                paid_date: tx.created_at,
                order_number: tx.receipt_number,
                voided: false,
                is_historical: true,
                snapshot_timestamp: new Date().toISOString(),
              });
              
              // Create a synthetic check
              const checkGuid = `check_${tx.transaction_id}`;
              checksMap.set(checkGuid, {
                check_guid: checkGuid,
                order_guid: orderGuid,
                amount: tx.total_amount - tx.tip_amount,
                tax_amount: tx.tax_amount,
                tip_amount: tx.tip_amount,
                applied_discount_amount: tx.discount_amount,
                customer_guid: tx.customer_id,
                customer_first_name: tx.customer_name?.split(' ')[0],
                customer_last_name: tx.customer_name?.split(' ').slice(1).join(' '),
                customer_email: tx.customer_email,
                voided: false,
                is_historical: true,
                snapshot_timestamp: new Date().toISOString(),
              });
              
              // Create a synthetic payment
              paymentsMap.set(tx.transaction_id, {
                payment_guid: tx.transaction_id,
                check_guid: checkGuid,
                order_guid: orderGuid,
                amount: tx.total_amount - tx.tip_amount,
                tip_amount: tx.tip_amount,
                type: tx.source_type,
                paid_date: tx.created_at,
                voided: false,
                is_historical: true,
                snapshot_timestamp: new Date().toISOString(),
              });
            }

            // Save to base tables
            const errors = [];
            
            // Save orders
            if (ordersMap.size > 0) {
              const { error: orderError } = await supabase
                .from('toast_orders')
                .upsert(Array.from(ordersMap.values()), {
                  onConflict: 'order_guid,snapshot_timestamp',
                  ignoreDuplicates: true
                });
              if (orderError) errors.push(`Orders: ${orderError.message}`);
            }
            
            // Save checks
            if (checksMap.size > 0) {
              const { error: checkError } = await supabase
                .from('toast_checks')
                .upsert(Array.from(checksMap.values()), {
                  onConflict: 'check_guid,snapshot_timestamp',
                  ignoreDuplicates: true
                });
              if (checkError) errors.push(`Checks: ${checkError.message}`);
            }
            
            // Save payments
            if (paymentsMap.size > 0) {
              const { error: paymentError } = await supabase
                .from('toast_payments')
                .upsert(Array.from(paymentsMap.values()), {
                  onConflict: 'payment_guid,snapshot_timestamp',
                  ignoreDuplicates: true
                });
              if (paymentError) errors.push(`Payments: ${paymentError.message}`);
            }
            
            const insertError = errors.length > 0 ? { message: errors.join('; ') } : null;

            if (insertError) {
              console.error(`[HISTORICAL-SYNC] Failed to save chunk: ${insertError.message}`);
              monthlyResults.push({
                period: `${chunkStart.toISOString()} to ${chunkEnd.toISOString()}`,
                status: 'failed',
                error: insertError.message,
                transactionCount: 0,
              });
            } else {
              monthlyResults.push({
                period: `${chunkStart.toISOString()} to ${chunkEnd.toISOString()}`,
                status: 'success',
                transactionCount: result.data.length,
              });
            }
          } else {
            monthlyResults.push({
              period: `${chunkStart.toISOString()} to ${chunkEnd.toISOString()}`,
              status: 'success',
              transactionCount: 0,
            });
          }
        } else {
          console.error(`[HISTORICAL-SYNC] Failed to fetch chunk: ${result.error?.message}`);
          monthlyResults.push({
            period: `${chunkStart.toISOString()} to ${chunkEnd.toISOString()}`,
            status: 'failed',
            error: result.error?.message || 'Unknown error',
            transactionCount: 0,
          });
        }

        // Rate limiting: wait between chunks to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[HISTORICAL-SYNC] Error processing chunk: ${error}`);
        monthlyResults.push({
          period: `${chunkStart.toISOString()} to ${chunkEnd.toISOString()}`,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          transactionCount: 0,
        });
      }

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Calculate summary statistics
    const summary = {
      totalChunks: monthlyResults.length,
      successful: monthlyResults.filter(r => r.status === 'success').length,
      failed: monthlyResults.filter(r => r.status === 'failed').length,
      totalTransactions: monthlyResults.reduce((sum, r) => sum + r.transactionCount, 0),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      chunks: monthlyResults,
    };

    const duration = Date.now() - startTime;
    console.log(`[HISTORICAL-SYNC] Historical sync completed in ${duration}ms`);
    console.log(`[HISTORICAL-SYNC] Summary: ${summary.totalTransactions} transactions across ${summary.successful}/${summary.totalChunks} successful chunks`);

    // Log to cron_logs table
    await supabase.from('cron_logs').insert({
      job_name: 'sync-historical-data',
      status: summary.failed > 0 ? 'partial_success' : 'success',
      duration_ms: duration,
      metadata: summary,
      executed_at: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      duration,
      summary,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[HISTORICAL-SYNC] Historical sync failed:', error);

    // Log error to cron_logs table
    try {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      await supabase.from('cron_logs').insert({
        job_name: 'sync-historical-data',
        status: 'failed',
        duration_ms: duration,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[HISTORICAL-SYNC] Failed to log error:', logError);
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
  }
}
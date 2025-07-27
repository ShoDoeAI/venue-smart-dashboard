import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Try a simple insert
    const testTransaction = {
      source: 'test',
      transaction_id: `test-${Date.now()}`,
      transaction_date: new Date().toISOString(),
      amount: 10.50,
      customer_name: 'Test Customer',
      status: 'completed'
    };

    console.log('Attempting to insert:', testTransaction);

    const { data, error } = await supabase
      .from('simple_transactions')
      .insert([testTransaction])
      .select();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Unknown error',
        errorDetails: error,
        attemptedData: testTransaction
      });
    }

    return res.status(200).json({
      success: true,
      inserted: data,
      message: 'Test insert successful'
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack
    });
  }
}
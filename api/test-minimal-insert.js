const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Create a minimal test transaction
    const testTransaction = {
      source: 'toast',
      transaction_id: 'test-' + Date.now(),
      transaction_date: new Date().toISOString(),
      amount: 25.5,
      status: 'completed',
    };

    console.log('Attempting minimal insert:', testTransaction);

    // Try to insert
    const { data, error } = await supabase
      .from('simple_transactions')
      .insert([testTransaction])
      .select();

    if (error) {
      console.error('Insert error:', JSON.stringify(error, null, 2));
      return res.status(200).json({
        success: false,
        error: 'Insert failed',
        errorDetails: error,
        attemptedData: testTransaction,
      });
    }

    return res.status(200).json({
      success: true,
      inserted: data,
      message: 'Successfully inserted minimal transaction!',
    });
  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
    });
  }
};

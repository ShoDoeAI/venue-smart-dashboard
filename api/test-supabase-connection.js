const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({
        success: false,
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Can we query the table?
    const {
      data: queryData,
      error: queryError,
      count,
    } = await supabase.from('simple_transactions').select('*', { count: 'exact', head: true });

    // Test 2: Get table info using a simple query
    const { data: testQuery, error: testError } = await supabase
      .from('simple_transactions')
      .select('id')
      .limit(1);

    // Test 3: Try inserting with all possible fields
    const fullTransaction = {
      source: 'toast',
      transaction_id: 'test-full-' + Date.now(),
      transaction_date: new Date().toISOString(),
      amount: 10.0,
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      items: 1,
      status: 'completed',
      raw_data: { test: true },
    };

    const { data: insertData, error: insertError } = await supabase
      .from('simple_transactions')
      .insert([fullTransaction])
      .select();

    return res.status(200).json({
      success: true,
      tests: {
        canQuery: !queryError,
        recordCount: count || 0,
        queryError: queryError,
        testQueryResult: { data: testQuery, error: testError },
        insertTest: {
          success: !insertError,
          data: insertData,
          error: insertError,
          attempted: fullTransaction,
        },
      },
    });
  } catch (error) {
    console.error('Connection test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack,
    });
  }
};

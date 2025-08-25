const axios = require('axios');

async function testContextAggregator() {
  console.log('Testing AI Context Aggregator directly...\n');
  
  // Test the test-ai-context endpoint if it exists
  try {
    const response = await axios.post('https://venue-smart-dashboard.vercel.app/api/test-ai-context', {
      query: "What was the revenue on February 14, 2025?"
    });
    
    console.log('Response status:', response.status);
    console.log('\nQuery Range:', response.data.queryRange);
    console.log('\nAggregated Data keys:', Object.keys(response.data.aggregatedData || {}));
    
    if (response.data.aggregatedData?.toastAnalytics) {
      const ta = response.data.aggregatedData.toastAnalytics;
      console.log('\nToast Analytics:');
      console.log('  Total Revenue:', ta.totalRevenue);
      console.log('  Query Period:', ta.queryPeriod);
      console.log('  No Data Found:', ta.noDataFound);
      console.log('  Daily Breakdown Count:', ta.dailyBreakdown?.length || 0);
      
      if (ta.dailyBreakdown && ta.dailyBreakdown.length > 0) {
        console.log('\n  Daily Breakdown:');
        ta.dailyBreakdown.forEach(day => {
          console.log(`    ${day.date}: $${day.revenue} (${day.checks} checks)`);
        });
      }
    }
    
    // Log the full context that would be sent to AI
    console.log('\n\nFull Toast Analytics object:');
    console.log(JSON.stringify(response.data.aggregatedData?.toastAnalytics, null, 2));
    
  } catch (error) {
    console.error('Error calling test-ai-context:', error.message);
    console.log('\nTrying direct chat endpoint...');
    
    // Try the chat endpoint directly
    try {
      const chatResponse = await axios.post('https://venue-smart-dashboard.vercel.app/api/chat-enhanced', {
        message: "What was the revenue on February 14, 2025?"
      });
      
      console.log('\nChat Response received');
      console.log('Response preview:', chatResponse.data.response?.substring(0, 200) + '...');
      
    } catch (chatError) {
      console.error('Chat error:', chatError.message);
    }
  }
}

testContextAggregator().catch(console.error);
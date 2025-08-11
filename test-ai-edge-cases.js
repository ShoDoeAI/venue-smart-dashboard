#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

// Test edge cases and complex queries
const EDGE_CASE_TESTS = [
  // 1. BOUNDARY CASES
  {
    category: "Boundary Testing",
    tests: [
      "What is revenue at midnight on August 1?",
      "Revenue at 11:59 PM August 1",
      "First check of August 1",
      "Last check of August 1",
      "Revenue between 11pm and 1am on August 1"
    ]
  },
  
  // 2. COMPLEX DATE PARSING
  {
    category: "Complex Dates",
    tests: [
      "First Thursday of August revenue",
      "Last Friday's revenue", 
      "Revenue 10 days ago",
      "Revenue from start of month to today",
      "MTD revenue", // Month to date
      "QTD revenue", // Quarter to date
      "YTD revenue", // Year to date
      "Revenue since Monday",
      "Weekend revenue (Fri-Sun)",
      "Weekday revenue only"
    ]
  },
  
  // 3. BUSINESS INTELLIGENCE
  {
    category: "Business Intelligence",
    tests: [
      "What's our revenue run rate based on August?",
      "Project August revenue based on current pace",
      "If today's trend continues, what will we make this month?",
      "What day of week performs best?",
      "What's our revenue velocity?",
      "Show revenue momentum",
      "Are we trending up or down?",
      "Revenue variance analysis",
      "Show me outliers in August",
      "Identify anomalies in revenue"
    ]
  },
  
  // 4. COMPLEX CALCULATIONS
  {
    category: "Calculations",
    tests: [
      "What's 20% of August 1 revenue?",
      "If we increase prices 10%, what would August 1 revenue be?",
      "Revenue per hour on August 1",
      "Revenue per minute during peak hours",
      "Break down August 1 by percentage of day",
      "What percentage of weekly revenue is from weekends?",
      "Calculate monthly revenue if every day was like August 1",
      "Compound growth rate from August 1 to today"
    ]
  },
  
  // 5. MULTI-DIMENSIONAL QUERIES
  {
    category: "Multi-dimensional",
    tests: [
      "Top 3 revenue days and their check counts",
      "Revenue, checks, and average ticket for each day in August",
      "Rank all August days by revenue",
      "Show me a revenue heatmap for August",
      "Revenue distribution analysis",
      "Standard deviation of daily revenue",
      "Median vs mean revenue analysis",
      "Revenue quartiles for August"
    ]
  },
  
  // 6. CONTEXTUAL QUERIES
  {
    category: "Contextual Understanding",
    tests: [
      "Why was August 1 revenue higher than August 9?",
      "What drove revenue on August 8?",
      "Explain the revenue pattern",
      "What factors affect our revenue?",
      "Is $1,295 good for a Thursday?",
      "How does August 1 compare to typical Thursdays?",
      "Should I be concerned about August 9 revenue?",
      "What's normal revenue for us?"
    ]
  },
  
  // 7. ERROR HANDLING
  {
    category: "Error Handling",
    tests: [
      "Revenue for February 30", // Invalid date
      "Revenue for August 32", // Invalid date
      "Revenue for 13/1/2025", // Invalid format
      "Revenue for yesterday's tomorrow", // Nonsense
      "Revenue for null", // Null input
      "Revenue for [INJECTION TEST]'; DROP TABLE;", // SQL injection attempt
      "Revenue for <script>alert('test')</script>", // XSS attempt
      "What's the revenue for ñañaña", // Unicode
      "💰 revenue today 💰", // Emojis
      "REVENUE FOR TODAY!!!!!!", // Excessive punctuation
    ]
  },
  
  // 8. NATURAL LANGUAGE EDGE CASES
  {
    category: "Natural Language Edge Cases",
    tests: [
      "Um, what was, like, the revenue for, you know, August 1st?",
      "august first revenue please and thank you",
      "WHAT IS THE REVENUE FOR AUGUST FIRST",
      "revenue august 1",
      "aug1rev",
      "Show me the money for August 1",
      "How much bacon did we bring home on August 1?",
      "August 1 cash flow",
      "August 1 top line",
      "August 1 gross receipts"
    ]
  },
  
  // 9. PARTIAL DATA QUERIES
  {
    category: "Partial Data Handling",
    tests: [
      "Revenue for August 3-7", // Days with no data
      "Average revenue for days with no data",
      "Fill in missing days in August",
      "Interpolate August 3-7 revenue",
      "Why is August 3-7 missing?",
      "Can you estimate August 3-7?",
      "Show all days including zero revenue days",
      "Complete August calendar with revenue"
    ]
  },
  
  // 10. REAL-TIME QUERIES
  {
    category: "Real-time Queries",
    tests: [
      "Revenue in the last hour",
      "Revenue in the last 15 minutes",
      "Real-time revenue tracker",
      "Live revenue updates",
      "Revenue since I asked 5 minutes ago",
      "Alert me when we hit $3000 today",
      "Is revenue coming in faster or slower than yesterday?",
      "Current revenue velocity"
    ]
  }
];

// Expected behaviors for each category
const EXPECTED_BEHAVIORS = {
  "Boundary Testing": "Should handle edge times correctly",
  "Complex Dates": "Should parse complex date expressions",
  "Business Intelligence": "Should provide insights and analysis",
  "Calculations": "Should perform mathematical operations",
  "Multi-dimensional": "Should handle complex data requests",
  "Contextual Understanding": "Should provide explanations",
  "Error Handling": "Should gracefully handle invalid inputs",
  "Natural Language Edge Cases": "Should understand various phrasings",
  "Partial Data Handling": "Should acknowledge missing data",
  "Real-time Queries": "Should handle time-sensitive requests"
};

// Log all edge cases for manual review
console.log('🔍 AI EDGE CASE TEST SCENARIOS\n');
console.log('These are edge cases that need special handling:\n');
console.log('=' .repeat(80));

EDGE_CASE_TESTS.forEach(category => {
  console.log(`\n📋 ${category.category.toUpperCase()}`);
  console.log(`Expected: ${EXPECTED_BEHAVIORS[category.category]}`);
  console.log('-'.repeat(60));
  
  category.tests.forEach((test, i) => {
    console.log(`${i + 1}. "${test}"`);
  });
});

// Additional considerations
console.log('\n\n🎯 ADDITIONAL TEST CONSIDERATIONS:');
console.log('=' .repeat(80));

console.log('\n1. TIMEZONE HANDLING:');
console.log('   - "Revenue in PST vs EST"');
console.log('   - "August 1 in Tokyo time"');
console.log('   - "Convert to UTC"');

console.log('\n2. CURRENCY & FORMATTING:');
console.log('   - "Revenue in euros"');
console.log('   - "Show revenue without cents"');
console.log('   - "Revenue in K (thousands)"');

console.log('\n3. PERMISSIONS & SECURITY:');
console.log('   - "Show me admin-only metrics"');
console.log('   - "Revenue for different location"');
console.log('   - "Delete August 1 revenue"');

console.log('\n4. PERFORMANCE:');
console.log('   - "Revenue for last 10 years"');
console.log('   - "Analyze every transaction ever"');
console.log('   - "Real-time updates every second"');

console.log('\n5. INTEGRATION:');
console.log('   - "Compare to QuickBooks data"');
console.log('   - "Sync with Excel"');
console.log('   - "Send to my email"');

console.log('\n\n💡 KEY TESTING PRINCIPLES:');
console.log('1. Every query should return SOMETHING (never crash)');
console.log('2. Ambiguous queries should ask for clarification');
console.log('3. Invalid queries should explain why they\'re invalid');
console.log('4. All amounts should be accurate to the cent');
console.log('5. Response time should be under 3 seconds');
console.log('6. Natural language variations should all work');
console.log('7. Security attempts should be blocked');
console.log('8. Missing data should be clearly indicated');

console.log('\n✅ CRITICAL SUCCESS CRITERIA:');
console.log('- August 1: Must ALWAYS return exactly $1,295.00');
console.log('- August 8: Must ALWAYS return exactly $1,440.06');
console.log('- August 9: Must ALWAYS return exactly $343.80');
console.log('- August 10: Must ALWAYS return exactly $2,040.00');
console.log('- Date ranges: Must include ONLY the requested dates');
console.log('- Comparisons: Must use correct data for both periods');
console.log('- No data: Must clearly state when data is unavailable');
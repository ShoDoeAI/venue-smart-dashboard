#!/usr/bin/env node

// Test specific patterns that could break the AI

const PROBLEM_PATTERNS = {
  // Dates that might match multiple patterns
  ambiguousDates: [
    "August", // Should return month, not August 1st
    "1st", // Which month?
    "The 8th", // Which month?
    "Friday", // Which Friday?
    "Last month", // July 2025
    "Next month", // September 2025
    "3 months ago", // May 2025
    "Q3", // Quarter 3
    "H1", // First half of year
    "Fiscal August", // Might be different
  ],
  
  // Queries with multiple dates
  multiDateQueries: [
    "August 1st and 8th combined",
    "August 1, 8, 9, and 10 total",
    "Every Thursday in August",
    "All weekends in August",
    "First and last day of August",
    "August 1-10 excluding weekends",
    "August 1 plus August 8 minus August 9",
    "Average of August 1, 8, 9, and 10",
  ],
  
  // Queries that might return wrong data
  trickyQueries: [
    "August 1st 2025", // Should NOT include August 2
    "August 1", // Should NOT include August 2  
    "Aug 1", // Should NOT return full month
    "1 Aug", // European format
    "1/8/2025", // Could be Jan 8 or Aug 1
    "08-01-2025", // Could be Aug 1 or Jan 8
    "Thursday the 1st", // Which month?
    "The first", // Of what?
  ],
  
  // Queries that might break date parsing
  breakingPatterns: [
    "August1st", // No space
    "August  1st", // Double space
    "August\t1st", // Tab
    "August\n1st", // Newline
    "AUGUST 1ST", // All caps
    "august 1st", // All lowercase
    "AuGuSt 1St", // Mixed case
    "Auguts 1st", // Typo
    "August 1st.", // With period
    "August 1st,", // With comma
    "(August 1st)", // In parentheses
    "[August 1st]", // In brackets
    "August 1st's revenue", // Possessive
    "August 1st revenue", // Should work
    "revenue August 1st", // Different order
  ],
  
  // SQL/Code injection attempts
  injectionAttempts: [
    "'; SELECT * FROM toast_orders; --",
    "August 1' OR '1'='1",
    "August 1; DROP TABLE toast_orders;",
    "${process.env.SUPABASE_URL}",
    "{{7*7}}",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "../../../etc/passwd",
    "August 1 UNION SELECT password FROM users",
    "August 1`; console.log('hacked');`",
  ],
  
  // Extreme inputs
  extremeInputs: [
    "a".repeat(1000), // Very long query
    "", // Empty query
    " ", // Just space
    "\n\n\n", // Just newlines
    "😀🎉💰📊📈", // Only emojis
    "١٢٣٤٥", // Arabic numerals
    "一二三四五", // Chinese numbers
    "!@#$%^&*()", // Special characters only
    "Revenue for August " + "1st ".repeat(100), // Repeated pattern
    "What is the revenue for August 1st?" + " Please?".repeat(50), // Excessive politeness
  ],
  
  // Conflicting information
  conflictingQueries: [
    "Revenue for August 1st 2024", // Wrong year but right day
    "Revenue for February 31st", // Invalid date
    "Revenue for August 35th", // Invalid day
    "Revenue for the 0th of August", // Invalid day
    "Revenue for August -1", // Negative day
    "Revenue for August 1.5", // Decimal day
    "Revenue for August 2025 in 2024", // Conflicting years
    "Yesterday's revenue for tomorrow", // Time paradox
    "Future revenue for past dates", // Nonsense
    "Revenue for August 1st at 25:00", // Invalid time
  ],
  
  // Complex business logic
  complexBusinessLogic: [
    "Revenue excluding tax for August 1",
    "Net revenue after refunds on August 1",
    "August 1 revenue in constant 2024 dollars",
    "Seasonally adjusted August 1 revenue",
    "August 1 revenue normalized for day of week",
    "Weather-adjusted revenue for August 1",
    "August 1 revenue if we were open 24 hours",
    "Projected August 1 revenue with 10% growth",
    "August 1 revenue per square foot",
    "August 1 revenue per employee hour",
  ]
};

// List all problem patterns
console.log('⚠️  PROBLEM PATTERNS TO TEST\n');
console.log('These patterns could potentially break the AI:\n');
console.log('=' .repeat(80));

for (const [category, patterns] of Object.entries(PROBLEM_PATTERNS)) {
  console.log(`\n🔴 ${category.toUpperCase()}`);
  console.log('-'.repeat(60));
  
  patterns.forEach((pattern, i) => {
    // Escape special characters for display
    const safe = pattern.replace(/[\n\t]/g, ' ').substring(0, 80);
    console.log(`${i + 1}. "${safe}${pattern.length > 80 ? '...' : ''}"`);
  });
}

// Critical validation rules
console.log('\n\n✅ VALIDATION RULES:');
console.log('=' .repeat(80));

console.log('\n1. DATE PARSING RULES:');
console.log('   - "August 1st" → ONLY August 1 ($1,295.00)');
console.log('   - "August" → Entire month (multiple days)');
console.log('   - "1st" alone → Request clarification');
console.log('   - Invalid dates → Polite error message');

console.log('\n2. SECURITY RULES:');
console.log('   - Block SQL injection attempts');
console.log('   - Sanitize all inputs');
console.log('   - No code execution');
console.log('   - No file system access');

console.log('\n3. PERFORMANCE RULES:');
console.log('   - Limit date ranges to reasonable periods');
console.log('   - Cache frequent queries');
console.log('   - Timeout after 30 seconds');
console.log('   - Limit response size');

console.log('\n4. ACCURACY RULES:');
console.log('   - Never mix data from different days');
console.log('   - Always show exact amounts');
console.log('   - Clear about what\'s included');
console.log('   - Indicate when data is missing');

console.log('\n5. USER EXPERIENCE RULES:');
console.log('   - Always respond (never crash)');
console.log('   - Be helpful with errors');
console.log('   - Suggest alternatives');
console.log('   - Learn from context');

// Most important test cases
console.log('\n\n🎯 MUST-PASS TEST CASES:');
console.log('=' .repeat(80));

const MUST_PASS = [
  { query: "August 1st", expected: "$1,295.00", reason: "Specific date parsing" },
  { query: "August 1", expected: "$1,295.00", reason: "Without 'st' suffix" },
  { query: "Aug 1", expected: "$1,295.00", reason: "Abbreviated month" },
  { query: "yesterday", expected: "$343.80", reason: "Relative date (Aug 9)" },
  { query: "today", expected: "$2,040.00", reason: "Current date (Aug 10)" },
  { query: "August", expected: "NOT $1,295.00", reason: "Full month, not just Aug 1" },
  { query: "this week", expected: "> $3,000", reason: "Week range" },
  { query: "August 1-2", expected: "> $1,295.00", reason: "Date range" },
  { query: "'; DROP TABLE", expected: "Safe response", reason: "SQL injection blocked" },
  { query: "August 99", expected: "Error message", reason: "Invalid date handled" }
];

console.log('\nThese MUST work correctly:');
MUST_PASS.forEach((test, i) => {
  console.log(`${i + 1}. "${test.query}" → ${test.expected} (${test.reason})`);
});
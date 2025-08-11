#!/usr/bin/env node

// Test date parsing patterns
const today = new Date(2025, 7, 10); // August 10, 2025

function parseDateQuery(message) {
  const patterns = [
    // Specific date like "August 1st" or "March 15th" - MUST come before month-only pattern
    { regex: /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i, 
      handler: (match) => {
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = monthNames.indexOf(match[1].toLowerCase());
        const day = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : 
                     (monthIndex <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1);
        
        const date = new Date(year, monthIndex, day);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        
        return { 
          startDate: date, 
          endDate: endDate, 
          timeRange: `${match[1]} ${day}, ${year}` 
        };
    }},
    
    // Specific month names (only when not followed by a day)
    { regex: /(january|february|march|april|may|june|july|august|september|october|november|december)(?!\s+\d)/i, handler: (match) => {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.indexOf(match[1].toLowerCase());
      const year = monthIndex <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1;
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0);
      return { startDate, endDate, timeRange: `${match[1]} ${year}` };
    }},
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      const result = pattern.handler(match);
      if (result) return result;
    }
  }

  return null;
}

// Test cases
const testCases = [
  "What was the revenue for August 1st?",
  "Show me August 1st, 2025 data",
  "How much did we make on August 1?",
  "What's the total for August?",
  "Revenue for August 9th",
  "August 10 revenue"
];

console.log('🧪 Testing Date Parsing\n');
console.log('=' .repeat(60));

testCases.forEach(test => {
  console.log(`\nQuery: "${test}"`);
  const result = parseDateQuery(test);
  if (result) {
    console.log(`✅ Parsed:`);
    console.log(`   Start: ${result.startDate.toDateString()}`);
    console.log(`   End: ${result.endDate.toDateString()}`);
    console.log(`   Time Range: ${result.timeRange}`);
  } else {
    console.log('❌ No date found');
  }
});
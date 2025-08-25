// Test the date parsing logic directly
function testDateParsing(query) {
  const monthDayYearMatch = query.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i
  );
  
  if (monthDayYearMatch) {
    console.log(`Raw match groups:`, monthDayYearMatch);
    
    const monthMap = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };
    const monthIndex = monthMap[monthDayYearMatch[1].toLowerCase()];
    const day = parseInt(monthDayYearMatch[2]);
    const year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3]) : new Date().getFullYear();
    
    const date = new Date(year, monthIndex, day);
    console.log(`Matched: "${query}"`);
    console.log(`  Month: ${monthDayYearMatch[1]} (index ${monthIndex})`);
    console.log(`  Day: ${day} (from match[2]: "${monthDayYearMatch[2]}")`);
    console.log(`  Year: ${year}`);
    console.log(`  Result: ${date.toISOString().split('T')[0]}`);
    return true;
  }
  
  console.log(`No match for: "${query}"`);
  return false;
}

// Test various formats
console.log('Testing date parsing patterns:\n');
const testQueries = [
  "What was the revenue on February 14, 2025?",
  "Revenue for Feb 14th 2025",
  "How much did we make on July 25, 2025?",
  "August 10, 2025 revenue",
  "Show me sales for December 25th, 2024",
  "What about January 1 revenue?", // no year
];

testQueries.forEach(query => {
  testDateParsing(query);
  console.log();
});
#!/usr/bin/env node

// Test the date parsing fix locally
const today = new Date(2025, 7, 10); // August 10, 2025

function testDateParsing() {
  const queries = [
    "What is the revenue for August 1st?",
    "Revenue for August 8",
    "Yesterday's revenue",
    "Today's revenue"
  ];
  
  // Pattern for specific dates like "August 1st"
  const specificDatePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i;
  
  queries.forEach(query => {
    console.log(`\nQuery: "${query}"`);
    const match = query.match(specificDatePattern);
    if (match) {
      console.log(`Matched: "${match[0]}"`);
      console.log(`Month: ${match[1]}, Day: ${match[2]}, Year: ${match[3] || 'current'}`);
    } else {
      console.log("No specific date match");
    }
  });
}

testDateParsing();
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const testQuery = "July 2025";
  const today = new Date('2025-08-18'); // Current date from logs

  // Test the regex patterns
  const monthYearRegex = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i;
  const specificDateRegex = /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i;

  const monthYearMatch = testQuery.match(monthYearRegex);
  const specificDateMatch = testQuery.match(specificDateRegex);

  let result = {
    query: testQuery,
    monthYearMatch: monthYearMatch ? {
      fullMatch: monthYearMatch[0],
      month: monthYearMatch[1],
      year: monthYearMatch[2]
    } : null,
    specificDateMatch: specificDateMatch ? {
      fullMatch: specificDateMatch[0],
      month: specificDateMatch[1],
      dayOrYear: specificDateMatch[2],
      optionalYear: specificDateMatch[3]
    } : null
  };

  // Show what would be parsed
  if (monthYearMatch) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.indexOf(monthYearMatch[1].toLowerCase());
    const year = parseInt(monthYearMatch[2]);
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);
    
    result.parsedAsMonthYear = {
      monthIndex,
      year,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateString: startDate.toISOString().split('T')[0],
      endDateString: endDate.toISOString().split('T')[0]
    };
  }

  // Show what the incorrect handler would parse
  if (specificDateMatch && !specificDateMatch[3]) {
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
    const monthIndex = monthMap[specificDateMatch[1].toLowerCase()];
    const day = parseInt(specificDateMatch[2]); // This would be 2025!
    const year = specificDateMatch[3] ? parseInt(specificDateMatch[3]) : 
      monthIndex <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1;
    
    try {
      const date = new Date(year, monthIndex, day);
      result.parsedAsSpecificDate = {
        monthIndex,
        day,
        year,
        date: date.toISOString(),
        isValid: !isNaN(date.getTime()),
        issue: day > 31 ? `Day ${day} is invalid!` : null
      };
    } catch (e) {
      result.parsedAsSpecificDate = {
        error: e.message
      };
    }
  }

  return res.status(200).json({
    success: true,
    ...result,
    recommendation: "The month-year pattern should be checked BEFORE the specific date pattern to avoid parsing '2025' as a day number"
  });
}
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { message = "revenue for July 2025" } = req.query;
  
  console.log('[TEST] Starting date parse test for:', message);
  
  // Test month+year pattern
  const monthYearRegex = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i;
  const monthYearMatch = (message as string).match(monthYearRegex);
  
  // Test day pattern
  const dayRegex = /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i;
  const dayMatch = (message as string).match(dayRegex);
  
  const result = {
    message: message as string,
    monthYearMatch: monthYearMatch ? {
      full: monthYearMatch[0],
      month: monthYearMatch[1],
      year: monthYearMatch[2]
    } : null,
    dayMatch: dayMatch ? {
      full: dayMatch[0],
      month: dayMatch[1],
      day: dayMatch[2],
      year: dayMatch[3]
    } : null
  };
  
  console.log('[TEST] Results:', result);
  
  return res.status(200).json(result);
}
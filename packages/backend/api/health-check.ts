import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const deploymentInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'b8bb8e6', // Latest commit
    features: {
      dateParsingDebugLogs: true,
      julyPatternFix: true,
      toastAnalytics: true
    },
    testDateParsing: {
      message: 'revenue for July 2025',
      patterns: {
        monthYear: /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i.test('revenue for July 2025'),
        specificDay: /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i.test('revenue for July 2025')
      }
    }
  };
  
  return res.status(200).json(deploymentInfo);
}
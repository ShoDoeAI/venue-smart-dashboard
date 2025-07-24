import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ErrorIsolationService } from '../src/services/error-isolation';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const errorService = new ErrorIsolationService();

    // Get query parameters
    const { source, limit = '50' } = req.query;

    if (req.query.stats === 'true') {
      // Get error statistics
      const stats = await errorService.getErrorStats();
      
      return res.status(200).json({
        success: true,
        stats,
      });
    }

    // Get recent errors
    const errors = await errorService.getRecentErrors(
      source as any,
      parseInt(limit as string, 10)
    );

    return res.status(200).json({
      success: true,
      errors,
      count: errors.length,
    });
  } catch (error) {
    console.error('Error fetching error data:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AlertGenerator } from '../src/services/alert-generator';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // const supabase = createClient<Database>(
    //   process.env.SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_KEY!
    // );

    const alertGenerator = new AlertGenerator();

    if (req.method === 'GET') {
      // Get active alerts
      const alerts = await alertGenerator.getActiveAlerts();
      const sortedAlerts = alertGenerator.sortByPriority(alerts);

      return res.status(200).json({
        success: true,
        alerts: sortedAlerts,
        count: sortedAlerts.length,
      });
    }

    if (req.method === 'POST') {
      const { action, alertId } = req.body;

      if (action === 'resolve' && alertId) {
        await alertGenerator.resolveAlert(alertId);
        
        return res.status(200).json({
          success: true,
          message: 'Alert resolved successfully',
        });
      }

      return res.status(400).json({
        error: 'Invalid action or missing alertId',
      });
    }
  } catch (error) {
    console.error('Error handling alerts:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
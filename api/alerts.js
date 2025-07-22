const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, return mock alerts since AlertGenerator requires compilation
    const mockAlerts = [
      {
        id: '1',
        type: 'low_ticket_sales',
        severity: 'medium',
        title: 'Low Ticket Sales',
        message: 'Ticket sales are 30% below average for upcoming events',
        created_at: new Date().toISOString(),
        resolved_at: null,
        action_suggestions: [
          {
            action: 'create_promo_code',
            description: 'Create a 20% discount code for the next 48 hours',
            estimated_impact: 'Could increase sales by 15-25%',
          },
        ],
      },
    ];

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        alerts: mockAlerts,
        count: mockAlerts.length,
      });
    }

    if (req.method === 'POST') {
      const { action, alertId } = req.body;

      if (action === 'resolve' && alertId) {
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
      error: error.message || 'Internal server error',
    });
  }
};

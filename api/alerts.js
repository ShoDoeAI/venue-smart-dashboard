"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const alert_generator_1 = require("../src/services/alert-generator");
async function handler(req, res) {
    // Only allow GET and POST methods
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        // const supabase = createClient<Database>(
        //   process.env.SUPABASE_URL!,
        //   process.env.SUPABASE_SERVICE_KEY!
        // );
        const alertGenerator = new alert_generator_1.AlertGenerator();
        if (req.method === 'GET') {
            // Get active alerts
            const alerts = await alertGenerator.getActiveAlerts();
            const sortedAlerts = alertGenerator.sortByPriority(alerts);
            res.status(200).json({
                success: true,
                alerts: sortedAlerts,
                count: sortedAlerts.length,
            });
            return;
        }
        if (req.method === 'POST') {
            const { action, alertId } = req.body;
            if (action === 'resolve' && alertId) {
                await alertGenerator.resolveAlert(alertId);
                res.status(200).json({
                    success: true,
                    message: 'Alert resolved successfully',
                });
                return;
            }
            res.status(400).json({
                error: 'Invalid action or missing alertId',
            });
            return;
        }
    }
    catch (error) {
        console.error('Error handling alerts:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
        return;
    }
}
//# sourceMappingURL=alerts.js.map
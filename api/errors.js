"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const error_isolation_1 = require("../src/services/error-isolation");
async function handler(req, res) {
    // Only allow GET method
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const errorService = new error_isolation_1.ErrorIsolationService();
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
        const errors = await errorService.getRecentErrors(source, parseInt(limit, 10));
        return res.status(200).json({
            success: true,
            errors,
            count: errors.length,
        });
    }
    catch (error) {
        console.error('Error fetching error data:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
}
//# sourceMappingURL=errors.js.map
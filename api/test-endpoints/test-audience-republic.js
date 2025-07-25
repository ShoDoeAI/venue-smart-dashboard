"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const audience_republic_connector_1 = require("@venuesync/shared/connectors/audience-republic/audience-republic-connector");
/**
 * Test endpoint for Audience Republic connector
 * Note: This is a placeholder implementation.
 * Contact support@audiencerepublic.com for API access.
 */
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        // Get API key from environment or request
        const apiKey = process.env.AUDIENCE_REPUBLIC_API_KEY || 'demo-api-key';
        const config = {
            credentials: {
                apiKey,
            },
            options: {
                timeout: 10000,
                retryAttempts: 2,
            },
        };
        const connector = new audience_republic_connector_1.AudienceRepublicConnector(config);
        // Test connection
        console.log('Testing Audience Republic connection...');
        const connectionResult = await connector.testConnection();
        if (!connectionResult.success) {
            return res.status(200).json({
                status: 'API Not Available',
                message: 'Audience Republic API is not configured. Contact support@audiencerepublic.com for API access.',
                service: 'AudienceRepublic',
                connectionTest: connectionResult,
                placeholderImplementation: true,
                suggestedIntegrations: [
                    'Email campaign performance tracking',
                    'SMS marketing analytics',
                    'Customer engagement metrics',
                    'Event promotion ROI',
                    'Automated campaign triggers',
                ],
            });
        }
        // If connection succeeds (unlikely with placeholder), fetch data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const dataResult = await connector.fetchAllData(startDate, endDate);
        return res.status(200).json({
            status: 'success',
            service: 'AudienceRepublic',
            connectionTest: connectionResult,
            data: dataResult.success ? dataResult.data : null,
            error: dataResult.error,
            dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            },
        });
    }
    catch (error) {
        console.error('Audience Republic test error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
            service: 'AudienceRepublic',
        });
    }
}
//# sourceMappingURL=test-audience-republic.js.map
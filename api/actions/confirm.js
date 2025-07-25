"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const action_confirmation_1 = require("../../src/services/action-confirmation");
/**
 * Confirm or reject action endpoint
 * POST /api/actions/confirm
 */
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { confirmationId, action, userId, notes, reason } = req.body;
        if (!confirmationId || !action || !userId) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }
        if (action !== 'confirm' && action !== 'reject') {
            return res.status(400).json({
                error: 'Action must be "confirm" or "reject"'
            });
        }
        // Initialize services
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const confirmationService = new action_confirmation_1.ActionConfirmationService(supabase);
        // Process confirmation/rejection
        if (action === 'confirm') {
            await confirmationService.confirmAction(confirmationId, userId, notes);
        }
        else {
            if (!reason) {
                return res.status(400).json({
                    error: 'Rejection reason is required'
                });
            }
            await confirmationService.rejectAction(confirmationId, userId, reason);
        }
        // Get updated confirmation
        const { data: confirmation, error } = await supabase
            .from('action_confirmations')
            .select('*')
            .eq('id', confirmationId)
            .single();
        if (error) {
            throw error;
        }
        return res.status(200).json({
            success: true,
            confirmation,
            message: action === 'confirm'
                ? 'Action confirmed successfully'
                : 'Action rejected successfully',
        });
    }
    catch (error) {
        console.error('Action confirmation error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process confirmation',
        });
    }
}
//# sourceMappingURL=confirm.js.map
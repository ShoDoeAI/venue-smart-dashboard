"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const action_executor_1 = require("../../src/services/action-executor");
/**
 * Execute action endpoint
 * POST /api/actions/execute
 */
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { actionId, confirmationId } = req.body;
        if (!actionId) {
            return res.status(400).json({
                error: 'Action ID is required'
            });
        }
        // Initialize services
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const executor = new action_executor_1.ActionExecutor(supabase);
        // const confirmationService = new ActionConfirmationService(supabase);
        // Get action details
        const { data: action, error: actionError } = await supabase
            .from('actions')
            .select('*')
            .eq('id', actionId)
            .single();
        if (actionError || !action) {
            return res.status(404).json({
                error: 'Action not found'
            });
        }
        // Check if confirmation is required
        if (confirmationId) {
            // Verify confirmation status
            const { data: confirmation, error: confirmError } = await supabase
                .from('action_confirmations')
                .select('*')
                .eq('id', confirmationId)
                .eq('action_id', actionId)
                .single();
            if (confirmError || !confirmation) {
                return res.status(404).json({
                    error: 'Confirmation not found'
                });
            }
            if (confirmation.status !== 'confirmed') {
                return res.status(400).json({
                    error: 'Action not confirmed',
                    status: confirmation.status,
                });
            }
        }
        // Execute the action
        const result = await executor.executeAction(action);
        // Log execution
        await supabase.from('action_executions').insert({
            action_id: actionId,
            confirmation_id: confirmationId,
            result,
            executed_at: result.executedAt,
        });
        return res.status(200).json({
            success: true,
            result,
        });
    }
    catch (error) {
        console.error('Action execution error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to execute action',
        });
    }
}
//# sourceMappingURL=execute.js.map
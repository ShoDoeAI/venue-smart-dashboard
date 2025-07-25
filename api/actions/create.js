"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const action_confirmation_1 = require("../../src/services/action-confirmation");
const uuid_1 = require("uuid");
/**
 * Create action endpoint
 * POST /api/actions/create
 */
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { action, skipConfirmation = false } = req.body;
        if (!action || !action.service || !action.actionType || !action.venueId) {
            return res.status(400).json({
                error: 'Invalid action data'
            });
        }
        // Initialize services
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const confirmationService = new action_confirmation_1.ActionConfirmationService(supabase);
        // Create action with generated ID
        const fullAction = {
            id: (0, uuid_1.v4)(),
            status: 'pending',
            priority: action.priority || 'medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: action.createdBy || 'user',
            ...action,
        };
        // Store action
        const { error: insertError } = await supabase
            .from('actions')
            .insert(fullAction);
        if (insertError) {
            return res.status(500).json({
                error: 'Failed to create action',
                details: insertError.message,
            });
        }
        // Generate confirmation request
        const confirmationRequest = await confirmationService.generateConfirmationRequest(fullAction);
        // Store confirmation request
        const confirmationId = await confirmationService.storeConfirmationRequest(confirmationRequest);
        // Auto-confirm if requested (for testing or trusted actions)
        if (skipConfirmation && !confirmationRequest.requiresApproval) {
            await confirmationService.confirmAction(confirmationId, 'system', 'Auto-confirmed');
        }
        return res.status(201).json({
            success: true,
            action: fullAction,
            confirmation: {
                id: confirmationId,
                ...confirmationRequest,
            },
        });
    }
    catch (error) {
        console.error('Action creation error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create action',
        });
    }
}
//# sourceMappingURL=create.js.map
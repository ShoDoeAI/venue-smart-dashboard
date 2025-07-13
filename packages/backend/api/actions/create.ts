import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ActionConfirmationService } from '../../src/services/action-confirmation';
import type { Database } from '@venuesync/shared/types/database.generated';
import type { VenueSyncAction } from '@venuesync/shared/types/actions';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create action endpoint
 * POST /api/actions/create
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const confirmationService = new ActionConfirmationService(supabase);

    // Create action with generated ID
    const fullAction: VenueSyncAction = {
      id: uuidv4(),
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

  } catch (error) {
    console.error('Action creation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create action',
    });
  }
}
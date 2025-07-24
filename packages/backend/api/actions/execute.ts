import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ActionExecutor } from '../../src/services/action-executor';
import type { Database } from '@venuesync/shared';

/**
 * Execute action endpoint
 * POST /api/actions/execute
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const executor = new ActionExecutor(supabase);
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

  } catch (error) {
    console.error('Action execution error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute action',
    });
  }
}
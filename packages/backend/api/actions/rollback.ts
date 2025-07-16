import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ActionExecutor } from '../../src/services/action-executor';
import type { Database } from '@venuesync/shared';

/**
 * Rollback action endpoint
 * POST /api/actions/rollback
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { actionId, reason, userId } = req.body;

    if (!actionId || !reason || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: actionId, reason, userId' 
      });
    }

    // Initialize services
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const executor = new ActionExecutor(supabase);

    // Get action history
    const { data: actionHistory, error: historyError } = await supabase
      .from('action_history')
      .select('*')
      .eq('action_id', actionId)
      .single();

    if (historyError || !actionHistory) {
      return res.status(404).json({ 
        error: 'Action history not found' 
      });
    }

    // Check if rollback is possible
    if (!actionHistory.rollback_data) {
      return res.status(400).json({ 
        error: 'No rollback data available for this action' 
      });
    }

    // Check if already rolled back
    if (actionHistory.rollbacked_at) {
      return res.status(400).json({ 
        error: 'Action has already been rolled back' 
      });
    }

    // Execute rollback
    const result = await executor.rollbackAction(actionId);

    // Update action history
    await supabase
      .from('action_history')
      .update({
        rollbacked_at: new Date().toISOString(),
        rollback_reason: reason,
        rollbacked_by: userId,
      })
      .eq('action_id', actionId);

    // Update action status
    await supabase
      .from('actions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionId);

    // Log rollback
    await supabase.from('action_rollbacks').insert({
      action_id: actionId,
      reason,
      rollbacked_by: userId,
      rollback_result: result,
      rollbacked_at: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      result,
      message: 'Action rolled back successfully',
    });

  } catch (error) {
    console.error('Action rollback error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rollback action',
    });
  }
}
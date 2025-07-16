import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ActionConfirmationService } from '../../src/services/action-confirmation';
import type { Database } from '@venuesync/shared';

/**
 * Get pending actions endpoint
 * GET /api/actions/pending?venueId=xxx
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { venueId } = req.query;

    if (!venueId) {
      return res.status(400).json({ 
        error: 'Venue ID is required' 
      });
    }

    // Initialize services
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const confirmationService = new ActionConfirmationService(supabase);

    // Get pending confirmations
    const pendingConfirmations = await confirmationService.getPendingConfirmations(
      venueId as string
    );

    // Get action history for context
    const { data: recentActions } = await supabase
      .from('action_history')
      .select('*')
      .eq('action->venueId', venueId)
      .order('executed_at', { ascending: false })
      .limit(10);

    // Get failed actions that might need attention
    const { data: failedActions } = await supabase
      .from('actions')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(5);

    return res.status(200).json({
      success: true,
      pending: pendingConfirmations,
      recentExecutions: recentActions || [],
      failedActions: failedActions || [],
      summary: {
        pendingCount: pendingConfirmations.length,
        requiresApproval: pendingConfirmations.filter(c => c.requires_approval).length,
        expiringSoon: pendingConfirmations.filter(c => {
          if (!c.expires_at) return false;
          const expiresIn = new Date(c.expires_at).getTime() - Date.now();
          return expiresIn < 5 * 60 * 1000; // 5 minutes
        }).length,
      },
    });

  } catch (error) {
    console.error('Get pending actions error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending actions',
    });
  }
}
/* eslint-disable */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('[TRIGGER] Starting Toast sync...');

    // Call the sync endpoint
    const syncUrl = `${req.headers.origin || 'https://' + req.headers.host}/api/sync-missing-months`;

    const syncResponse = await fetch(syncUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResponse.status} ${syncResponse.statusText}`);
    }

    const syncResult = await syncResponse.json();

    res.status(200).json({
      success: true,
      message: 'Toast sync triggered successfully',
      syncResult,
    });
  } catch (error) {
    console.error('[TRIGGER] Error:', error);
    res.status(500).json({
      error: 'Failed to trigger sync',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

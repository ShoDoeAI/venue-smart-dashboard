import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import { AIContextAggregatorToast } from '../src/services/ai-context-aggregator-toast';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { date } = req.body as { date?: string };
    
    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Initialize context aggregator
    const contextAggregator = new AIContextAggregatorToast(supabase);
    
    // Parse the date
    const targetDate = new Date(date);
    const venueId = 'f3e07046-d1f9-4eb6-a0a9-b8e123f3a456'; // Default venue
    
    // Build context for specific date
    const context = await contextAggregator.buildEnhancedContext(
      venueId,
      'revenue',
      targetDate,
      targetDate
    );
    
    // Extract Toast analytics
    const toastAnalytics = (context as any).toastAnalytics;
    
    res.status(200).json({
      success: true,
      date,
      queryRange: {
        start: targetDate.toISOString(),
        end: targetDate.toISOString(),
      },
      contextKeys: Object.keys(context),
      hasToastAnalytics: !!toastAnalytics,
      toastAnalytics: toastAnalytics || null,
      summary: {
        totalRevenue: toastAnalytics?.totalRevenue || 0,
        dailyBreakdownCount: toastAnalytics?.dailyBreakdown?.length || 0,
        noDataFound: toastAnalytics?.noDataFound || false,
        queryPeriod: toastAnalytics?.queryPeriod || null,
      },
    });
  } catch (error) {
    console.error('Test context error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
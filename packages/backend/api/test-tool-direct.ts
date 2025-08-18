import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ClaudeRevenueTool } from '../src/services/claude-revenue-tool';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const tool = new ClaudeRevenueTool(supabase);
    
    // Test the tool directly
    const result = await tool.queryRevenue({
      query: "July 2025",
      venueId: undefined
    });

    return res.status(200).json({
      success: true,
      message: 'Direct tool test',
      result,
      toolDefinition: ClaudeRevenueTool.getToolDefinition()
    });
  } catch (error) {
    console.error('Test tool error:', error);
    return res.status(500).json({
      error: 'Failed to test tool',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
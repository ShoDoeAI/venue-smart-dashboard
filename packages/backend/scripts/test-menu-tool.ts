import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import { ClaudeMenuTool } from '../src/services/claude-menu-tool';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function testMenuTool() {
  console.log('🍔 Testing ClaudeMenuTool\n');
  
  const menuTool = new ClaudeMenuTool(supabase);
  
  const testQueries = [
    "What was the best selling item in August 2025?",
    "Show me top 5 menu items this month",
    "Menu performance for last week"
  ];
  
  for (const query of testQueries) {
    console.log(`\nQuery: "${query}"`);
    console.log('=' + '='.repeat(50));
    
    try {
      const result = await menuTool.queryMenu({
        query,
        venueId: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c'
      });
      
      if (result.success) {
        console.log('✅ Success!');
        console.log(`Total items: ${result.data?.totalItems}`);
        console.log(`Total revenue: $${result.data?.totalRevenue?.toFixed(2)}`);
        console.log(`Query interpretation: ${result.data?.queryInterpretation}`);
        
        if (result.data?.topSellingItems && result.data.topSellingItems.length > 0) {
          console.log('\nTop items:');
          result.data.topSellingItems.slice(0, 3).forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.itemName} - ${item.quantitySold} sold, $${item.revenue.toFixed(2)}`);
          });
        }
        
        if (result.data?.insights && result.data.insights.length > 0) {
          console.log('\nInsights:');
          result.data.insights.forEach(insight => {
            console.log(`  - ${insight}`);
          });
        }
      } else {
        console.log('❌ Error:', result.error);
      }
    } catch (err) {
      console.error('❌ Exception:', err);
    }
  }
}

testMenuTool().catch(console.error);
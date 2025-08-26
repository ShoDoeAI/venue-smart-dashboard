import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import { ClaudeAI } from '../src/services/claude-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!supabaseUrl || !supabaseKey || !anthropicKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function testClaudeDirectly() {
  console.log('🤖 Testing Claude AI Menu Queries Directly\n');
  
  const claude = new ClaudeAI(supabase, anthropicKey);
  
  const testQueries = [
    "What's the best seller?",
    "Show me top items",
    "Best selling drinks",
    "What menu items sold well last week?",
    "What food is popular?"
  ];
  
  const venueId = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
  
  for (const query of testQueries) {
    console.log(`\nQuery: "${query}"`);
    console.log('='.repeat(60));
    
    try {
      const response = await claude.processMessageWithTools(
        query,
        venueId
      );
      
      const responseText = response.message.toLowerCase();
      const hasMenuData = /genny|high noon|beer|wine|item|sold \d+/.test(responseText) &&
                         !/don't have access|cannot access/.test(responseText);
      
      if (hasMenuData) {
        console.log('✅ Menu tool used successfully!');
        console.log('Response preview:', response.message.substring(0, 200) + '...');
      } else {
        console.log('❌ Menu tool NOT used');
        console.log('Response:', response.message.substring(0, 150) + '...');
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    // Wait between queries to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testClaudeDirectly().catch(console.error);
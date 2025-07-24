require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyToastSchema() {
  console.log('🔧 Applying Comprehensive Toast Schema to Supabase\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20240113_toast_comprehensive_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('1️⃣ Reading migration file...');
    console.log('   ✅ Migration file loaded');
    
    console.log('\n2️⃣ Applying schema to database...');
    console.log('   This will create the following tables:');
    console.log('   - toast_orders (main orders table)');
    console.log('   - toast_checks (guest bills)');
    console.log('   - toast_payments (payment transactions)');
    console.log('   - toast_selections (menu items ordered)');
    console.log('   - toast_menu_items (menu catalog)');
    console.log('   - toast_employees (staff information)');
    console.log('   - toast_restaurant_info (restaurant details)');
    console.log('   - toast_transactions (view for backward compatibility)');
    
    // Execute the migration
    // Note: Supabase doesn't support direct SQL execution through the client library
    // You'll need to run this through the Supabase SQL editor
    
    console.log('\n⚠️  IMPORTANT: Supabase client doesn\'t support direct SQL execution.');
    console.log('\n📋 To apply this schema:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log(`   ${migrationPath}`);
    console.log('4. Execute the SQL');
    
    console.log('\n🔗 Direct link to SQL Editor:');
    console.log(`   ${process.env.SUPABASE_URL.replace('.supabase.co', '.supabase.com')}/project/default/sql`);
    
    // Check if tables already exist
    console.log('\n3️⃣ Checking current tables...');
    
    const tables = [
      'toast_orders',
      'toast_checks', 
      'toast_payments',
      'toast_selections',
      'toast_menu_items',
      'toast_employees',
      'toast_restaurant_info'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error && error.code === '42P01') {
        console.log(`   ❌ ${table} - Does not exist`);
      } else if (error) {
        console.log(`   ⚠️  ${table} - Error: ${error.message}`);
      } else {
        console.log(`   ✅ ${table} - Exists with ${count || 0} records`);
      }
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Apply the schema using Supabase SQL Editor');
    console.log('2. Run: node sync-toast-comprehensive.js');
    console.log('3. Your data will be stored in the new normalized structure');
    
    // Save SQL to clipboard if possible (macOS only)
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec(`cat "${migrationPath}" | pbcopy`, (error) => {
        if (!error) {
          console.log('\n✨ Migration SQL has been copied to your clipboard!');
        }
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the check
applyToastSchema();
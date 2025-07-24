#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.');
  process.exit(1);
}

if (!process.env.TOAST_CLIENT_ID || !process.env.TOAST_CLIENT_SECRET || !process.env.TOAST_LOCATION_GUID) {
  console.error('❌ Missing Toast credentials. Make sure these environment variables are set:');
  console.error('   - TOAST_CLIENT_ID');
  console.error('   - TOAST_CLIENT_SECRET');
  console.error('   - TOAST_LOCATION_GUID');
  console.error('   - TOAST_ENVIRONMENT (optional, defaults to "production")');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupToastCredentials() {
  console.log('🔧 Setting up Toast POS credentials...\n');

  try {
    // 1. Get or create venue
    console.log('1️⃣  Finding venue...');
    let { data: venues, error: venueError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);

    if (venueError || !venues || venues.length === 0) {
      console.log('   Creating default venue...');
      const { data: newVenue, error: createError } = await supabase
        .from('venues')
        .insert({
          name: 'VenueSync Demo',
          timezone: 'America/Los_Angeles',
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create venue: ${createError.message}`);
      }
      venues = [newVenue];
    }

    const venue = venues[0];
    console.log(`✅ Using venue: ${venue.name} (ID: ${venue.id})`);

    // 2. Prepare Toast credentials
    const toastCredentials = {
      clientId: process.env.TOAST_CLIENT_ID,
      clientSecret: process.env.TOAST_CLIENT_SECRET,
      locationGuid: process.env.TOAST_LOCATION_GUID,
      environment: process.env.TOAST_ENVIRONMENT || 'production'
    };

    console.log('\n2️⃣  Configuring Toast credentials...');
    console.log(`   Environment: ${toastCredentials.environment}`);
    console.log(`   Location GUID: ${toastCredentials.locationGuid}`);

    // 3. Check if credentials already exist
    const { data: existingCreds, error: checkError } = await supabase
      .from('api_credentials')
      .select('id')
      .eq('service', 'toast')
      .eq('venue_id', venue.id)
      .single();

    if (existingCreds) {
      // Update existing credentials
      console.log('   Updating existing credentials...');
      const { error: updateError } = await supabase
        .from('api_credentials')
        .update({
          credentials: toastCredentials,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCreds.id);

      if (updateError) {
        throw new Error(`Failed to update credentials: ${updateError.message}`);
      }
      console.log('✅ Toast credentials updated successfully!');
    } else {
      // Insert new credentials
      console.log('   Creating new credentials...');
      const { error: insertError } = await supabase
        .from('api_credentials')
        .insert({
          service: 'toast',
          venue_id: venue.id,
          credentials: toastCredentials,
          is_active: true
        });

      if (insertError) {
        throw new Error(`Failed to insert credentials: ${insertError.message}`);
      }
      console.log('✅ Toast credentials created successfully!');
    }

    // 4. Initialize sync status
    console.log('\n3️⃣  Initializing sync status...');
    const { error: syncError } = await supabase
      .from('api_sync_status')
      .upsert({
        venue_id: venue.id,
        service: 'toast',
        sync_frequency_minutes: 180, // 3 hours
        is_syncing: false
      }, {
        onConflict: 'venue_id,service'
      });

    if (syncError) {
      console.warn('⚠️  Could not initialize sync status:', syncError.message);
    } else {
      console.log('✅ Sync status initialized');
    }

    // 5. Test connection (optional)
    console.log('\n4️⃣  Next steps:');
    console.log('   1. Deploy to Vercel: vercel --prod');
    console.log('   2. Set environment variables in Vercel:');
    console.log('      vercel env add TOAST_CLIENT_ID');
    console.log('      vercel env add TOAST_CLIENT_SECRET');
    console.log('      vercel env add TOAST_LOCATION_GUID');
    console.log('      vercel env add TOAST_ENVIRONMENT');
    console.log('   3. Trigger the cron job manually:');
    console.log('      curl -X POST https://your-app.vercel.app/api/cron/fetch-data \\');
    console.log('        -H "Authorization: Bearer $CRON_SECRET"');
    console.log('\n✅ Toast credentials setup complete!');

  } catch (error) {
    console.error('❌ Error setting up Toast credentials:', error);
    process.exit(1);
  }
}

// Run the setup
setupToastCredentials();
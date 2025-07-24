import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function setupVenue() {
  console.log('🏪 Setting up Jack\'s on Water Street in the database...\n');

  try {
    // Check if venue exists
    const { data: existingVenue } = await supabase
      .from('venues')
      .select('*')
      .eq('id', 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c')
      .single();

    if (existingVenue) {
      console.log('✅ Venue already exists:', existingVenue.name);
      return;
    }

    // Create venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .insert({
        id: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
        name: 'Jack\'s on Water Street',
        type: 'restaurant',
        is_active: true,
        settings: {
          timezone: 'America/New_York',
          capacity: 150,
          defaultLocationId: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c'
        }
      })
      .select()
      .single();

    if (venueError) {
      console.error('❌ Error creating venue:', venueError);
      return;
    }

    console.log('✅ Venue created successfully:', venue.name);

    // Check if Toast credentials exist
    const { data: existingCreds } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c')
      .eq('service', 'toast')
      .single();

    if (existingCreds) {
      console.log('✅ Toast credentials already configured');
      return;
    }

    // Add Toast credentials
    const { error: credsError } = await supabase
      .from('api_credentials')
      .insert({
        venue_id: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
        service: 'toast',
        api_key: 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7',
        is_active: true,
        credentials: {
          clientId: 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7',
          clientSecret: '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4',
          locationGuid: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
          environment: 'production'
        }
      });

    if (credsError) {
      console.error('❌ Error adding Toast credentials:', credsError);
      return;
    }

    console.log('✅ Toast credentials added successfully');
    console.log('\n🎉 Setup complete! Jack\'s on Water Street is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Run the cron job to fetch initial data: pnpm run fetch-data');
    console.log('2. Start the development server: pnpm dev');
    console.log('3. Visit http://localhost:5173 to see the dashboard');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupVenue();
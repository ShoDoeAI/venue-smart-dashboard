require('dotenv').config({ path: '.env.local' });

console.log('Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
console.log('TOAST_CLIENT_ID:', process.env.TOAST_CLIENT_ID ? '✓ Set' : '✗ Missing');
console.log('TOAST_CLIENT_SECRET:', process.env.TOAST_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
console.log('TOAST_LOCATION_ID:', process.env.TOAST_LOCATION_ID ? '✓ Set' : '✗ Missing');

console.log('\nPackages Check:');
try {
  require('@supabase/supabase-js');
  console.log('@supabase/supabase-js: ✓ Installed');
} catch (e) {
  console.log('@supabase/supabase-js: ✗ Not installed');
}

try {
  require('axios');
  console.log('axios: ✓ Installed');
} catch (e) {
  console.log('axios: ✗ Not installed');
}

console.log('\nReady to run sync-toast-now.js!');
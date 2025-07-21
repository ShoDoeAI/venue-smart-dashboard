#!/bin/bash

# Add environment variables to Vercel
echo "🔧 Adding environment variables to Vercel..."

# Supabase
vercel env add SUPABASE_URL production --token Nvj3ISOIKlSqIXJD5nqlX760 <<< "https://bmhplnojfuznflbyqqze.supabase.co"
vercel env add SUPABASE_SERVICE_KEY production --token Nvj3ISOIKlSqIXJD5nqlX760 <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY"
vercel env add SUPABASE_ANON_KEY production --token Nvj3ISOIKlSqIXJD5nqlX760 <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho"

# Frontend variables
vercel env add VITE_SUPABASE_URL production --token Nvj3ISOIKlSqIXJD5nqlX760 <<< "https://bmhplnojfuznflbyqqze.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY production --token Nvj3ISOIKlSqIXJD5nqlX760 <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho"

# Anthropic
vercel env add ANTHROPIC_API_KEY production --token Nvj3ISOIKlSqIXJD5nqlX760 <<< "YOUR_ANTHROPIC_API_KEY_HERE"

# Cron secret
vercel env add CRON_SECRET production --token Nvj3ISOIKlSqIXJD5nqlX760 <<< "dev-cron-secret-2025"

echo "✅ Environment variables added!"
echo ""
echo "🚀 Now deploying to production..."
vercel --prod --token Nvj3ISOIKlSqIXJD5nqlX760
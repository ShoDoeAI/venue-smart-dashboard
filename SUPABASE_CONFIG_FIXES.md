# 🔧 Supabase Configuration Fixes

## Issues Found:

1. **Wrong variable names**: Using `NEXT_PUBLIC_` prefix instead of `VITE_` for frontend
2. **Missing backend variables**: Need both regular and VITE_ prefixed variables
3. **Old API names**: Still using "SQUARE" instead of "TOAST"
4. **Service key exposure**: Service key should NEVER be in frontend

## Your Actual Supabase Project:
- **Project ID**: `bmhplnojfuznflbyqqze`
- **Project URL**: `https://bmhplnojfuznflbyqqze.supabase.co`
- **Dashboard**: https://app.supabase.com/project/bmhplnojfuznflbyqqze

## Quick Fix:

1. **Replace your .env.local**:
```bash
# Backup current file
mv .env.local .env.local.backup

# Use the corrected version
mv .env.local.corrected .env.local
```

2. **Update your actual API keys** in the new .env.local:
- Replace `your_anthropic_api_key` with your real Anthropic key
- Replace `your_toast_access_token` with your real Toast token
- Add any other API keys you have

## Critical Variable Names:

### ❌ WRONG (Next.js style):
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### ✅ CORRECT (Vite style):
```env
# For backend (Vercel Functions)
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# For frontend (React/Vite)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## For Vercel Dashboard:

Add these environment variables in Vercel settings:

```env
# Backend (Vercel Functions)
SUPABASE_URL=https://bmhplnojfuznflbyqqze.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho

# Frontend (React app)
VITE_SUPABASE_URL=https://bmhplnojfuznflbyqqze.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyODU5MTcsImV4cCI6MjA2Nzg2MTkxN30.5tijREpPkdjWCFcI6zO9OfUrKhHOb-DWjU9tKSXdqho

# Add your other API keys...
```

## Security Note:
⚠️ **NEVER expose SUPABASE_SERVICE_KEY in frontend code!**
- Only use it in backend/server-side code
- Frontend should only use VITE_SUPABASE_ANON_KEY

## Testing the Fix:

1. **Test locally**:
```bash
pnpm run dev
```

2. **Check in browser console**:
```javascript
// Should work:
console.log(import.meta.env.VITE_SUPABASE_URL)

// Should be undefined (good!):
console.log(import.meta.env.SUPABASE_SERVICE_KEY)
```

## Summary:
- Your Supabase project reference is `bmhplnojfuznflbyqqze`
- Use `VITE_` prefix for all frontend environment variables
- Keep service keys backend-only
- Update Toast API variables (not Square)
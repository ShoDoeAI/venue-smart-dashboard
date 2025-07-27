import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Check all Supabase-related env vars
  const supabaseVars = Object.keys(process.env)
    .filter(key => key.includes('SUPABASE') || key.includes('POSTGRES'))
    .reduce((acc, key) => {
      acc[key] = process.env[key] ? 'Set' : 'Missing';
      return acc;
    }, {} as Record<string, string>);

  return res.status(200).json({
    success: true,
    supabaseVars,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    possibleKeys: Object.keys(process.env)
      .filter(key => key.includes('KEY') || key.includes('SECRET'))
      .map(key => ({ key, exists: !!process.env[key] }))
  });
}
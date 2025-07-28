import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  
  if (!supabaseUrl) {
    return res.status(400).json({
      success: false,
      error: 'No Supabase URL found'
    });
  }

  // Extract project reference from Supabase URL
  // Format: https://[project-ref].supabase.co
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  
  if (!match) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Supabase URL format',
      url: supabaseUrl
    });
  }

  const projectRef = match[1];
  
  // Construct the database URL format
  // This is the standard format for Supabase PostgreSQL connections
  const dbInfo = {
    projectRef,
    supabaseUrl,
    instructions: [
      '1. Go to https://app.supabase.com/project/' + projectRef + '/settings/database',
      '2. Under "Connection string", click "URI" tab',
      '3. Copy the connection string (it starts with postgresql://)',
      '4. Go to your Vercel dashboard',
      '5. Navigate to Settings > Environment Variables',
      '6. Add a new variable:',
      '   - Name: DATABASE_URL',
      '   - Value: [paste the connection string]',
      '   - Environment: Production, Preview, Development',
      '7. Save and redeploy'
    ],
    alternativeMethod: {
      description: 'If Vercel integrated Supabase, the database URL might be available as:',
      possibleVarNames: [
        'POSTGRES_URL',
        'POSTGRES_PRISMA_URL',
        'POSTGRES_URL_NON_POOLING'
      ],
      checkVercelIntegration: 'Go to Vercel dashboard > Integrations > Supabase to check if database URLs were added'
    }
  };

  return res.status(200).json({
    success: true,
    ...dbInfo
  });
}
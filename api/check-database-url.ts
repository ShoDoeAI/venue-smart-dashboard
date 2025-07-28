import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const dbVars = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    POSTGRES_URL_NO_SSL: !!process.env.POSTGRES_URL_NO_SSL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_USER: !!process.env.POSTGRES_USER,
    POSTGRES_HOST: !!process.env.POSTGRES_HOST,
    POSTGRES_PASSWORD: !!process.env.POSTGRES_PASSWORD,
    POSTGRES_DATABASE: !!process.env.POSTGRES_DATABASE,
  };

  // Check which one has a value
  const activeUrl = process.env.DATABASE_URL ? 'DATABASE_URL' : 
                   process.env.POSTGRES_URL ? 'POSTGRES_URL' :
                   process.env.POSTGRES_URL_NON_POOLING ? 'POSTGRES_URL_NON_POOLING' :
                   'NONE';

  return res.status(200).json({
    success: true,
    dbVars,
    activeUrl,
    hasDirectDbAccess: activeUrl !== 'NONE'
  });
}
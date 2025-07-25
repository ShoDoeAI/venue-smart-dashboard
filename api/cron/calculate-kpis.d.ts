import type { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * Vercel Cron job to calculate KPIs and generate analytics
 * Runs daily at 1 AM: "0 1 * * *"
 */
export default function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse>;
//# sourceMappingURL=calculate-kpis.d.ts.map
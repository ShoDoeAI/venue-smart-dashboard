import type { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * Vercel Cron job to cleanup old snapshots
 * Runs weekly on Sunday at 3 AM: "0 3 * * 0"
 */
export default function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse>;
//# sourceMappingURL=cleanup-snapshots.d.ts.map
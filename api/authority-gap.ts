// WO-7 — Source Attribution & Authority Gap report from sweep runs.
// POST { domain, runs: [{ engine, sources[], queryType? }] }
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { aggregateAuthorityGap } from '../src/lib/authorityGap.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const domain: string = (body.domain || '').trim();
    const runs = body.runs || [];
    if (!domain) return res.status(400).json({ error: 'domain is required' });
    return res.status(200).json(aggregateAuthorityGap(runs, domain));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'authority-gap failed' });
  }
}

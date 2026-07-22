// WO-4 — Crawl-vs-Cite Pick Rate. GET /api/pick-rate?domain=&days=30
// Joins WO-3 crawl counts (bot_hits, by AI company) with the latest WO-1 sweep's
// per-engine citation-win %. Heavy crawling != endorsement (see caption).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { computePickRate } from '../src/lib/pickRate.js';

// Map sweep engine keys → the AI-company label used in bot_hits.engine.
const ENGINE_COMPANY: Record<string, string> = {
  claude: 'Anthropic (Claude)',
  openai: 'OpenAI (ChatGPT)',
  perplexity: 'Perplexity',
  gemini: 'Google (Gemini)',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const domain = String(req.query.domain || '').replace(/^www\./, '').toLowerCase();
  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
  if (!domain) return res.status(400).json({ error: 'domain is required' });

  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey) return res.status(200).json({ domain, configured: false, ...computePickRate({}, {}) });
  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // Crawl counts by company (bot_hits.engine).
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  const hitsRes = await fetch(
    `${supaUrl}/rest/v1/bot_hits?host=eq.${encodeURIComponent(domain)}&created_at=gte.${encodeURIComponent(cutoff)}&select=engine&limit=50000`,
    { headers: H }
  );
  const crawlByCompany: Record<string, number> = {};
  if (hitsRes.ok) for (const row of await hitsRes.json()) crawlByCompany[row.engine] = (crawlByCompany[row.engine] || 0) + 1;

  // Latest sweep's per-engine citation win %.
  const sweepRes = await fetch(
    `${supaUrl}/rest/v1/citation_sweeps?domain=eq.${encodeURIComponent(domain)}&order=created_at.desc&limit=1`,
    { headers: H }
  );
  const citeByCompany: Record<string, number | null> = {};
  if (sweepRes.ok) {
    const [sweep] = await sweepRes.json();
    for (const e of sweep?.summary?.engines || []) {
      const company = ENGINE_COMPANY[e.engine] || e.engine;
      citeByCompany[company] = e.citationWinPct;
    }
  }

  return res.status(200).json({ domain, days, configured: true, ...computePickRate(crawlByCompany, citeByCompany) });
}

// WO-3 — AI crawler telemetry dashboard data.
// GET /api/bot-stats?domain=example.com&days=30
// Returns hits/day (by tier), tier totals, per-bot table (with last hit), and
// the most-crawled pages. Aggregated server-side from the bot_hits table.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TIER_DEFINITIONS } from '../src/lib/botClassify';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const domain = String(req.query.domain || '').replace(/^www\./, '').toLowerCase();
  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
  if (!domain) return res.status(400).json({ error: 'domain is required' });

  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey) {
    return res.status(200).json({ domain, days, configured: false, tierDefinitions: TIER_DEFINITIONS, hitsPerDay: [], tierTotals: {}, perBot: [], topPages: [], totalHits: 0 });
  }

  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  const url =
    `${supaUrl}/rest/v1/bot_hits?host=eq.${encodeURIComponent(domain)}` +
    `&created_at=gte.${encodeURIComponent(cutoff)}&order=created_at.desc&limit=20000`;

  const r = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!r.ok) return res.status(502).json({ error: `bot_hits query failed: ${r.status}` });
  const rows: any[] = await r.json();

  const tierTotals: Record<string, number> = { live: 0, search: 0, training: 0 };
  const perDay = new Map<string, Record<string, number>>();
  const perBot = new Map<string, { bot_token: string; engine: string; tier: string; count: number; lastHit: string }>();
  const perPage = new Map<string, number>();

  for (const row of rows) {
    const day = String(row.created_at).slice(0, 10);
    tierTotals[row.tier] = (tierTotals[row.tier] || 0) + 1;

    const d = perDay.get(day) || { live: 0, search: 0, training: 0 };
    d[row.tier] = (d[row.tier] || 0) + 1;
    perDay.set(day, d);

    const b = perBot.get(row.bot_token) || { bot_token: row.bot_token, engine: row.engine, tier: row.tier, count: 0, lastHit: row.created_at };
    b.count++;
    if (row.created_at > b.lastHit) b.lastHit = row.created_at;
    perBot.set(row.bot_token, b);

    perPage.set(row.path, (perPage.get(row.path) || 0) + 1);
  }

  const hitsPerDay = [...perDay.entries()]
    .map(([date, tiers]) => ({ date, ...tiers }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const bots = [...perBot.values()].sort((a, b) => b.count - a.count);
  const topPages = [...perPage.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 20);

  return res.status(200).json({
    domain, days, configured: true,
    tierDefinitions: TIER_DEFINITIONS,
    totalHits: rows.length,
    tierTotals, hitsPerDay, perBot: bots, topPages,
  });
}

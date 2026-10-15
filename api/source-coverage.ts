// WO-AEO-REPORT-SOURCE-COVERAGE-012 B8 — run Source coverage for a stored sweep.
//
// POST { sweepId }. Called by the app at the end of every new sweep and by the "Check source
// coverage" action on a saved one. Paid tiers only (free is refused, as for sweeps). The caller
// must own the sweep (admin excepted). The result is stored on the sweep, dated by its fetch, not
// by the sweep. No engine call; no count or cost goes back to the customer beyond the table itself.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isPaidRequest } from './_lib/entitlement.js';
import { runSourceCoverage, SOURCE_COVERAGE_UA } from './_lib/sourceFetch.js';
import { extractSiteFacts } from '../src/lib/truthRecord.js';
import type { SweepRunResult } from '../src/lib/citationSweep.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body: any = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { return res.status(400).json({ error: 'sweepId is required' }); }
  const sweepId = String(body.sweepId || '');
  if (!/^[0-9a-f-]{36}$/i.test(sweepId)) return res.status(400).json({ error: 'sweepId is required' });

  const ent = await isPaidRequest(req);
  if (!ent.paid) return res.status(402).json({ error: 'Source coverage is part of a paid Citation Sweep. Start a Day Pass or a plan to run one.' });

  const url = process.env.VITE_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Source coverage is not available right now.' });
  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const T = () => AbortSignal.timeout(10_000);

  let sweep: any, rows: any[];
  try {
    [sweep] = await (await fetch(`${url}/rest/v1/citation_sweeps?id=eq.${sweepId}&select=id,user_id,domain,brand,full_result,owned_domains`, { headers: H, signal: T() })).json().catch(() => []);
    if (!sweep) return res.status(404).json({ error: 'Sweep not found.' });
    if (!ent.admin && sweep.user_id !== ent.userId) return res.status(404).json({ error: 'Sweep not found.' });
    rows = await (await fetch(`${url}/rest/v1/sweep_results?sweep_id=eq.${sweepId}&select=engine,query,query_type,run_index,transcript,sources,truncated,grounding`, { headers: H, signal: T() })).json().catch(() => []);
  } catch {
    return res.status(503).json({ error: 'Source coverage is not available right now.' });
  }
  const runs: SweepRunResult[] = (Array.isArray(rows) ? rows : []).map((r) => ({
    engine: r.engine, query: r.query, queryType: r.query_type, runIndex: r.run_index,
    transcript: r.transcript || '', sources: r.sources || [], costUsd: 0,
    truncated: r.truncated ?? undefined, grounding: r.grounding ?? undefined,
  }));

  try {
    const coverage = await runSourceCoverage(runs, sweep.domain, sweep.brand, Array.isArray(sweep.owned_domains) ? sweep.owned_domains : []);
    // WO-014: the customer's own homepage, read once with the same honest user agent, so the
    // step-by-step guide has the site's own description and types as stored data. Best-effort.
    let siteFacts: Record<string, unknown> | null = null;
    try {
      const r = await fetch(`https://${sweep.domain}/`, { headers: { 'User-Agent': SOURCE_COVERAGE_UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(10_000) });
      if (r.ok) siteFacts = { ...extractSiteFacts(await r.text()), fetchedAt: new Date().toISOString() };
    } catch { /* keep any earlier facts */ }
    const fullResult = { ...(sweep.full_result || {}), sourceCoverage: coverage, ...(siteFacts ? { siteFacts } : {}) };
    await fetch(`${url}/rest/v1/citation_sweeps?id=eq.${sweepId}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ full_result: fullResult }), signal: T() });
    return res.status(200).json({ sourceCoverage: coverage, siteFacts: siteFacts ?? sweep.full_result?.siteFacts ?? null });
  } catch (err: any) {
    return res.status(500).json({ error: 'Source coverage could not be completed. Please try again.' });
  }
}

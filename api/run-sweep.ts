// WO-1 — Tested Citation Sweeps: run a query panel across answer engines.
//
// POST body:
//   { domain, brand?, brandedQueries[], categoryQueries[], competitors[],
//     engines?, runsPerQuery?, persist?, userId? }
//
// For each engine × query × run (N=3 default), asks the engine WITH web search
// enabled, scores the answer with the grounded (LLM-free) citation detector, and
// rolls the runs up into the three-layer answer model (retrievability = branded
// cite-rate, citation win = category cite-rate) + a "cited instead" competitor
// list, with a per-sweep cost estimate. Every score is backed by a stored
// transcript (returned, and persisted when a Supabase service key is present).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ENGINE_ADAPTERS, MissingKeyError, configuredEngines, type Engine } from './_lib/engines.js';
import {
  scoreRun,
  aggregateSweep,
  type SweepRunResult,
  type Competitor,
  type QueryType,
} from '../src/lib/citationSweep.js';

// Vercel Fluid Compute allows long runs; a full sweep is many sequential calls.
export const config = { maxDuration: 300 };

const ALL_ENGINES: Engine[] = ['claude', 'openai', 'perplexity', 'gemini'];

const ADMIN_EMAILS = ['lindsay.hiebert@gmail.com', 'liindsay.hiebert@gmail.com'];
// Monthly sweep quota per tier — the real-money spend guardrail. Set so that,
// with a size-capped sweep (~$4 COGS on economical models), gross margin stays
// ≥70% even at max usage: Day Pass ~79%, Pro ~72%, Business ~73%.
const MONTHLY_QUOTA: Record<string, number> = { admin: 100000, Business: 12, Pro: 3, daypass: 1 };
// One paid sweep is bounded by total query-runs (queries × runs) so it both fits
// the serverless timeout (at concurrency 8) AND has predictable cost/margin.
const MAX_QUERY_RUNS_PER_SWEEP = 15;
const MAX_RUNS_PER_SWEEP = 3;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Resolve the caller's access level. Sweeps spend real money, so:
 *  - Paid (Pro/Business/Day Pass) or admin → FULL sweep (all engines, N up to 5,
 *    competitors, transcripts, persisted), subject to a per-tier monthly quota.
 *  - Free / unauthenticated → DOWNGRADED to a near-zero-cost QUICK CHECK
 *    (Gemini-only, 1 branded + 1 category, N=1, not persisted) — a teaser, not a
 *    hard paywall. Only paid users hitting their quota get an error. */
async function resolveAccess(req: VercelRequest): Promise<{ userId: string | null; tier: string; quickCheck: boolean }> {
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const FREE = { userId: null, tier: 'free', quickCheck: true };

  // Admin/service bypass (cron, internal testing).
  const adminToken = process.env.ADMIN_SWEEP_TOKEN;
  if (adminToken && req.headers['x-admin-token'] === adminToken) return { userId: null, tier: 'admin', quickCheck: false };

  const authHeader = String(req.headers['authorization'] || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !supaUrl || !anon || !serviceKey) return FREE; // no session → free quick check

  // Verify the Supabase JWT; an invalid/expired token just gets the free teaser.
  const ures = await fetch(`${supaUrl}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!ures.ok) return FREE;
  const u: any = await ures.json();
  const userId: string = u.id;
  const email = String(u.email || '').toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return { userId, tier: 'admin', quickCheck: false };

  // Look up the user's plan (service role).
  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const rowRes = await fetch(`${supaUrl}/rest/v1/users?id=eq.${userId}&select=subscription_status,report_pass_until`, { headers: H });
  const [row] = rowRes.ok ? await rowRes.json() : [null];
  const sub = row?.subscription_status || 'free';
  const dayPassActive = row?.report_pass_until && new Date(row.report_pass_until) > new Date();
  let tier: string | null = null;
  if (sub === 'Business' || sub === 'Pro') tier = sub;
  else if (dayPassActive) tier = 'daypass';
  if (!tier) return { userId, tier: 'free', quickCheck: true }; // signed-in free user → quick check

  // Paid: enforce the monthly quota (this is the only hard error).
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const cntRes = await fetch(
    `${supaUrl}/rest/v1/citation_sweeps?user_id=eq.${userId}&created_at=gte.${monthStart.toISOString()}&select=id`,
    { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } }
  );
  const used = Number((cntRes.headers.get('content-range') || '0-0/0').split('/')[1] || 0);
  const quota = MONTHLY_QUOTA[tier] ?? 0;
  if (used >= quota) throw new HttpError(429, `Monthly sweep limit reached for your ${tier} plan (${quota}/mo). Upgrade or wait for next month.`);

  return { userId, tier, quickCheck: false };
}

interface Task {
  engine: Engine;
  query: string;
  queryType: QueryType;
  runIndex: number;
}

/** Run async tasks with a bounded concurrency pool (avoids provider rate limits
 *  and serverless memory spikes while keeping the wall-clock down). */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Pre-flight: confirm the domain actually resolves before a paid sweep spends
 *  money/quota on a typo. Any HTTP response (even 403) means the host exists;
 *  only a DNS/connection failure (throw on both attempts) means "unreachable". */
async function domainResolves(domain: string): Promise<boolean> {
  const base = /^https?:\/\//.test(domain) ? domain : `https://${domain}`;
  const try1 = async (u: string, ms: number) => {
    await fetch(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AEOAnalyzers/1.0)' } });
    return true;
  };
  try { return await try1(base, 8000); }
  catch { try { return await try1(base.replace(/^https:/, 'http:'), 6000); } catch { return false; } }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Access gate FIRST — this endpoint spends real money per call. Free/unauthed
  // callers are downgraded to a near-zero-cost quick check (not rejected).
  let access: { userId: string | null; tier: string; quickCheck: boolean };
  try {
    access = await resolveAccess(req);
  } catch (e: any) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    access = { userId: null, tier: 'free', quickCheck: true };
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const domain: string = (body.domain || '').trim();
    const brand: string | undefined = body.brand?.trim() || undefined;
    let brandedQueries: string[] = (body.brandedQueries || []).filter(Boolean);
    let categoryQueries: string[] = (body.categoryQueries || []).filter(Boolean);
    const competitors: Competitor[] = (body.competitors || []).filter((c: any) => c?.name);
    let runsPerQuery: number = Math.max(1, Math.min(5, body.runsPerQuery || 3));
    let persist: boolean = body.persist !== false;
    // Attribute persistence to the authenticated user (not a client-supplied id).
    const userId: string | undefined = access.userId || undefined;

    if (!domain) return res.status(400).json({ error: 'domain is required' });
    if (!brandedQueries.length && !categoryQueries.length) {
      return res.status(400).json({ error: 'at least one branded or category query is required' });
    }

    // Free quick check: Gemini-only, 1 branded + 1 category, N=1, no persist.
    if (access.quickCheck) {
      brandedQueries = brandedQueries.slice(0, 1);
      categoryQueries = categoryQueries.slice(0, 1);
      runsPerQuery = 1;
      persist = false;
    } else if (access.tier !== 'admin') {
      // Bound total query-runs (queries × runs) so the sweep fits the timeout and
      // has predictable cost: e.g. 5 queries × N3, or 15 queries × N1.
      runsPerQuery = Math.min(runsPerQuery, MAX_RUNS_PER_SWEEP);
      const maxQueries = Math.max(1, Math.floor(MAX_QUERY_RUNS_PER_SWEEP / runsPerQuery));
      brandedQueries = brandedQueries.slice(0, maxQueries);
      const remaining = Math.max(0, maxQueries - brandedQueries.length);
      categoryQueries = categoryQueries.slice(0, remaining);
    }

    const configured = configuredEngines();
    const requested: Engine[] = access.quickCheck
      ? (['gemini'] as Engine[])
      : (body.engines?.length ? body.engines : configured).filter((e: Engine) => ALL_ENGINES.includes(e));
    const engines = requested.filter((e) => configured.includes(e));
    const skippedEngines = requested.filter((e) => !configured.includes(e));

    if (!engines.length) {
      return res.status(400).json({
        error: 'no configured engines to run',
        detail: 'Set ANTHROPIC_API_KEY / OPENAI_API_KEY / PERPLEXITY_API_KEY / GEMINI_API_KEY in the environment.',
        configured,
      });
    }

    // Pre-flight for PAID sweeps: a domain that doesn't resolve is almost always
    // a typo — reject BEFORE spending a sweep or counting quota ("No sweep used").
    if (!access.quickCheck) {
      const ok = await domainResolves(domain);
      if (!ok) return res.status(400).json({ error: `We couldn't reach "${domain}" — please check the spelling. No sweep was used.` });
    }

    // Build the full task matrix.
    const tasks: Task[] = [];
    for (const engine of engines) {
      for (const query of brandedQueries)
        for (let r = 0; r < runsPerQuery; r++) tasks.push({ engine, query, queryType: 'branded', runIndex: r });
      for (const query of categoryQueries)
        for (let r = 0; r < runsPerQuery; r++) tasks.push({ engine, query, queryType: 'category', runIndex: r });
    }

    const CONCURRENCY = Number(process.env.SWEEP_CONCURRENCY || 8);
    const runs: SweepRunResult[] = await pool(tasks, CONCURRENCY, async (t) => {
      const base: SweepRunResult = {
        engine: t.engine, query: t.query, queryType: t.queryType, runIndex: t.runIndex,
        transcript: '', sources: [], costUsd: 0,
      };
      try {
        const answer = await ENGINE_ADAPTERS[t.engine](t.query);
        return scoreRun({ ...base, ...answer }, { domain, brand }, competitors);
      } catch (err: any) {
        // Missing key or transient engine error: record a failed run (not cited)
        // so the aggregate stays honest rather than silently dropping the query.
        return scoreRun(
          { ...base, transcript: `[error: ${err?.message || err}]` },
          { domain, brand },
          competitors
        );
      }
    });

    const summary = aggregateSweep(runs, { domain, brand }, competitors);

    let persisted = false;
    if (persist) {
      try {
        persisted = await persistSweep({ domain, brand, userId, summary, runs });
      } catch {
        persisted = false; // never fail the sweep on a persistence error
      }
    }

    // Free quick check: a grounded, single-engine PROVISIONAL read + upgrade CTA.
    let provisional: { score: number; label: string; message: string } | null = null;
    let upgrade: string | null = null;
    if (access.quickCheck) {
      const g = summary.engines.find((e) => e.engine === 'gemini');
      const brandedCited = !!g && g.brandedCited > 0;
      const catCited = !!g && g.categoryCited > 0;
      const score = (brandedCited ? 60 : 20) + (catCited ? 30 : 0); // 20 / 50 / 80 / 90
      const label = score >= 80 ? 'Strong initial signal' : score >= 50 ? 'Retrievable — low citation win' : 'Weak initial signal';
      provisional = {
        score,
        label,
        message:
          `Initial results (Gemini only) suggest: ${brandedCited ? 'AI can retrieve your brand' : 'AI struggles to retrieve your brand'}` +
          `${catCited ? ', and already cites you for a category query.' : ', but does not yet cite you for category queries.'}` +
          ' This is a provisional read from a single engine on one query each.',
      };
      upgrade =
        'To run a complete sweep — Claude, ChatGPT, Perplexity and Gemini, multiple runs per query, competitor "cited instead" displacement, and full stored transcripts — start a Day Pass or subscribe.';
    }

    return res.status(200).json({
      domain,
      brand: brand || null,
      runsPerQuery,
      engines,
      skippedEngines,
      configured,
      tier: access.tier,
      quickCheck: access.quickCheck,
      provisional,
      upgrade,
      summary,
      runs, // full transcripts for drill-down
      persisted,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'sweep failed' });
  }
}

/** Persist a sweep + its runs to Supabase via REST (service role). Best-effort:
 *  returns false if the service key or tables are absent. */
async function persistSweep(input: {
  domain: string;
  brand?: string;
  userId?: string;
  summary: any;
  runs: SweepRunResult[];
}): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const sweepRes = await fetch(`${url}/rest/v1/citation_sweeps`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: input.userId || null,
      domain: input.domain,
      brand: input.brand || null,
      summary: input.summary,
      total_cost_usd: input.summary.totalCostUsd,
      total_runs: input.summary.totalRuns,
    }),
  });
  if (!sweepRes.ok) return false;
  const [sweep] = await sweepRes.json();
  const sweepId = sweep?.id;
  if (!sweepId) return false;

  const rows = input.runs.map((r) => ({
    sweep_id: sweepId,
    engine: r.engine,
    query: r.query,
    query_type: r.queryType,
    run_index: r.runIndex,
    cited: !!r.cited,
    cited_competitors: r.citedCompetitors || [],
    sources: r.sources,
    transcript: r.transcript,
    cost_usd: r.costUsd,
  }));
  const rowsRes = await fetch(`${url}/rest/v1/sweep_results`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
  return rowsRes.ok;
}

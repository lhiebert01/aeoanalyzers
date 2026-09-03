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
  isTruncatedText,
  type SweepRunResult,
  type Competitor,
  type QueryType,
} from '../src/lib/citationSweep.js';
import { extractTruthRecord, type TruthRecord } from '../src/lib/truthRecord.js';
import { auditFactDensity, type FactDensityAudit } from '../src/lib/factDensity.js';

// Vercel Fluid Compute allows long runs; a full sweep is many sequential calls.
export const config = { maxDuration: 300 };

const ALL_ENGINES: Engine[] = ['claude', 'openai', 'perplexity', 'gemini'];

// Throttled sweep-engine-down alert: ONE loud, greppable line at most once per
// ~72h per running instance, so a dead/expired engine key is visible without
// firing on every sweep. Wire a Vercel log-alert on "[SWEEP-ENGINE-FAIL]".
let lastSweepEngineFailAlert = 0;
const SWEEP_ENGINE_FAIL_ALERT_MS = 72 * 60 * 60 * 1000; // ~3 days
function alertSweepEngineFail(engine: string, total: number, sample: string) {
  const now = Date.now();
  if (now - lastSweepEngineFailAlert < SWEEP_ENGINE_FAIL_ALERT_MS) return;
  lastSweepEngineFailAlert = now;
  console.error(
    `[SWEEP-ENGINE-FAIL] engine=${engine} — ALL ${total} runs errored (reported as UNAVAILABLE, NOT a real 0%). ` +
      `Likely a bad/expired key or config. Sample: ${sample}`,
  );
}

const ADMIN_EMAILS = ['lindsay.hiebert@gmail.com', 'liindsay.hiebert@gmail.com'];
// Monthly sweep quota per tier — the real-money spend guardrail. A size-capped
// sweep MEASURED at ~$1.34 COGS (Haiku + economical engines, max_searches 3), so
// gross margin stays ≥75% even at max usage: Day Pass ~79%, Pro ~75%, Business ~84%.
const MONTHLY_QUOTA: Record<string, number> = { admin: 100000, Business: 20, Pro: 8, daypass: 3 };
// One paid sweep is bounded by total query-runs (queries × runs) so it both fits
// the serverless timeout (at concurrency 8) AND has predictable cost/margin.
const MAX_QUERY_RUNS_PER_SWEEP = 15;
const MAX_RUNS_PER_SWEEP = 3;
// Hard wall-clock guard (the real 504 fix): the TOTAL engine calls = engines ×
// queries × runsPerQuery. This must finish within maxDuration=300s. Sized for
// ~concurrency 12 × ~7 waves × ≤30s/call ≈ well under 300s. Applies to EVERY
// non-quick sweep — including admin, which previously skipped all caps and 504'd.
const SWEEP_TASK_BUDGET = Number(process.env.SWEEP_TASK_BUDGET || 84);
const SWEEP_CALL_TIMEOUT_MS = Number(process.env.SWEEP_CALL_TIMEOUT_MS || 30000);

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

/** Reject if a single engine call hangs, so one stuck provider can't hold a
 *  concurrency slot for the whole function budget — a top cause of sweep 504s.
 *  A timed-out call is recorded as an UNAVAILABLE run, not a silent drop. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// ── Per-engine 429/5xx retry with jittered backoff (WO-AEO-SWEEP-MEMORY-001) ──
// A transient rate-limit or 5xx must NOT be scored as a real "not cited". Retry the
// failed engine call a bounded number of times, honoring Retry-After when the adapter
// surfaces it, otherwise exponential backoff with jitter. Every wait is gated by a
// global sweep DEADLINE so retries can never push the function past maxDuration — when
// the budget is gone, the run is returned as errored and the UI badges it (never a hang).
const SWEEP_MAX_RETRIES = Number(process.env.SWEEP_MAX_RETRIES || 2);
const RETRY_BACKOFF_CAP_MS = Number(process.env.SWEEP_RETRY_CAP_MS || 6000);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
function statusFromError(err: any): number {
  if (typeof err?.status === 'number') return err.status;
  const m = /\b(429|500|502|503|504)\b/.exec(String(err?.message || ''));
  return m ? Number(m[1]) : 0;
}
function isRetryable(err: any): boolean {
  const s = statusFromError(err);
  if (s === 429 || (s >= 500 && s < 600)) return true;
  return /timed out|ETIMEDOUT|ECONNRESET|EAI_AGAIN|fetch failed|socket hang up|network/i.test(String(err?.message || ''));
}
async function callWithRetry<T>(fn: () => Promise<T>, deadline: number): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt >= SWEEP_MAX_RETRIES || !isRetryable(err)) throw err;
      const backoff = Math.min(500 * 2 ** attempt, RETRY_BACKOFF_CAP_MS);
      const jittered = backoff / 2 + Math.random() * (backoff / 2);
      const wait =
        typeof err?.retryAfterMs === 'number' && err.retryAfterMs >= 0
          ? Math.min(err.retryAfterMs, RETRY_BACKOFF_CAP_MS)
          : jittered;
      // Deadline guard: if a wait + one more attempt can't finish in budget, give up now
      // and let the errored run be badged. This is what guarantees no hang (constraint).
      if (Date.now() + wait + SWEEP_CALL_TIMEOUT_MS > deadline) throw err;
      await sleep(wait);
      attempt++;
    }
  }
}

/** Per-engine in-flight cap layered on top of the global pool. Perplexity's low rate
 *  limit was the 429 source (56/60 runs at concurrency 4), so it gets a small cap while
 *  the other engines keep the global concurrency. */
function makeEngineLimiter(caps: Partial<Record<Engine, number>>) {
  const active: Record<string, number> = {};
  const waiters: Record<string, Array<() => void>> = {};
  return async function run<T>(engine: Engine, fn: () => Promise<T>): Promise<T> {
    const cap = caps[engine];
    if (!cap) return fn();
    active[engine] = active[engine] || 0;
    waiters[engine] = waiters[engine] || [];
    if (active[engine] >= cap) await new Promise<void>((res) => waiters[engine].push(res));
    active[engine]++;
    try {
      return await fn();
    } finally {
      active[engine]--;
      waiters[engine].shift()?.();
    }
  };
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

    // Size the sweep to fit maxDuration: TOTAL engine calls = engines × queries ×
    // runsPerQuery. Trim runs first (keep query breadth), then queries — so a big
    // set completes as a broad sample instead of 504-ing. Paid keeps its cost cap;
    // admin is bounded by time only (no monthly quota, but still finite).
    if (!access.quickCheck) {
      const engN = Math.max(1, engines.length);
      const timeQueryRuns = Math.max(engN, Math.floor(SWEEP_TASK_BUDGET / engN));
      const costQueryRuns = access.tier === 'admin' ? Number.POSITIVE_INFINITY : MAX_QUERY_RUNS_PER_SWEEP;
      const maxQueryRuns = Math.min(timeQueryRuns, costQueryRuns);
      const totalQueries = brandedQueries.length + categoryQueries.length;
      // Prefer breadth: if N>1 would overflow the budget, drop to N=1 first.
      if (runsPerQuery > 1 && Math.ceil(maxQueryRuns / runsPerQuery) < totalQueries) runsPerQuery = 1;
      runsPerQuery = Math.min(runsPerQuery, access.tier === 'admin' ? 5 : MAX_RUNS_PER_SWEEP);
      const maxQueries = Math.max(1, Math.floor(maxQueryRuns / runsPerQuery));
      brandedQueries = brandedQueries.slice(0, maxQueries);
      const remaining = Math.max(0, maxQueries - brandedQueries.length);
      categoryQueries = categoryQueries.slice(0, remaining);
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

    const CONCURRENCY = Number(process.env.SWEEP_CONCURRENCY || 12);
    // Global sweep deadline: leave headroom under maxDuration (300s) so retries can
    // never push us into a 504. When the budget is gone, remaining failures are badged,
    // not retried (constraint: the badge is the fallback, never a hang).
    const deadline = Date.now() + Number(process.env.SWEEP_BUDGET_MS || 270_000);
    // Perplexity's low rate limit was the 429 source — cap its in-flight calls while the
    // other engines keep the global concurrency.
    const engineLimiter = makeEngineLimiter({
      perplexity: Number(process.env.SWEEP_PERPLEXITY_CONCURRENCY || 3),
    });
    const runs: SweepRunResult[] = await pool(tasks, CONCURRENCY, async (t) => {
      const base: SweepRunResult = {
        engine: t.engine, query: t.query, queryType: t.queryType, runIndex: t.runIndex,
        transcript: '', sources: [], costUsd: 0,
      };
      try {
        const answer = await engineLimiter(t.engine, () =>
          callWithRetry(
            () => withTimeout(ENGINE_ADAPTERS[t.engine](t.query), SWEEP_CALL_TIMEOUT_MS, `${t.engine}:${t.queryType}`),
            deadline,
          ),
        );
        // Mark cut-off answers so scoring excludes them: trust the engine's own
        // finish_reason (answer.truncated), and fall back to a text heuristic for
        // engines/paths that don't report it (WO-QA-003 A1).
        const truncated = !!answer.truncated || isTruncatedText(answer.transcript);
        // Classify grounding: did the engine actually search, or answer from weights
        // (model-prior)? Model-prior runs are kept out of citation-win (WO-QA-003 A2).
        const grounding: SweepRunResult['grounding'] = answer.searchInvoked ? 'search-grounded' : 'model-prior';
        return scoreRun({ ...base, ...answer, truncated, grounding }, { domain, brand }, competitors);
      } catch (err: any) {
        // The call FAILED after bounded retries (429/5xx/timeout/missing key). Record an
        // ERRORED run — excluded from every score and badged, never counted as a real
        // "not cited" (WO-AEO-SWEEP-MEMORY-001).
        return scoreRun(
          { ...base, errored: true, transcript: `[error: ${err?.message || err}]` },
          { domain, brand },
          competitors
        );
      }
    });

    const summary = aggregateSweep(runs, { domain, brand }, competitors);

    // Flag engines whose runs ALL errored (dead/expired key, 401, missing config)
    // so a BROKEN engine is never reported as a real "0% retrievability". A run is
    // an error when the adapter threw and we stored the "[error: …]" sentinel
    // transcript. Surfaced as engine.errored + logged for alerting. This is the
    // "$0.000 cost / 0-of-6 masquerading as a real zero" case.
    for (const eng of summary.engines || []) {
      const engRuns = runs.filter((r) => r.engine === eng.engine);
      const erroredRuns = engRuns.filter((r) => /^\[error:/.test(r.transcript || ''));
      if (engRuns.length > 0 && erroredRuns.length === engRuns.length) {
        (eng as any).errored = true;
        (eng as any).status = 'unavailable'; // UI renders "Service unavailable", not 0%
        (eng as any).errorSample = (erroredRuns[0].transcript || '').slice(0, 200);
        alertSweepEngineFail(eng.engine, engRuns.length, (eng as any).errorSample);
      }
    }

    let persisted = false;
    if (persist) {
      try {
        // WO-AEO-MOBILE-HISTORY-001: capture a compact point-in-time snapshot of the
        // client's own site (TruthRecord + content-depth audit) so a SAVED sweep can
        // recompute every point-in-time layer the as-run screen shows — fidelity/drift,
        // entity-linking collisions, content depth — with NO raw HTML stored. Best-effort:
        // a failed/slow fetch must never affect the sweep — it just omits the snapshot.
        const snapshot = await fetchSiteSnapshot(domain);
        persisted = await persistSweep({ domain, brand, userId, summary, runs, fullResult: snapshot });
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
  fullResult?: Record<string, unknown> | null;
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

  // Base columns that exist regardless of migration state.
  const baseRow = {
    user_id: input.userId || null,
    domain: input.domain,
    brand: input.brand || null,
    summary: input.summary,
    total_cost_usd: input.summary.totalCostUsd,
    total_runs: input.summary.totalRuns,
  };
  const insertSweep = (body: Record<string, unknown>) =>
    fetch(`${url}/rest/v1/citation_sweeps`, { method: 'POST', headers, body: JSON.stringify(body) });

  // WO-AEO-MOBILE-HISTORY-001: try WITH the point-in-time snapshot (full_result, for
  // saved-view fidelity parity). If the column isn't present yet (migration 20260902
  // not applied), PostgREST 400s on the unknown key — so fall back to the base row so
  // core retention (scores/transcripts/citations) is NEVER lost to migration timing.
  // Fidelity simply won't be available for that sweep until the migration runs.
  let sweepRes = await insertSweep({ ...baseRow, full_result: input.fullResult ?? null });
  if (!sweepRes.ok && input.fullResult) {
    sweepRes = await insertSweep(baseRow);
  }
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
    // WO-AEO-SWEEP-MEMORY-001: persist the measurement flags so a saved sweep re-derives
    // the SAME scores as the live run (errored via transcript sentinel; truncated +
    // grounding here). Errored runs are also flagged for clarity.
    truncated: r.truncated ?? false,
    grounding: r.grounding ?? null,
  }));
  const insertRows = (body: unknown) =>
    fetch(`${url}/rest/v1/sweep_results`, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
  // Fail-safe: try WITH the new flag columns; if the 20260902 run-flags migration isn't
  // applied yet, PostgREST 400s on the unknown keys — fall back to the base columns so
  // the runs (transcripts/citations) are never lost to migration timing. The saved-view
  // recompute then treats absent flags as not-truncated/grounded (back-compat).
  let rowsRes = await insertRows(rows);
  if (!rowsRes.ok) {
    const bare = rows.map(({ truncated, grounding, ...base }) => base);
    rowsRes = await insertRows(bare);
  }
  return rowsRes.ok;
}

/** WO-AEO-MOBILE-HISTORY-001: fetch the client's own site once and extract the compact,
 *  point-in-time layers a SAVED sweep needs to reproduce the as-run screen + report —
 *  the TruthRecord (drives fidelity/drift + entity-linking collisions) and the
 *  content-depth audit. Best-effort and strictly bounded — mirrors the plain HTTP fetch
 *  in api/fetch-site (no headless browser). Any failure/timeout returns null; the sweep
 *  is unaffected and the saved view degrades to a labeled "not captured" note. */
async function fetchSiteSnapshot(
  domain: string,
): Promise<{ truth: TruthRecord; factDensity: FactDensityAudit } | null> {
  try {
    const raw = (domain || '').trim();
    if (!raw) return null;
    const base = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let origin: string;
    try { origin = new URL(base).origin; } catch { return null; }

    const UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
    const get = async (u: string, ms: number): Promise<string | null> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      try {
        const r = await fetch(u, {
          signal: ctrl.signal,
          headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        });
        return r.ok ? await r.text() : null;
      } catch {
        return null;
      } finally {
        clearTimeout(t);
      }
    };

    const html = await get(base, 8000);
    if (!html) return null;
    const llmsTxt = await get(`${origin}/llms.txt`, 4000);
    return { truth: extractTruthRecord(html, llmsTxt), factDensity: auditFactDensity(html) };
  } catch {
    return null;
  }
}

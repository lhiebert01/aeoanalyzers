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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const domain: string = (body.domain || '').trim();
    const brand: string | undefined = body.brand?.trim() || undefined;
    const brandedQueries: string[] = (body.brandedQueries || []).filter(Boolean);
    const categoryQueries: string[] = (body.categoryQueries || []).filter(Boolean);
    const competitors: Competitor[] = (body.competitors || []).filter((c: any) => c?.name);
    const runsPerQuery: number = Math.max(1, Math.min(5, body.runsPerQuery || 3));
    const persist: boolean = body.persist !== false;
    const userId: string | undefined = body.userId;

    if (!domain) return res.status(400).json({ error: 'domain is required' });
    if (!brandedQueries.length && !categoryQueries.length) {
      return res.status(400).json({ error: 'at least one branded or category query is required' });
    }

    const configured = configuredEngines();
    const requested: Engine[] = (body.engines?.length ? body.engines : configured).filter(
      (e: Engine) => ALL_ENGINES.includes(e)
    );
    const engines = requested.filter((e) => configured.includes(e));
    const skippedEngines = requested.filter((e) => !configured.includes(e));

    if (!engines.length) {
      return res.status(400).json({
        error: 'no configured engines to run',
        detail: 'Set ANTHROPIC_API_KEY / OPENAI_API_KEY / PERPLEXITY_API_KEY / GEMINI_API_KEY in the environment.',
        configured,
      });
    }

    // Build the full task matrix.
    const tasks: Task[] = [];
    for (const engine of engines) {
      for (const query of brandedQueries)
        for (let r = 0; r < runsPerQuery; r++) tasks.push({ engine, query, queryType: 'branded', runIndex: r });
      for (const query of categoryQueries)
        for (let r = 0; r < runsPerQuery; r++) tasks.push({ engine, query, queryType: 'category', runIndex: r });
    }

    const CONCURRENCY = Number(process.env.SWEEP_CONCURRENCY || 4);
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

    return res.status(200).json({
      domain,
      brand: brand || null,
      runsPerQuery,
      engines,
      skippedEngines,
      configured,
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

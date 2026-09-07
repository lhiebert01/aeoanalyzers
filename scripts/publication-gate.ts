// PUBLICATION GATE — CLI. Run before anything with a measured figure goes public.
//
//   npx tsx scripts/publication-gate.ts docs/claims/<manifest>.json
//
// The manifest lists every measured figure that appears in the content, with the
// stored sweep id it came from. The gate resolves each sweep AND its transcripts
// from Supabase, recomputes the metric, and compares.
//
// EXIT 0 only if every figure verified. Any failure — sweep missing, no
// transcripts, value or N mismatch, resolver error — exits 1. There is no
// warn-and-continue path, by design: the July 2026 branded figure was published
// and is now unverifiable, and that is the outcome this prevents.

import { readFileSync } from 'node:fs';
import { verifyClaims, formatGateResult, type PublishedClaim, type ResolvedSweep } from '../src/lib/publicationGate.js';
import type { SweepRunResult, Competitor, Engine, QueryType } from '../src/lib/citationSweep.js';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SUPA = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const manifestPath = process.argv[2];

if (!manifestPath) {
  console.error('usage: npx tsx scripts/publication-gate.ts <manifest.json>');
  process.exit(1);
}
if (!SUPA || !KEY) {
  // Fail CLOSED: no credentials means we cannot verify, which is not the same as verified.
  console.error('PUBLICATION GATE FAILED — no Supabase credentials, so no figure can be verified.');
  process.exit(1);
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` } as Record<string, string>;

async function rest(path: string): Promise<any[]> {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, { headers: H });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

/** The monthly self-measure runs headless (`scripts/headless-sweep.ts`) and its
 *  transcripts land in `docs/baselines/*.json`, not in Supabase. Those are stored
 *  transcripts too, so the gate resolves them — but ONLY if the file actually holds
 *  runs. A summary-only baseline (the July 2026 case) resolves to zero runs and the
 *  gate blocks it, which is the correct outcome. */
function resolveFromBaseline(sweepId: string): ResolvedSweep | null {
  if (!sweepId.startsWith('baseline:')) return null;
  const file = `docs/baselines/${sweepId.slice('baseline:'.length)}`;
  let d: any;
  try { d = JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
  let runs: any[] = [];
  for (const k of Object.keys(d)) {
    const v = d[k];
    if (Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' && 'transcript' in v[0]) { runs = v; break; }
  }
  return {
    domain: d.domain,
    brand: d.brand || undefined,
    competitors: Array.isArray(d.competitors) ? d.competitors : [],
    runs: runs as SweepRunResult[], // empty array => gate blocks, by design
  };
}

/** Resolve a sweep id (full uuid, the short prefix baselines pin, or baseline:<file>). */
async function resolveSweep(sweepId: string): Promise<ResolvedSweep | null> {
  const fromFile = resolveFromBaseline(sweepId);
  if (fromFile) return fromFile;
  if (sweepId.startsWith('baseline:')) return null; // named a baseline that does not exist
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sweepId);
  const matches = isUuid
    ? await rest(`citation_sweeps?id=eq.${sweepId}&select=*`)
    : (await rest('citation_sweeps?select=*&order=created_at.desc&limit=500')).filter((s: any) =>
        String(s.id).toLowerCase().startsWith(sweepId.toLowerCase())
      );
  if (matches.length !== 1) return null; // zero or ambiguous — both are failures
  const sweep = matches[0];
  const rows = await rest(`sweep_results?sweep_id=eq.${sweep.id}&select=*&order=run_index.asc`);
  const runs: SweepRunResult[] = rows.map((r: any) => ({
    engine: r.engine as Engine,
    query: r.query,
    queryType: r.query_type as QueryType,
    runIndex: r.run_index,
    transcript: r.transcript || '',
    sources: r.sources || [],
    costUsd: Number(r.cost_usd) || 0,
    citedCompetitors: r.cited_competitors || [],
    truncated: r.truncated ?? undefined,
    grounding: r.grounding ?? undefined,
  }));
  const competitors: Competitor[] = Array.isArray(sweep.competitors) ? sweep.competitors : [];
  return { domain: sweep.domain, brand: sweep.brand || undefined, competitors, runs };
}

(async () => {
  const claims: PublishedClaim[] = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(claims) || claims.length === 0) {
    console.error('PUBLICATION GATE FAILED — manifest is empty. Content with no registered figures cannot be cleared by this gate.');
    process.exit(1);
  }
  const result = await verifyClaims(claims, resolveSweep);
  console.log(formatGateResult(result));
  process.exit(result.ok ? 0 : 1);
})().catch((e) => {
  console.error(`PUBLICATION GATE FAILED — ${e?.message || e}`);
  process.exit(1);
});

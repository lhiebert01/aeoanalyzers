// Import sweeps that were run OUTSIDE the product back into it.
//
//   npx tsx scripts/import-stored-sweeps.ts <dir> --user <uuid> [--dry-run]
//
// WHY THIS EXISTS. `scripts/run-wo-sweep-configs.ts` called the engine adapters directly
// and wrote only to `private/baselines/`. It never called `persistSweep` and never went
// through `api/run-sweep`, so the eight prospect sweeps of Sep 7 2026 — $6.54 of real
// engine spend — produced ZERO rows in `citation_sweeps`. They were absent from History,
// not filtered out of it: every one of the 28 stored sweeps belongs to the founder's
// account, so this was never an ownership or RLS problem.
//
// That is a product gap, not an operating error: a run that spends engine budget and
// leaves no record the paying account can see is invisible by construction. This importer
// is the remedy for the runs already made; the durable fix is that every path which spends
// budget persists through one function.
//
// It writes rows IDENTICAL in shape to a UI-run sweep, so the saved view rebuilds them,
// re-scores them, and regenerates the Markdown and Word reports by the normal product
// path — no script needed to read them back.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { aggregateSweep, scoreRun, type SweepRunResult, type Competitor } from '../src/lib/citationSweep.js';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const SUPA = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) { console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--')) || 'private/baselines';
const userId = args.includes('--user') ? args[args.indexOf('--user') + 1] : '';
const dryRun = args.includes('--dry-run');
if (!userId) { console.error('--user <uuid> is required: the account that paid for these runs.'); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' } as Record<string, string>;

async function post(path: string, body: unknown, prefer = 'return=representation') {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, { method: 'POST', headers: { ...H, Prefer: prefer }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  return prefer.includes('representation') ? res.json() : null;
}

(async () => {
  const files = readdirSync(dir).filter((f) => /^S\d+-.*\.json$/.test(f));
  if (!files.length) { console.error(`no stored sweep files in ${dir}`); process.exit(1); }

  // Never import the same run twice: match on domain + the sweep's own date.
  const existing: any[] = await (await fetch(`${SUPA}/rest/v1/citation_sweeps?select=domain,created_at&limit=1000`, { headers: H })).json();
  const seen = new Set(existing.map((r: any) => `${String(r.domain).toLowerCase()}|${String(r.created_at).slice(0, 10)}`));

  let imported = 0, skipped = 0;
  for (const f of files) {
    const d = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const t = d.target || {};
    const domain: string = t.domain;
    const brand: string | null = t.product || null;
    const competitors: Competitor[] = (t.competitors || []).map((n: string) => (typeof n === 'string' ? { name: n } : n));
    const runs: SweepRunResult[] = d.runs || [];
    // The measurement date is the RUN's date, taken from the filename, never today's —
    // importing must not restamp a measurement.
    const runDate = (f.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || new Date().toISOString().slice(0, 10);

    if (seen.has(`${domain.toLowerCase()}|${runDate}`)) { console.log(`  skip ${t.id} — already imported`); skipped++; continue; }

    // Re-score against the persisted config, exactly as the saved view will.
    const scored = runs.map((r) => scoreRun(r, { domain, brand: brand || undefined }, competitors));
    const summary = aggregateSweep(scored, { domain, brand: brand || undefined }, competitors);

    const row = {
      user_id: userId,
      domain,
      brand,
      summary,
      total_cost_usd: summary.totalCostUsd,
      total_runs: summary.totalRuns,
      created_at: `${runDate}T12:00:00Z`,
      category: t.category || null,
      competitors,
      branded_queries: [...new Set(scored.filter((r) => r.queryType === 'branded').map((r) => r.query))],
      category_queries: [...new Set(scored.filter((r) => r.queryType === 'category').map((r) => r.query))],
    };

    if (dryRun) { console.log(`  would import ${t.id} ${domain} — ${scored.length} runs, $${summary.totalCostUsd.toFixed(4)}`); imported++; continue; }

    const [sweep] = await post('citation_sweeps', row);
    await post(
      'sweep_results',
      scored.map((r) => ({
        sweep_id: sweep.id, engine: r.engine, query: r.query, query_type: r.queryType, run_index: r.runIndex,
        cited: !!r.cited, cited_competitors: r.citedCompetitors || [], sources: r.sources,
        transcript: r.transcript, cost_usd: r.costUsd, truncated: r.truncated ?? false, grounding: r.grounding ?? null,
      })),
      'return=minimal'
    );
    console.log(`  imported ${t.id} ${domain} — ${scored.length} runs, sweep ${String(sweep.id).slice(0, 8)}`);
    imported++;
  }
  console.log(`\n${dryRun ? 'DRY RUN — ' : ''}imported ${imported}, skipped ${skipped}`);
  if (!dryRun && imported) console.log('They now appear in History and re-render through the normal saved-sweep path.');
})().catch((e) => { console.error(String(e?.message || e)); process.exit(1); });

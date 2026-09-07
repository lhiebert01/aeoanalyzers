// Render an AI Visibility Executive Report from a STORED sweep — no engine calls, $0.
//
//   npx tsx scripts/exec-report-stored.ts <sweep-id> [--out DIR] [--variant paid|courtesy]
//                                          [--label "measured Sep 2, 2026 — pre-launch"]
//                                          [--compare <later-sweep-id>]
//
// --label   overrides the displayed measurement date. The stored timestamp is UTC; a
//           baseline may pin the same run in local time (Sep 2 America/Chicago = Sep 3 UTC),
//           and a published sample must carry the wording the baseline uses.
// --compare adds a second stored sweep of the SAME domain as a second column: same
//           questions, two dates, is the gap closing. This is the monitoring product
//           demonstrating itself.
//
// Why this exists: `scripts/exec-report.ts` runs a LIVE sweep to produce a report, which
// costs money and produces new numbers every time. Everything the report needs is already
// persisted — `sweep_results` holds every transcript, `citation_sweeps` holds the entered
// config and (since 20260902) a point-in-time TruthRecord in `full_result.truth`. So a
// stored sweep can be re-rendered as many times as we like, and the numbers never move.
//
// It re-scores rather than trusting stored `cited`, exactly as the saved view does
// (WO-INTEGRITY-002 A1/A2): errored runs excluded, branded false-positives corrected,
// domainCited and citedCompetitors recovered against the persisted config.
//
// Uses: the published sample on the blog, the courtesy pack, /evidence, and any
// "same domain, two dates" comparison.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { scoreRun, type SweepRunResult, type Competitor, type Engine, type QueryType } from '../src/lib/citationSweep.js';
import { assembleReportData, defaultNarrative, renderExecReport, containsGrayHat, type ReportVariant } from '../src/lib/execReport.js';
import type { TruthRecord } from '../src/lib/truthRecord.js';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SUPA = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) { console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'); process.exit(1); }

const args = process.argv.slice(2);
const sweepId = args.find((a) => !a.startsWith('--'));
const outDir = (args[args.indexOf('--out') + 1] && args.includes('--out')) ? args[args.indexOf('--out') + 1] : './exec-out';
const variant = (args.includes('--variant') ? args[args.indexOf('--variant') + 1] : 'paid') as ReportVariant;
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : '';
const compareId = args.includes('--compare') ? args[args.indexOf('--compare') + 1] : '';
if (!sweepId) { console.error('usage: npx tsx scripts/exec-report-stored.ts <sweep-id> [--out DIR] [--variant paid|courtesy]'); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` } as Record<string, string>;

async function rest(path: string): Promise<any[]> {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, { headers: H });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function loadSweep(id: string) {
  // Baselines pin sweeps by their short id prefix (e.g. c9d75643), so accept either a
  // full uuid or a prefix — and refuse an ambiguous prefix rather than guess which sweep
  // the caller meant.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  // PostgREST cannot pattern-match a uuid column (`operator does not exist: uuid ~~`),
  // so a prefix is resolved client-side over the recent sweeps instead.
  const matches = isUuid
    ? await rest(`citation_sweeps?id=eq.${id}&select=*`)
    : (await rest('citation_sweeps?select=*&order=created_at.desc&limit=500'))
        .filter((s: any) => String(s.id).toLowerCase().startsWith(id.toLowerCase()));
  if (!matches.length) throw new Error(`No stored sweep with id ${id}`);
  if (matches.length > 1) throw new Error(`Ambiguous id prefix ${id} — matches ${matches.length} sweeps: ${matches.map((m: any) => m.id).join(', ')}`);
  const sweep = matches[0];
  const rows = await rest(`sweep_results?sweep_id=eq.${sweep.id}&select=*&order=run_index.asc`);
  if (!rows.length) throw new Error(`Sweep ${id} has no stored runs`);

  // Same mapping the saved view uses. Stored `cited` is deliberately ignored.
  const raw: SweepRunResult[] = rows.map((r: any) => ({
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

  const brand: string = sweep.brand || '';
  const domain: string = sweep.domain;
  const competitors: Competitor[] = Array.isArray(sweep.competitors) ? sweep.competitors : [];
  const truth: TruthRecord | null = sweep.full_result?.truth ?? null;
  const runs = raw.map((r) => scoreRun(r, { domain, brand: brand || undefined }, competitors));

  // The sweep's OWN date, never today's — a re-render must not restamp the measurement.
  const sweepDate = String(sweep.created_at).slice(0, 10);

  const data = assembleReportData({ brand: brand || domain, domain, sweepDate, runs, competitors, truth });
  return { sweep, data, domain, brand, sweepDate, competitors, truth };
}

(async () => {
  const first = await loadSweep(sweepId);
  const { data, domain, brand, sweepDate, competitors, truth } = first;
  let report = renderExecReport(data, defaultNarrative(data), variant);

  // Requirement: the measurement date is prominent and carries the baseline's own wording.
  // Strip a leading "measured" so a label written as "measured Sep 2, 2026 — pre-launch"
  // does not render as "Measured: measured Sep 2…".
  if (label) report = report.replace(/\*\*Sweep date:\*\* [0-9-]+/, `**Measured:** ${label.replace(/^measured\s+/i, '')}`);

  // Second column: the same domain, a later date, the same questions.
  if (compareId) {
    const later = await loadSweep(compareId);
    if (later.domain !== domain) throw new Error(`--compare must be the same domain (${domain} vs ${later.domain})`);
    const a = data.scorecard, b = later.data.scorecard;
    const row = (name: string, x: number | null, xn: number, y: number | null, yn: number) => {
      if (x === null || y === null) return `| ${name} | — | — | not measured |`;
      const d = y - x;
      const move = d === 0 ? 'no change' : d > 0 ? `+${d} pts` : `${d} pts`;
      return `| ${name} | ${x}% (N=${xn}) | ${y}% (N=${yn}) | ${move} |`;
    };
    report += [
      '',
      '## Two measurements, same questions',
      '',
      `Both columns use the identical pinned question panel. Only the date differs, so a change`,
      `here is a change in the world and not a change in the method.`,
      '',
      `| Layer | ${label || sweepDate} | ${later.sweepDate} | Movement |`,
      '| --- | --- | --- | --- |',
      row('Found when asked by name', a.brandedRetrievabilityPct, a.brandedRuns, b.brandedRetrievabilityPct, b.brandedRuns),
      row('Recommended to new buyers', a.categoryRecommendationWinPct, a.categoryRuns, b.categoryRecommendationWinPct, b.categoryRuns),
      row('Your own site cited', a.ownedCitationRatePct, a.ownedCitationN, b.ownedCitationRatePct, b.ownedCitationN),
      '',
      `_Cause leads effect by crawl cycles. A flat second column after an on-site change means`,
      `the change has not been recrawled yet, not that it failed._`,
      '',
    ].join('\n');
  }

  // The deterministic gray-hat backstop. It returns { ok, hits } — a truthy object even
  // when clean, so test `.ok`, not the object. A hit is a hard stop: nothing that fails
  // this gets published.
  const gray = containsGrayHat(report);
  if (!gray.ok) {
    console.error(`[BLOCKED] gray-hat phrasing in output: ${gray.hits.join(', ')}`);
    process.exit(2);
  }

  mkdirSync(outDir, { recursive: true });
  const stem = `${outDir}/${domain}-${sweepDate}-stored`;
  writeFileSync(`${stem}.report.md`, report);
  writeFileSync(`${stem}.data.json`, JSON.stringify({ sweepId, domain, brand, sweepDate, label: label || null, comparedWith: compareId || null, competitors, truthPresent: !!truth, headline: data.headline, scorecard: data.scorecard }, null, 2));

  const sc = data.scorecard;
  console.log(`\n${domain} · measured ${sweepDate} · sweep ${sweepId}`);
  console.log(`  branded retrievability   ${sc.brandedRetrievabilityPct}%  (N=${sc.brandedRuns})`);
  console.log(`  category citation win    ${sc.categoryRecommendationWinPct}%  (N=${sc.categoryRuns})`);
  console.log(`  owned citation rate      ${sc.ownedCitationRatePct ?? '—'}%  (N=${sc.ownedCitationN})`);
  console.log(`  runs excluded (errored)  ${sc.erroredRuns}`);
  console.log(`  truth snapshot           ${truth ? 'present' : 'ABSENT — fidelity section omitted, not fabricated'}`);
  console.log(`\nwrote ${stem}.report.md`);
})().catch((e) => { console.error(String(e?.message || e)); process.exit(1); });

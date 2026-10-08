// File a monthly self-sweep as a committed baseline (WO-AEO-BRANDED-ACCURACY-004 Part C).
//   npx tsx scripts/finalize-selfsweep.ts <raw.json> <out.json> "<run label>"
// Committed baselines carry NO cost (founder ruling, Oct 8 2026 — the repo is public); the raw file
// with cost is kept in private/. Each baseline carries the site facts its accuracy figure was
// checked against, captured at run time, and the accuracy-when-named counts computed from them.
import { readFileSync, writeFileSync } from 'node:fs';
import { scoreRun } from '../src/lib/citationSweep.js';
import { accuracyWhenNamed } from '../src/lib/fidelity.js';
const [raw, out, label] = process.argv.slice(2);
const d = JSON.parse(readFileSync(raw, 'utf8'));
const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
const comps = [{ name: 'Profound', domain: 'tryprofound.com' }, { name: 'Otterly AI', domain: 'otterly.ai' }, { name: 'Peec AI', domain: 'peec.ai' }];
const runs = d.runs.map((r: any) => ({ ...r, costUsd: 0 }));
const awn = accuracyWhenNamed(runs.map((r: any) => scoreRun(r, client, comps)).filter((r: any) => r.queryType === 'branded'), d.truth);
const doc = {
  runTimestampUtc: d.truthReadAtUtc, runLabel: label, panelVersion: 'v1.1', reps: 5, concurrency: 1,
  seriesNote: 'Pinned panel v1.1, four engines, five runs per question, sequential, reserve-before-spend budget guard; 0 errored runs. Cost is not recorded in committed baselines.',
  domain: d.domain, brand: d.brand, competitors: comps,
  truth: d.truth, truthReadAtUtc: d.truthReadAtUtc,
  accuracyWhenNamed: awn && { accurate: awn.accurate, named: awn.named, pct: awn.pct, checked: awn.checked },
  summary: { ...d.summary, totalCostUsd: 0, engines: d.summary.engines.map((e: any) => ({ ...e, costUsd: 0 })) },
  runs,
};
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`wrote ${out} — ${runs.length} runs, accuracy-when-named ${awn?.accurate}/${awn?.named}`);

// WO-AEO-SWEEP-CONFIGS-001 — run the eight ratified courtesy sweeps.
//
//   npx tsx scripts/run-wo-sweep-configs.ts
//
// Reads private/baselines/sweep-configs.json (the founder's ratified configs, used
// VERBATIM — no category noun or competitor is substituted or "improved").
// Writes every artifact to private/baselines/, which is gitignored.
//
// Hard rules from the work order:
//  - three repetitions, four engines, sequential
//  - abort at budget_usd_max; never exceed it
//  - no prospect name, domain or finding written to a tracked file
//  - a thin result is reported as thin, never stretched into a sentence

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ENGINE_ADAPTERS, configuredEngines, type Engine } from '../api/_lib/engines.js';
import {
  scoreRun, aggregateSweep, sweepScorecard,
  type SweepRunResult, type Competitor,
} from '../src/lib/citationSweep.js';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CFG = JSON.parse(readFileSync('private/baselines/sweep-configs.json', 'utf8'));
const REPS: number = CFG.reps ?? 3;
const BUDGET: number = CFG.budget_usd_max ?? 6;
const OUT = 'private/baselines';
mkdirSync(OUT, { recursive: true });

/** Buyer questions instantiated from the RATIFIED category noun. The noun is never
 *  altered; only the question frame around it is standard. */
const categoryQuestions = (cat: string): string[] => [
  `best ${cat}`,
  `top ${cat} for a small business`,
  `what is the best ${cat} for a small team`,
  `affordable ${cat} options`,
  `${cat} alternatives worth considering`,
];

const brandedQuestions = (domain: string): string[] => [`who is ${domain}`, `what is ${domain}`];

let spent = 0;

async function sweepOne(t: any) {
  const engines = configuredEngines() as Engine[];
  const competitors: Competitor[] = (t.competitors || []).map((n: string) => ({ name: n }));
  const runs: SweepRunResult[] = [];
  const tasks: { engine: Engine; query: string; queryType: 'branded' | 'category'; runIndex: number }[] = [];

  for (const e of engines) {
    for (const q of brandedQuestions(t.domain)) for (let i = 0; i < REPS; i++) tasks.push({ engine: e, query: q, queryType: 'branded', runIndex: i });
    for (const q of categoryQuestions(t.category)) for (let i = 0; i < REPS; i++) tasks.push({ engine: e, query: q, queryType: 'category', runIndex: i });
  }

  for (const task of tasks) {
    if (spent >= BUDGET) throw new Error(`BUDGET ABORT at $${spent.toFixed(2)} (max $${BUDGET})`);
    try {
      const a: any = await ENGINE_ADAPTERS[task.engine](task.query);
      spent += a.costUsd || 0;
      runs.push({
        engine: task.engine, query: task.query, queryType: task.queryType, runIndex: task.runIndex,
        transcript: a.transcript, sources: a.sources || [], costUsd: a.costUsd || 0,
        truncated: a.truncated, grounding: a.searchInvoked ? 'search-grounded' : 'model-prior',
      } as SweepRunResult);
    } catch (e: any) {
      runs.push({
        engine: task.engine, query: task.query, queryType: task.queryType, runIndex: task.runIndex,
        transcript: `[error: ${String(e?.message || e).slice(0, 200)}]`, sources: [], costUsd: 0, errored: true,
      } as SweepRunResult);
    }
    process.stderr.write('.');
  }

  const client = { domain: t.domain, brand: t.product };
  const scored = runs.map((r) => scoreRun(r, client, competitors));
  const summary = aggregateSweep(scored, client, competitors);
  const card = sweepScorecard(scored, client, competitors);
  return { target: t, runs: scored, summary, scorecard: card };
}

(async () => {
  const results: any[] = [];
  for (const t of CFG.targets) {
    process.stderr.write(`\n[${t.id}] `);
    try {
      const r = await sweepOne(t);
      writeFileSync(`${OUT}/${t.id}-${t.domain}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(r, null, 1));
      results.push(r);
      const c = r.scorecard;
      process.stderr.write(` branded ${c.brandedRetrievabilityPct}% (N=${c.brandedRuns}) · category ${c.categoryRecommendationWinPct}% (N=${c.categoryRuns}) · errored ${c.erroredRuns} · $${spent.toFixed(2)}`);
    } catch (e: any) {
      process.stderr.write(` FAILED: ${String(e?.message || e).slice(0, 120)}`);
      results.push({ target: t, failed: String(e?.message || e) });
      if (String(e?.message || e).includes('BUDGET ABORT')) break;
    }
  }
  writeFileSync(`${OUT}/_wo-sweep-configs-001-results.json`, JSON.stringify({ spentUsd: Number(spent.toFixed(4)), reps: REPS, results }, null, 1));
  console.log(`\n\nDONE — ${results.length} targets · total engine spend $${spent.toFixed(2)} of $${BUDGET} budget`);
  console.log(`artifacts in ${OUT}/ (gitignored)`);
})();

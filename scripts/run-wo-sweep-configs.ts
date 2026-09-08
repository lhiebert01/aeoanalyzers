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
let LIVE_ENGINES: Engine[] = [];

/** The Sep 7 four-engine run stopped at $6.0161 against a $6.00 authorisation. The guard
 *  checked `spent >= BUDGET` BEFORE each call, so the call that crossed the line had already
 *  been paid for — it detected the overrun instead of preventing it. A budget that can be
 *  exceeded is not a budget.
 *
 *  Now: RESERVE the cost of the next call before making it, using the most expensive call
 *  observed so far (with a conservative floor until there is evidence). If the reserve does
 *  not fit under the ceiling, stop before spending, not after. */
let maxCallUsd = 0.02; // conservative floor; rises to the worst call actually seen
function canAfford(): boolean { return spent + maxCallUsd <= BUDGET; }

/** PRE-FLIGHT. The Sep 7 run spent $2.92 before anyone noticed that the Claude adapter
 *  had failed on every single call — the Anthropic balance was too low, and each failure
 *  was caught, badged and correctly excluded, which is right for scoring and useless as
 *  an alarm. Twenty-one errored runs per target is not a per-run fault, it is a dead
 *  engine, and the run should never have started.
 *
 *  So: probe every configured engine with one cheap call FIRST, and refuse to start
 *  unless all of them answer. Fail closed. A partial-engine sweep is a different
 *  measurement, not a degraded one, and it must be a deliberate choice rather than a
 *  discovery made after the money is gone. `ALLOW_PARTIAL_ENGINES=1` makes it deliberate. */
async function preflight(engines: Engine[]) {
  const dead: string[] = [];
  for (const e of engines) {
    try { await ENGINE_ADAPTERS[e]('ping'); }
    catch (err: any) { dead.push(`${e}: ${String(err?.message || err).slice(0, 120)}`); }
  }
  if (dead.length && process.env.ALLOW_PARTIAL_ENGINES !== '1') {
    console.error(`\nPRE-FLIGHT FAILED — ${dead.length} of ${engines.length} engines are not answering:\n`);
    for (const d of dead) console.error(`  ${d}`);
    console.error(`\nNo sweep started and nothing was spent.`);
    console.error(`Fix the engine, or set ALLOW_PARTIAL_ENGINES=1 to run a deliberate ${engines.length - dead.length}-engine measurement.`);
    process.exit(1);
  }
  if (dead.length) console.error(`\n[deliberate partial] running without: ${dead.map((d) => d.split(':')[0]).join(', ')}\n`);
  return engines.filter((e) => !dead.some((d) => d.startsWith(e + ':')));
}

async function sweepOne(t: any) {
  const engines = LIVE_ENGINES;
  const competitors: Competitor[] = (t.competitors || []).map((n: string) => ({ name: n }));
  const runs: SweepRunResult[] = [];
  const tasks: { engine: Engine; query: string; queryType: 'branded' | 'category'; runIndex: number }[] = [];

  for (const e of engines) {
    for (const q of brandedQuestions(t.domain)) for (let i = 0; i < REPS; i++) tasks.push({ engine: e, query: q, queryType: 'branded', runIndex: i });
    for (const q of categoryQuestions(t.category)) for (let i = 0; i < REPS; i++) tasks.push({ engine: e, query: q, queryType: 'category', runIndex: i });
  }

  for (const task of tasks) {
    if (!canAfford()) throw new Error(`BUDGET STOP — spent $${spent.toFixed(4)}, next call reserves $${maxCallUsd.toFixed(4)}, ceiling $${BUDGET}. Stopped BEFORE spending.`);
    try {
      const a: any = await ENGINE_ADAPTERS[task.engine](task.query);
      const cost = a.costUsd || 0;
      spent += cost;
      if (cost > maxCallUsd) maxCallUsd = cost;
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
  // Resume-safe: a target that already has a result file is not re-run, so topping up the
  // budget never re-spends on work already banked. ONLY_IDS forces a subset.
  const only = (process.env.ONLY_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
  const { readdirSync } = await import('node:fs');
  const existing = new Set(
    readdirSync(OUT).filter((f) => /^S\d+-.*\.json$/.test(f)).map((f) => f.split('-')[0])
  );
  const todo = CFG.targets.filter((t: any) =>
    only.length ? only.includes(t.id) : !existing.has(t.id)
  );
  if (!todo.length) { console.log('Nothing to do — every target already has a stored result.'); process.exit(0); }
  console.error(`to run: ${todo.map((t: any) => t.id).join(', ')} (${CFG.targets.length - todo.length} already banked)`);

  LIVE_ENGINES = await preflight(configuredEngines() as Engine[]);
  const live = LIVE_ENGINES;
  console.error(`pre-flight OK — ${live.length} engines answering: ${live.join(', ')}`);
  const results: any[] = [];
  for (const t of todo) {
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
      if (String(e?.message || e).includes('BUDGET STOP')) break;
    }
  }
  writeFileSync(`${OUT}/_wo-sweep-configs-001-results.json`, JSON.stringify({ spentUsd: Number(spent.toFixed(4)), reps: REPS, results }, null, 1));
  console.log(`\n\nDONE — ${results.length} targets · total engine spend $${spent.toFixed(2)} of $${BUDGET} budget`);
  console.log(`artifacts in ${OUT}/ (gitignored)`);
})();

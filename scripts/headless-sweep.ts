// Headless Citation Sweep — reuses the app's REAL engine adapters + scoring so the
// output matches production exactly (only difference: not persisted to Supabase).
// Used to generate a real sweep JSON for a hand-drafted Executive Report.
//
//   npx tsx scripts/headless-sweep.ts   (params + keys via env; see run-sweep.sh)
//
// Env in:  SWEEP_DOMAIN, SWEEP_BRAND, SWEEP_BRANDED (json[]), SWEEP_CATEGORY (json[]),
//          SWEEP_COMPETITORS (json[{name,domain}]), SWEEP_REPS (default 3),
//          + the provider keys (ANTHROPIC/OPENAI/PERPLEXITY/GEMINI).
// Out:     JSON {domain, brand, summary, runs} to stdout.

import { readFileSync } from "node:fs";
import { ENGINE_ADAPTERS, configuredEngines } from "../api/_lib/engines.js";
import { scoreRun, aggregateSweep, type SweepRunResult, type Competitor } from "../src/lib/citationSweep.js";
import { extractTruthRecord } from "../src/lib/truthRecord.js";

// Load .env into process.env (so the adapters find the provider keys).
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* .env optional if keys already exported */ }

const domain = process.env.SWEEP_DOMAIN || "";
const brand = process.env.SWEEP_BRAND || "";
const brandedQueries: string[] = JSON.parse(process.env.SWEEP_BRANDED || "[]");
const categoryQueries: string[] = JSON.parse(process.env.SWEEP_CATEGORY || "[]");
const competitors: Competitor[] = JSON.parse(process.env.SWEEP_COMPETITORS || "[]");
const reps = Number(process.env.SWEEP_REPS || 3);
const engines = configuredEngines();

if (!domain || (!brandedQueries.length && !categoryQueries.length)) {
  console.error("need SWEEP_DOMAIN + at least one query"); process.exit(1);
}

type Task = { engine: any; query: string; queryType: "branded" | "category"; runIndex: number };
const tasks: Task[] = [];
for (const engine of engines) {
  for (const q of brandedQueries) for (let r = 0; r < reps; r++) tasks.push({ engine, query: q, queryType: "branded", runIndex: r });
  for (const q of categoryQueries) for (let r = 0; r < reps; r++) tasks.push({ engine, query: q, queryType: "category", runIndex: r });
}
console.error(`engines=${engines.join(",")} | ${tasks.length} runs (${brandedQueries.length} branded + ${categoryQueries.length} category × ${reps} × ${engines.length})`);

// BUDGET GUARD (WO-AEO-BRANDED-ACCURACY-004 §5). Reserve the cost of the next call — the most
// expensive call seen so far, with a floor — BEFORE making it; stop before spending, never after.
// Only meaningful sequentially, so BUDGET_USD forces concurrency 1.
const BUDGET = process.env.BUDGET_USD ? Number(process.env.BUDGET_USD) : Infinity;
let spent = 0, maxCallUsd = 0.03, budgetStopped = false;
async function runOne(t: Task): Promise<SweepRunResult> {
  const base: SweepRunResult = { engine: t.engine, query: t.query, queryType: t.queryType, runIndex: t.runIndex, transcript: "", sources: [], costUsd: 0 };
  if (budgetStopped || spent + maxCallUsd > BUDGET) {
    budgetStopped = true;
    return { ...base, transcript: `[error: BUDGET STOP before spending — spent $${spent.toFixed(4)}, next call reserves $${maxCallUsd.toFixed(4)}, ceiling $${BUDGET}]` } as SweepRunResult;
  }
  try {
    const answer = await ENGINE_ADAPTERS[t.engine](t.query);
    spent += answer.costUsd || 0; if ((answer.costUsd || 0) > maxCallUsd) maxCallUsd = answer.costUsd || 0;
    return scoreRun({ ...base, ...answer } as SweepRunResult, { domain, brand }, competitors);
  } catch (err: any) {
    return scoreRun({ ...base, transcript: `[error: ${err?.message || err}]` }, { domain, brand }, competitors);
  }
}

// Small concurrency pool (be gentle on the engines).
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); process.stderr.write("."); }
  }));
  process.stderr.write("\n");
  return out;
}

// PRE-FLIGHT: every engine answers one cheap call first, or nothing is spent (fail closed).
if (process.env.SKIP_PREFLIGHT !== "1") {
  const dead: string[] = [];
  for (const e of engines) { try { await (ENGINE_ADAPTERS as any)[e]("ping"); } catch (err: any) { dead.push(`${e}: ${String(err?.message || err).slice(0, 100)}`); } }
  if (dead.length) { console.error(`PRE-FLIGHT FAILED — nothing spent:\n  ${dead.join("\n  ")}`); process.exit(1); }
  console.error(`pre-flight OK — ${engines.join(", ")}`);
}
// The site's own facts at run time — what accuracy-when-named is checked against. Point-in-time.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
const get = async (u: string) => { try { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) }); return r.ok ? await r.text() : null; } catch { return null; } };
const html = await get(`https://${domain}`);
const truth = html ? extractTruthRecord(html, await get(`https://${domain}/llms.txt`)) : null;
const runs = await pool(tasks, Number.isFinite(BUDGET) ? 1 : Number(process.env.SWEEP_CONCURRENCY || 4), runOne);
const summary = aggregateSweep(runs, { domain, brand }, competitors);
const cost = runs.reduce((s, r) => s + (r.costUsd || 0), 0);
console.error(`done. total engine cost ≈ $${cost.toFixed(4)}`);
if (budgetStopped) console.error(`BUDGET STOP — stopped before spending at $${spent.toFixed(4)} of $${BUDGET}`);
console.log(JSON.stringify({ domain, brand, generatedAtNote: "stamp date after run", budgetUsd: Number.isFinite(BUDGET) ? BUDGET : null, budgetStopped, truth, truthReadAtUtc: new Date().toISOString(), summary, runs }, null, 2));

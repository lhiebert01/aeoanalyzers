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

async function runOne(t: Task): Promise<SweepRunResult> {
  const base: SweepRunResult = { engine: t.engine, query: t.query, queryType: t.queryType, runIndex: t.runIndex, transcript: "", sources: [], costUsd: 0 };
  try {
    const answer = await ENGINE_ADAPTERS[t.engine](t.query);
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

const runs = await pool(tasks, Number(process.env.SWEEP_CONCURRENCY || 4), runOne);
const summary = aggregateSweep(runs, { domain, brand }, competitors);
const cost = runs.reduce((s, r) => s + (r.costUsd || 0), 0);
console.error(`done. total engine cost ≈ $${cost.toFixed(4)}`);
console.log(JSON.stringify({ domain, brand, generatedAtNote: "stamp date after run", summary, runs }, null, 2));

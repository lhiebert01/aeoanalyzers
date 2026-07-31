// One command: prospect domain -> review-ready AI Visibility Executive Report +
// DRAFT outreach email. WO-AEO-EXECREPORT-001 (minimal generator, step 4).
//
//   npx tsx scripts/exec-report.ts   (params + keys via env)
//
// Env in:  EXEC_DOMAIN (required), EXEC_BRAND, EXEC_BRANDED (json[]),
//          EXEC_CATEGORY (json[]), EXEC_COMPETITORS (json[{name,domain}]),
//          EXEC_REPS (default 2), EXEC_VARIANT (courtesy|paid, default courtesy),
//          EXEC_LLM (=1 to generate narrative prose via Anthropic; default OFF =
//          deterministic placeholder), EXEC_OUT (output dir, default ./exec-out),
//          + provider keys (ANTHROPIC/OPENAI/PERPLEXITY/GEMINI).
// Out:     <EXEC_OUT>/<domain>-<date>.{report.md,email.txt,narrative-prompt.txt,data.json}
//
// NOTHING is sent. The email is a DRAFT the admin copies into their own client
// after review (WO Phase 4 hard rule).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { ENGINE_ADAPTERS, configuredEngines } from '../api/_lib/engines.js';
import { scoreRun, type SweepRunResult, type Competitor } from '../src/lib/citationSweep.js';
import { extractTruthRecord } from '../src/lib/truthRecord.js';
import {
  assembleReportData, defaultNarrative, renderExecReport, buildOutreachEmail,
  buildNarrativePrompt, NARRATIVE_SCHEMA, containsGrayHat,
  type ExecNarrative, type ReportVariant,
} from '../src/lib/execReport.js';

// CONFIRMED PIGENAI LLC legal + postal address (founder-approved for email footers).
const POSTAL_ADDRESS = 'PIGENAI LLC · 5901 NW 63rd Ter, Apt 301 · Kansas City, MO 64151';
// PLACEHOLDER opt-out — final wording set in the template session.
const OPT_OUT = 'Not useful? Reply "no thanks" and I won\'t reach out again.';
const SENDER = 'Lindsay Hiebert';

// Load .env so the adapters + Anthropic find the keys.
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env optional if keys already exported */ }

const domain = (process.env.EXEC_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
const brand = process.env.EXEC_BRAND || '';
const brandedQueries: string[] = JSON.parse(process.env.EXEC_BRANDED || '["who is {domain}","what is {domain}"]').map((q: string) => q.replace(/\{domain\}/g, domain));
const categoryQueries: string[] = JSON.parse(process.env.EXEC_CATEGORY || '[]');
const competitors: Competitor[] = JSON.parse(process.env.EXEC_COMPETITORS || '[]');
const reps = Number(process.env.EXEC_REPS || 2);
const variant = (process.env.EXEC_VARIANT === 'paid' ? 'paid' : 'courtesy') as ReportVariant;
const outDir = process.env.EXEC_OUT || 'exec-out';

if (!domain) { console.error('EXEC_DOMAIN is required'); process.exit(1); }
if (!categoryQueries.length) { console.error('EXEC_CATEGORY (buyer questions) is required for a category-win reading'); process.exit(1); }

const UA = 'Mozilla/5.0 (compatible; AEOAnalyzers-ExecReport/1.0; +https://aeoanalyzers.com)';

async function fetchSite(d: string): Promise<{ html: string; llms: string | null }> {
  const get = async (url: string) => {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'follow' });
      return r.ok ? await r.text() : null;
    } catch { return null; }
  };
  const html = (await get(`https://${d}`)) || (await get(`https://www.${d}`)) || '';
  const llms = await get(`https://${d}/llms.txt`);
  return { html, llms };
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); process.stderr.write('.'); }
  }));
  process.stderr.write('\n');
  return out;
}

async function generateNarrativeLLM(promptText: string): Promise<ExecNarrative | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const client = new Anthropic({ apiKey: key });
    const model = process.env.EXEC_LLM_MODEL || 'claude-sonnet-5';
    const resp: any = await client.messages.create({
      model, max_tokens: 2000,
      system: 'Return ONLY valid JSON matching the requested shape. No prose outside the JSON.',
      messages: [{ role: 'user', content: `${promptText}\n\nJSON schema: ${JSON.stringify(NARRATIVE_SCHEMA)}` }],
    });
    const text = (resp.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    // Gray-hat backstop: reject a draft that recommends a gray-hat tactic.
    const gray = containsGrayHat([json.headlineFinding, json.whyThisMatters, ...(json.findings || []), ...(json.recommendations || [])].join('\n'));
    if (!gray.ok) { console.error(`[narrative] rejected LLM draft (gray-hat: ${gray.hits.join(', ')}); using placeholder`); return null; }
    return json as ExecNarrative;
  } catch (e: any) {
    console.error(`[narrative] LLM failed (${e?.message}); using placeholder`);
    return null;
  }
}

async function main() {
  const engines = configuredEngines();
  if (!engines.length) { console.error('no provider keys configured'); process.exit(1); }

  type Task = { engine: any; query: string; queryType: 'branded' | 'category'; runIndex: number };
  const tasks: Task[] = [];
  for (const engine of engines) {
    for (const q of brandedQueries) for (let r = 0; r < reps; r++) tasks.push({ engine, query: q, queryType: 'branded', runIndex: r });
    for (const q of categoryQueries) for (let r = 0; r < reps; r++) tasks.push({ engine, query: q, queryType: 'category', runIndex: r });
  }
  console.error(`engines=${engines.join(',')} | ${tasks.length} runs | fetching ${domain} …`);

  const site = await fetchSite(domain);
  const truth = site.html ? extractTruthRecord(site.html, site.llms) : null;
  const client = { domain, brand };

  const runs: SweepRunResult[] = await pool(tasks, Number(process.env.EXEC_CONCURRENCY || 4), async (t) => {
    const base: SweepRunResult = { engine: t.engine, query: t.query, queryType: t.queryType, runIndex: t.runIndex, transcript: '', sources: [], costUsd: 0 };
    try {
      const answer = await ENGINE_ADAPTERS[t.engine](t.query);
      const grounding: SweepRunResult['grounding'] = answer.searchInvoked ? 'search-grounded' : 'model-prior';
      return scoreRun({ ...base, ...answer, truncated: !!answer.truncated, grounding }, client, competitors);
    } catch (err: any) {
      return scoreRun({ ...base, transcript: `[error: ${err?.message || err}]` }, client, competitors);
    }
  });

  const sweepDate = new Date().toISOString().slice(0, 10);
  const data = assembleReportData({ brand: brand || truth?.brandName || domain, domain, sweepDate, runs, competitors, truth });

  const promptText = buildNarrativePrompt(data);
  const llmNarrative = process.env.EXEC_LLM === '1' ? await generateNarrativeLLM(promptText) : null;
  const narrative = llmNarrative || defaultNarrative(data);

  const report = renderExecReport(data, narrative, variant);
  const email = buildOutreachEmail(data, narrative, { postalAddress: POSTAL_ADDRESS, optOut: OPT_OUT, senderName: SENDER });

  mkdirSync(outDir, { recursive: true });
  const stem = `${outDir}/${domain}-${sweepDate}`;
  writeFileSync(`${stem}.report.md`, report);
  writeFileSync(`${stem}.email.txt`, `Subject: ${email.subject}\n\n${email.body}\n`);
  writeFileSync(`${stem}.narrative-prompt.txt`, promptText); // paste into chat-Claude to refine the prose
  writeFileSync(`${stem}.data.json`, JSON.stringify(data, null, 2));

  const cost = runs.reduce((s, r) => s + (r.costUsd || 0), 0);
  console.error(`done. variant=${variant} · cost ≈ $${cost.toFixed(4)} · narrative=${llmNarrative ? 'llm' : 'placeholder'}`);
  console.error(`REVIEW then copy the email into your own client (nothing was sent):`);
  console.error(`  ${stem}.report.md`);
  console.error(`  ${stem}.email.txt`);
}

main().catch((e) => { console.error(e); process.exit(1); });

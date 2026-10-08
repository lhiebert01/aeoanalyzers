// WO-AEO-SWEEP-RERUN-002 — re-score September + October stored runs with the CURRENT code and
// assemble the findings. Writes only to private/ (gitignored) and the founder's Downloads.
//   npx tsx scripts/rerun-002-report.ts
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { scoreRun, sweepScorecard, type SweepRunResult, type Competitor } from '../src/lib/citationSweep.js';

const SEP = 'private/baselines';
const OCT = 'private/baselines/rerun-2026-10-08';
const CFG = JSON.parse(readFileSync(`${SEP}/sweep-configs.json`, 'utf8'));
const WO_SEP: Record<string, number> = { S1: 53, S2: 36, S3: 18, S4: 3, S5: 18, S6: 87, S7: 6, S8: 91 };

function load(dir: string, id: string) {
  const f = readdirSync(dir).find((x) => x.startsWith(`${id}-`) && x.endsWith('.json'));
  if (!f) return null;
  const d = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  return { file: f, target: d.target, runs: d.runs as SweepRunResult[], spent: d.runs.reduce((a: number, r: any) => a + (r.costUsd || 0), 0) };
}
/** "Opened" value: re-scored by the current code, errored runs excluded, strict branded rule. */
function rescore(t: any, runs: SweepRunResult[]) {
  const client = { domain: t.domain, brand: t.product };
  const comps: Competitor[] = (t.competitors || []).map((n: string) => ({ name: n }));
  const scored = runs.filter((r: any) => !r.errored && !/^\s*\[error:/i.test(r.transcript || '')).map((r) => scoreRun(r, client, comps));
  const sc = sweepScorecard(scored, client, comps);
  const winner = sc.topCompetitors[0];
  const errored = runs.length - scored.length;
  return { sc, winner, errored, scored };
}
const rows: string[] = ['id,target,domain,category_rate_pct_rescored,N,named_winner,transcript_ref,sep_rate_pct,delta_points,honest_finding_yn,one_sentence'];
const md: string[] = [`# WO-AEO-SWEEP-RERUN-002 — findings (re-scored by the current code). GITIGNORED.`, '', `Measured ${new Date().toISOString().slice(0, 10)} · four engines · three reps · one date. September comparator: the 7–8 Sep stored runs, re-scored by the SAME code today (the work order's table figures are shown beside them where they differ).`, ''];
let spentTotal = 0; const stories: string[] = []; const failed: string[] = [];
for (const t of CFG.targets) {
  const sep = load(SEP, t.id); const oct = load(OCT, t.id);
  if (!oct) { failed.push(`${t.id} ${t.domain}: no October result file`); continue; }
  spentTotal += oct.spent;
  const o = rescore(t, oct.runs); const s = sep ? rescore(t, sep.runs) : null;
  const octPct = o.sc.categoryRecommendationWinPct; const sepPct = s ? s.sc.categoryRecommendationWinPct : null;
  const delta = octPct !== null && sepPct !== null ? octPct - sepPct : null;
  const winning = octPct !== null && octPct >= 50;
  const winner = o.winner ? `${o.winner.name} ${o.winner.count}×` : '—';
  const nOct = o.sc.categoryRuns;
  const ref = `${OCT}/${oct.file}`;
  const honest = !winning && octPct !== null && o.winner ? 'Y' : 'N';
  const sentence = octPct === null ? 'Category unmeasured this month (no search-grounded answers); nothing to write.'
    : winning ? `They win their category (${octPct}%); no email is written for a winner.`
    : `On ${t.category} questions, the engines named ${o.winner?.name} in ${o.winner?.count} of ${nOct} search-grounded answers and ${t.product} in ${o.sc.categoryRuns ? Math.round((octPct / 100) * nOct) : 0}.`;
  rows.push([t.id, t.product, t.domain, octPct ?? '', nOct, winner, ref, sepPct ?? '', delta ?? '', honest, `"${sentence.replace(/"/g, "'")}"`].join(','));
  md.push(`## ${t.id} — ${t.product} (${t.domain})`, `Category noun, verbatim: *${t.category}*`, '',
    `- October: branded **${o.sc.brandedRetrievabilityPct}%** (N=${o.sc.brandedRuns}) · category **${octPct === null ? 'unmeasured' : octPct + '%'}** (N=${nOct} search-grounded) · model-prior ${o.sc.modelPriorRuns} · errored ${o.errored} · spend $${oct.spent.toFixed(4)}`,
    `- Named instead (October): ${o.sc.topCompetitors.slice(0, 3).map((c) => `**${c.name}** ${c.count}×`).join(', ') || '—'}`,
    `- September re-scored: category **${sepPct === null ? 'unmeasured' : sepPct + '%'}** (N=${s?.sc.categoryRuns ?? '—'})${sepPct !== null && sepPct !== WO_SEP[t.id] ? ` — the order's table says ${WO_SEP[t.id]}% (first-stored); the re-scored value is the one to quote` : ''}`,
    `- Delta: **${delta === null ? '—' : (delta > 0 ? '+' : '') + delta} points**`,
    `- Transcripts: \`${ref}\``, '', `**${honest === 'Y' ? 'FINDING' : 'NO FINDING'}** — ${sentence}`, '');
  if (delta !== null && Math.abs(delta) >= 10 && !winning) stories.push(`${t.id} ${t.product}: ${sepPct}% → ${octPct}% (${delta > 0 ? '+' : ''}${delta}) — two dates on the same panel; the pairing is the opening.`);
  else if (delta !== null && Math.abs(delta) >= 10 && winning) stories.push(`${t.id} ${t.product}: ${sepPct}% → ${octPct}% (${delta > 0 ? '+' : ''}${delta}) — but still winning; no email.`);
}
md.push('## Spend', `Total engine spend: **$${spentTotal.toFixed(4)}** against the **$8.00** authorisation (summed from per-run costUsd).`, failed.length ? `Failed: ${failed.join('; ')}` : 'Nothing failed.', '');
md.push('## Two dates that make a story (|delta| ≥ 10 points)', ...(stories.length ? stories.map((x) => `- ${x}`) : ['- None — every target moved less than ten points; each email opens on the single October number with September as support.']), '');
writeFileSync(`${OCT}/_findings.csv`, rows.join('\n')); writeFileSync(`${OCT}/_FINDINGS.md`, md.join('\n'));
for (const [src, dst] of [[`${OCT}/_findings.csv`, 'WO-AEO-SWEEP-RERUN-002-findings-2026-10-08.csv'], [`${OCT}/_FINDINGS.md`, 'WO-AEO-SWEEP-RERUN-002-FINDINGS-2026-10-08.md']]) writeFileSync(`/mnt/c/Users/Linds/Downloads/${dst}`, readFileSync(src));
console.log(md.join('\n'));

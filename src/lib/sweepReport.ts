// WO-AEO-REPORT-POLISH-001 Lane C — the Citation Sweep report as ONE pure function.
//
// The report text used to be a closure inside SweepDashboard.tsx, so it could only be produced
// by clicking. Now the .md download, the .docx download, the saved view and (Lane E) the PDF all
// call buildSweepReport with the same inputs, and a test can regenerate the founder's Nybsys
// 2026-09-30 report from the stored runs and text-extract page 1.
//
// Section order follows the reader's question, not the pipeline (order §C.3):
//   cover → What AI believes about you → Where you win and lose → Who got named instead →
//   Sources the engines trust → Action plan → Methodology → Appendix: transcripts.
// Nothing that was in the report is removed; it is reordered and re-set. Metric labels show
// the plain-English label first and the precise label second (Lane F).

import { sweepScorecard, confidenceLevel, type SweepSummary, type SweepRunResult, type Competitor } from './citationSweep';
import { segmentBreakdown, winnableSegment, segmentSummaryNote, classifyQuerySegment, SEGMENT_LABEL } from './querySegment';
import { tierForDomain, TIER_LABEL } from './authorityTiers';
import type { AuthorityGapReport } from './authorityGap';
import type { FidelitySummary } from './fidelity';
import type { EntityLinkingReport } from './entityLinking';
import type { TruthRecord } from './truthRecord';
import type { FactDensityAudit } from './factDensity';
import { extractBeliefs, beliefsMarkdown, flaggedWrongValues } from './beliefs';
import { buildDoNowPlan, type DoNowStep } from './doNowPlan';
import { buildSweepActionAgenda } from './sweepActions';
import { doNowChecklist } from './doNowChecklist';
import { buildCover, sweepMeaning, DIRECTIVE, type CoverInput } from './reportCover';
import { pawcSplit, mentionsClient, PROMINENT_FOOTNOTE } from './pawcSplit';

export interface SweepResponse {
  domain: string; brand: string | null; runsPerQuery: number;
  engines: string[]; skippedEngines: string[]; configured: string[];
  summary: SweepSummary; runs: SweepRunResult[]; persisted: boolean;
  generatedAt?: string;
  quickCheck?: boolean; tier?: string;
  provisional?: { score: number; label: string; message: string } | null;
  upgrade?: string | null;
}

export interface BotStatsLike { configured?: boolean; totalHits?: number; days?: number; tierTotals?: Record<string, number> }

export interface SweepReportInputs {
  result: SweepResponse;
  competitors: Competitor[];
  fidelity: FidelitySummary | null;
  entityLinking: EntityLinkingReport | null;
  authority: AuthorityGapReport | null;
  bots: BotStatsLike | null;
  truth: TruthRecord | null;
  pageFactDensity: FactDensityAudit | null;
  ownedDomains: string[];
  isAdmin: boolean;
  savedView: boolean;
  preparedBy?: string | null;
  /** Injected so a rebuilt report is reproducible in a test. */
  now?: Date;
}

export const ENGINE_LABEL: Record<string, string> = { claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini' };

/** Lane F aliases — plain label first, precise label second. "Pick Rate" is never used. */
export const ALIAS = {
  retrievability: { plain: 'Found when asked by name', precise: 'Branded retrievability' },
  categoryWin: { plain: 'Recommended to new buyers', precise: 'Category citation win' },
  owned: { plain: 'Your own site cited as the source', precise: 'Owned citation rate' },
  share: { plain: 'Your share of the recommendations', precise: 'Share of category' },
  modelPrior: { plain: 'Answered from memory (no search)', precise: 'Model-prior' },
} as const;

/** The earned-tier pages that already answer the customer's category questions, minus rivals.
 *  ONE derivation for the report and the screen, so the two cannot diverge. */
export function pitchTargetsFrom(auth: AuthorityGapReport | null, competitors: Competitor[]) {
  if (!auth) return [];
  const rivals = competitors.map((c) => (c.domain || '').toLowerCase().replace(/^www\./, '')).filter(Boolean);
  return auth.authorityDomains
    .filter((d) => tierForDomain(d.domain).tier === 'earned' && d.citations >= 2)
    .filter((d) => { const dom = d.domain.toLowerCase(); return !rivals.some((rv) => dom === rv || dom.endsWith('.' + rv)); })
    .map((d) => ({ domain: d.domain, citations: d.citations }));
}

const fmtDate = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date(0);
  return isNaN(d.getTime()) ? String(iso || '') : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

function plan(inp: SweepReportInputs) {
  const { result: r, fidelity, entityLinking, authority, isAdmin } = inp;
  return buildDoNowPlan({
    domain: r.domain,
    perEngine: r.summary.engines.map((e) => ({ engine: ENGINE_LABEL[e.engine] || e.engine, found: e.brandedCited, total: e.brandedRuns })),
    drifted: fidelity ? fidelity.citedDrifted : undefined,
    collisions: entityLinking?.collisions ?? [],
    authorityGap: authority ? authority.authorityDomains.map((d) => ({ domain: d.domain, citations: d.citations })) : [],
    pitchTargets: pitchTargetsFrom(authority, inp.competitors),
    paid: !!isAdmin || r.tier !== 'free',
  });
}

/** Lane D — the prominent/mentioned split over the answers that name the client. */
export function splitFor(r: SweepResponse, runs: SweepRunResult[]) {
  return pawcSplit(runs.map((x) => x.transcript || ''), mentionsClient({ domain: r.domain, brand: r.brand }));
}
const groundedCategory = (r: SweepResponse) => r.runs.filter((x) => x.queryType === 'category' && !x.truncated && x.grounding !== 'model-prior');

function losingQuestions(r: SweepResponse): string[] {
  return [...new Set(r.runs.filter((x) => x.queryType === 'category' && !x.cited && !x.truncated && x.grounding !== 'model-prior').map((x) => x.query))];
}

/** The cover's inputs — also what the on-screen CoverCard renders, so numbers cannot differ. */
export function buildSweepCover(inp: SweepReportInputs): CoverInput {
  const { result: r, fidelity, entityLinking } = inp;
  const client = { domain: r.domain, brand: r.brand || undefined };
  const sc = sweepScorecard(r.runs, client, inp.competitors);
  const segs = segmentBreakdown(r.runs);
  const conf = (n: number) => `N=${n} · ${confidenceLevel(n)} confidence`;
  const val = (v: number | null) => (v === null ? 'Unmeasured' : `${v}%`);
  const brand = r.brand || r.domain;
  const named = (sc.topCompetitors.length ? sc.topCompetitors : r.summary.topCompetitors).slice(0, 5)
    .map((c) => ({ name: c.name, count: c.count, seeded: (c as { seeded?: boolean }).seeded }));
  const best = winnableSegment(segs);
  const meaning = sweepMeaning({
    brand,
    brandedPct: sc.brandedRetrievabilityPct, brandedN: sc.brandedRuns,
    categoryPct: sc.categoryRecommendationWinPct, categoryN: sc.categoryRuns,
    ownedPct: sc.ownedCitationRatePct,
    topNamed: named[0] ? { name: named[0].name, count: named[0].count } : null,
    modelPriorRuns: sc.modelPriorRuns,
    drifted: fidelity ? fidelity.citedDrifted : undefined,
    collisions: entityLinking?.collisions ?? [],
    bestSegment: best ? { label: SEGMENT_LABEL[best.segment], winPct: best.winPct, n: best.categoryRuns } : null,
  });
  const p = plan(inp);
  const firstThree = p.steps.length
    ? p.steps.slice(0, 3).map((s: DoNowStep) => ({ what: s.what, section: 'Action plan' }))
    : losingQuestions(r).slice(0, 3).map((q) => ({ what: `Write the page that answers: “${q}”`, section: 'Action plan' }));
  return {
    title: `Citation Sweep — ${r.domain}`,
    brand: r.brand,
    domain: r.domain,
    date: fmtDate(r.generatedAt),
    preparedBy: inp.preparedBy || 'AEO Analyzers',
    headlines: [
      { plain: ALIAS.retrievability.plain, precise: ALIAS.retrievability.precise, value: val(sc.brandedRetrievabilityPct), note: sc.brandedRuns ? conf(sc.brandedRuns) : undefined },
      { plain: ALIAS.categoryWin.plain, precise: `${ALIAS.categoryWin.precise} — search-grounded answers only`, value: val(sc.categoryRecommendationWinPct), note: sc.categoryRuns ? `${conf(sc.categoryRuns)} · ${(() => { const p = splitFor(r, groundedCategory(r)); return `${p.prominent} prominent / ${p.mentioned} mentioned`; })()}` : undefined },
      { plain: ALIAS.owned.plain, precise: ALIAS.owned.precise, value: val(sc.ownedCitationRatePct), note: sc.ownedCitationN ? conf(sc.ownedCitationN) : undefined },
    ],
    barsTitle: 'Recommended to new buyers, by the kind of question asked',
    bars: segs.filter((s) => s.segment !== 'branded').map((s) => ({ label: SEGMENT_LABEL[s.segment], pct: s.categoryRuns ? s.winPct : null, detail: `N=${s.categoryRuns}` })),
    namedInstead: named,
    meaning,
    firstThree,
    pointer: `Every one of the ${r.runs.length} answers behind these numbers is in the appendix, verbatim.`,
  };
}

export function buildSweepReport(inp: SweepReportInputs): string {
  const { result: r, fidelity, entityLinking, authority, bots, truth, pageFactDensity, ownedDomains, isAdmin, savedView } = inp;
  const L = (eng: string) => ENGINE_LABEL[eng] || eng;
  const out: string[] = [];
  const client = { domain: r.domain, brand: r.brand || undefined };
  const sc = sweepScorecard(r.runs, client, inp.competitors);
  const now = inp.now || new Date();

  // ── Page 1: the cover ──
  out.push(...buildCover(buildSweepCover(inp)));
  // The self-describing header lines (kept from the original report, so a saved-view download
  // still states what it is and when it was rebuilt).
  out.push(`Generated: ${new Date(r.generatedAt || now).toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  if (savedView) out.push(`Rebuilt: ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC from stored transcripts`);
  out.push(`Runs per query: ${r.runsPerQuery} · Engines: ${r.configured.join(', ') || 'none'}${r.skippedEngines?.length ? ` · Skipped (no API key): ${r.skippedEngines.join(', ')}` : ''}`);
  if (isAdmin) out.push(`Total sweep cost: ~$${r.summary.totalCostUsd.toFixed(3)}`);
  out.push('');

  // ── What AI believes about you ──
  out.push(DIRECTIVE.pagebreak);
  out.push('## What AI believes about you');
  out.push(sc.plainSummary);
  out.push('');
  {
    const brandedRuns = r.runs.filter((x) => x.queryType === 'branded');
    const rows = extractBeliefs(brandedRuns, r.brand || truth?.brandName || undefined, flaggedWrongValues(fidelity));
    const md = beliefsMarkdown(rows, brandedRuns.length, '###');
    if (md.length) out.push(...md.map((l) => (l.startsWith('### ') ? '### Every claim the engines made, counted' : l)));
  }
  {
    const brandedNamed = r.runs.filter((x) => x.queryType === 'branded' && !x.truncated && (x.transcript || '').trim());
    const p = splitFor(r, brandedNamed);
    if (p.prominent + p.mentioned > 0) {
      out.push(`Of the ${brandedNamed.length} branded answers, **${p.prominent}** recommended you prominently and **${p.mentioned}** mentioned you.`);
      out.push('');
    }
  }
  if (fidelity && (fidelity.citedAccurate > 0 || fidelity.citedDrifted > 0)) {
    out.push('### Fidelity — is AI accurate about you?');
    out.push(`Of the answers that named you, **${fidelity.citedAccurate}** got your facts right${fidelity.citedDrifted > 0 ? ` and **${fidelity.citedDrifted}** drifted (asserted a fact your site contradicts)` : ' — no fabricated facts detected'}.`);
    for (const iss of fidelity.issues) out.push(`- ${iss.wrong ? `"${iss.wrong}": ` : ''}${iss.detail}`);
    out.push('');
  }
  if (entityLinking && entityLinking.collisions.length > 0) {
    out.push('### Entity-linking — who engines confuse you with');
    out.push(`Engines are confusing you with: ${entityLinking.collisions.join(', ')}.`);
    for (const f of entityLinking.flags) out.push(`- [${f.kind}] ${f.detail} (${f.source})`);
    out.push('Fix: an explicit "not affiliated with…" disambiguation line + a connected @id entity graph.');
    out.push('');
  }

  // ── Where you win and lose ──
  out.push('## Where you win and lose');
  const scoreCell = (v: number | null, n: number) => (v === null ? '—' : `**${v}%** (N=${n}, ${confidenceLevel(n)} confidence)`);
  out.push('| What it measures | Result |');
  out.push('| --- | --- |');
  out.push(`| **${ALIAS.retrievability.plain}** — ${ALIAS.retrievability.precise.toLowerCase()} | ${scoreCell(sc.brandedRetrievabilityPct, sc.brandedRuns)} |`);
  out.push(`| **${ALIAS.categoryWin.plain}** — ${ALIAS.categoryWin.precise.toLowerCase()} | ${scoreCell(sc.categoryRecommendationWinPct, sc.categoryRuns)} |`);
  out.push(`| **${ALIAS.owned.plain}** — ${ALIAS.owned.precise.toLowerCase()} | ${scoreCell(sc.ownedCitationRatePct, sc.ownedCitationN)} |`);
  out.push(`| **${ALIAS.share.plain}** — ${ALIAS.share.precise.toLowerCase()} | ${scoreCell(sc.competitiveSharePct, sc.competitiveShareN)} |`);
  out.push('');
  out.push('_Category win is pooled across engines over **search-grounded runs only**. An answer given from the model\'s memory is reported as unmeasured, never as a zero._');
  out.push('');
  if (sc.modelPriorRuns > 0) {
    out.push(`_${ALIAS.modelPrior.plain}: ${sc.modelPriorRuns} category answer${sc.modelPriorRuns > 1 ? 's' : ''} came from model memory (no web search) and ${sc.modelPriorRuns > 1 ? 'are' : 'is'} not counted in the score above.${sc.modelPriorVisibilityPct !== null ? ` Of those, the model named you ${sc.modelPriorVisibilityPct}% of the time (model-prior visibility).` : ''}_`);
    out.push('');
  }
  const segs = segmentBreakdown(r.runs);
  if (segs.length > 1) {
    out.push('### By buyer segment');
    out.push('| Segment | Win | N | Recommended (prominent) | Mentioned |');
    out.push('| --- | --- | --- | --- | --- |');
    for (const s of segs) {
      const inSeg = groundedCategory(r).filter((x) => x.grounding !== 'indeterminate' && classifyQuerySegment(x.query, x.queryType) === s.segment);
      const p = splitFor(r, inSeg);
      out.push(`| ${SEGMENT_LABEL[s.segment]} | **${s.winPct}%** | ${s.categoryRuns} | ${p.prominent} | ${p.mentioned} |`);
    }
    out.push('');
    out.push(`_${PROMINENT_FOOTNOTE}_`);
    out.push('');
    out.push(segmentSummaryNote(segs, (s) => `**${s}**`));
    out.push('');
  }

  // ── Who got named instead ──
  const reportCompetitors = sc.topCompetitors.length ? sc.topCompetitors : r.summary.topCompetitors;
  if (reportCompetitors.length) {
    out.push('## Who got named instead');
    out.push('_Every vendor the search-grounded category answers named — by name in the answer, or by domain in the answer or its sources. Counts are runs. "Entered by you" marks the competitors you seeded; the rest were found in the answers._');
    out.push('');
    out.push('| Vendor | Runs | Domain | Entered by you |');
    out.push('|---|---|---|---|');
    for (const c of reportCompetitors.slice(0, 10)) out.push(`| ${c.name} | **${c.count}** | ${(c as { domain?: string }).domain || ''} | ${(c as { seeded?: boolean }).seeded ? 'seeded' : ''} |`);
    if (reportCompetitors.length > 10) out.push(`| _…and ${reportCompetitors.length - 10} more (full list on the saved view)_ | | | |`);
    out.push('');
  }

  // ── Sources the engines trust ──
  if (authority && authority.authorityDomains.length) {
    out.push('## Sources the engines trust');
    out.push('_Grouped by how attainable each is — start with what you can do yourself today._');
    out.push('');
    const topA = authority.authorityDomains.slice(0, 12);
    for (const tier of ['now', 'earned', 'aspirational'] as const) {
      const inTier = topA.filter((d) => tierForDomain(d.domain).tier === tier);
      if (!inTier.length) continue;
      out.push(`### ${TIER_LABEL[tier]}`);
      for (const d of inTier) out.push(`- ${d.domain} · **${d.citations}** — ${tierForDomain(d.domain).rationale}`);
    }
    if (authority.recommendations.length) {
      out.push('');
      out.push('Recommendations:');
      for (const rec of authority.recommendations) out.push(`- ${rec}`);
    }
    out.push('');
  }

  // ── Action plan ──
  out.push(DIRECTIVE.pagebreak);
  out.push('## Action plan');
  out.push('');
  {
    const p = plan(inp);
    for (const line of p.situation) { out.push(line); out.push(''); }
    if (p.gatedNote) { out.push(p.gatedNote); out.push(''); }
    for (const step of p.steps) {
      out.push(`**${step.n}. ${step.what}**`);
      out.push('');
      out.push(step.explainer);
      out.push('');
      out.push(`- Moves: ${step.moves === 'citation' ? 'citation win — being the answer' : step.moves === 'discovery' ? 'discovery — being retrievable at all' : 'accuracy — what engines say once they find you'}`);
      out.push(`- Why it matters for AI answers: ${step.why}`);
      if (step.link) out.push(`- Link: ${step.link}`);
      out.push(`- Time: ${step.time}`);
      out.push(`- What changes: ${step.changes}`);
      out.push(`- What does NOT change: ${step.doesNotChange}`);
      out.push('');
    }
    if (p.noChannelNote) { out.push(p.noChannelNote); out.push(''); }
  }
  for (const line of buildSweepActionAgenda({
    brandedRetrievabilityPct: sc.brandedRetrievabilityPct,
    categoryWinPct: sc.categoryRecommendationWinPct,
    hasFidelityOrCollision: (fidelity?.citedDrifted ?? 0) > 0 || (entityLinking?.collisions.length ?? 0) > 0,
    collisions: entityLinking?.collisions ?? [],
    losingCategoryQuestions: losingQuestions(r),
    doNowAuthorities: authority ? doNowChecklist(authority.authorityDomains) : [],
    brand: r.brand || undefined,
    domain: r.domain,
    served: truth ? { hasOrg: truth.hasOrganization, hasOrgId: truth.hasOrgId, hasDisambiguation: truth.hasDisambiguation, sameAs: truth.sameAs, ownedDomains } : undefined,
  }, { heading: false })) out.push(line);
  out.push('');

  // ── Methodology ──
  out.push(DIRECTIVE.pagebreak);
  out.push('## Methodology — how this was measured');
  out.push(`We asked ${r.configured.length} answer engine${r.configured.length === 1 ? '' : 's'} (${r.configured.map(L).join(', ')}) your questions with web search on, ${r.runsPerQuery} time${r.runsPerQuery === 1 ? '' : 's'} each, and stored every answer verbatim. Three things are measured separately: whether you are found when asked by name, whether you are recommended when buyers ask the category question, and who gets cited instead.`);
  out.push('');
  out.push('- **Search-grounded only.** An answer given from the model\'s memory with no live search is reported as "answered from memory" and never counted as a zero.');
  out.push('- **Strict branded rule.** A branded answer counts as found only when your domain appears in its sources or text; "search ran, site not found" is a miss.');
  out.push('- **Errors excluded.** A run that hit a rate limit or timed out is excluded, not scored zero. Answers cut off by the token cap are not scored.');
  out.push('- **N and confidence.** Every score carries its N; confidence is low under 5, medium to 19, high from 20.');
  out.push('');
  out.push('### Scores by engine');
  for (const e of r.summary.engines) {
    out.push(`**${L(e.engine)}**`);
    if ((e as { errored?: boolean }).errored) {
      out.push('- Service unavailable (engine failed to run — bad/expired key or config; NOT a real 0%)');
    } else if ((e as { insufficientValid?: boolean }).insufficientValid) {
      out.push(`- Insufficient valid runs — all ${(e as { erroredRuns?: number }).erroredRuns ?? 0} runs errored (rate-limit / timeout) and were excluded (NOT a real 0%)`);
    } else if (e.truncatedBlocked) {
      out.push(`- Column unreliable — ${e.truncatedRuns} answers were cut off by the token cap (not a real measurement; re-run at a higher cap).`);
    } else {
      out.push(`- ${ALIAS.retrievability.plain} (${ALIAS.retrievability.precise.toLowerCase()}): **${e.brandedCited}/${e.brandedRuns}** (${e.retrievabilityPct}%)`);
      out.push(e.categoryRuns === 0
        ? `- ${ALIAS.categoryWin.plain} (${ALIAS.categoryWin.precise.toLowerCase()}): Unmeasured — no search invoked${e.modelPriorRuns > 0 ? ` (${e.modelPriorRuns} answered from memory)` : ''}`
        : `- ${ALIAS.categoryWin.plain} (${ALIAS.categoryWin.precise.toLowerCase()}, search-grounded): **${e.citationWinPct}%** · N=${e.categoryRuns}`);
      if ((e as { erroredRuns?: number }).erroredRuns) out.push(`- (${(e as { erroredRuns?: number }).erroredRuns} run(s) errored — excluded from the scores above)`);
      if (e.modelPriorRuns > 0) out.push(`- (${e.modelPriorRuns} ${ALIAS.modelPrior.plain.toLowerCase()} — reported separately, not scored)`);
      if (e.truncatedRuns > 0) out.push(`- (${e.truncatedRuns} truncated answer${e.truncatedRuns > 1 ? 's' : ''} excluded from the scores above)`);
      if (isAdmin) out.push(`- Cost: $${e.costUsd.toFixed(3)}`);
    }
    out.push('');
  }
  if (pageFactDensity && pageFactDensity.flags.length > 0) {
    out.push('### Content depth — the levers that make a page citable');
    out.push('_Effect sizes are findings from the Princeton GEO study (arXiv:2311.09735), not guarantees._');
    for (const f of pageFactDensity.flags) out.push(`- ${f.consequence}`);
    out.push('');
  }
  if (bots && bots.configured) {
    if ((bots.totalHits || 0) === 0) {
      out.push('### AI crawler hits');
      out.push('No telemetry connected for this domain — crawler-hit tracking needs a first-party pixel/log on the site.');
    } else {
      out.push(`### AI crawler hits (${bots.days}d) — ${bots.totalHits} total`);
      for (const t of ['live', 'search', 'training']) out.push(`- ${t}: ${bots.tierTotals?.[t] || 0}`);
    }
    out.push('');
  }

  // ── Appendix ──
  out.push(DIRECTIVE.pagebreak);
  out.push(`## Appendix — transcripts (${r.runs.length} runs)`);
  out.push('');
  for (const run of r.runs) {
    const tag = /^\s*\[error:/i.test(run.transcript || '')
      ? 'errored — excluded'
      : run.truncated ? 'truncated — not scored'
      : (run as { siteNotFound?: boolean }).siteNotFound ? 'search ran — site not found'
      : run.cited ? 'cited' : 'not cited';
    const prior = run.grounding === 'model-prior' && !run.truncated ? ' · answered from memory' : '';
    out.push(`### [${tag}${prior}] ${L(run.engine)} · ${run.queryType}: ${run.query}`);
    out.push(run.transcript || '(no answer)');
    if (run.sources?.length) out.push(`Sources: ${run.sources.join(' · ')}`);
    out.push('');
    out.push('---');
    out.push('');
  }
  return out.join('\n');
}

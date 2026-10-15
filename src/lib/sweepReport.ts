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

import { sweepScorecard, confidenceLabel, CONFIDENCE_RULE, type SweepSummary, type SweepRunResult, type Competitor } from './citationSweep';
import { segmentBreakdown, winnableSegment, segmentSummaryNote, classifyQuerySegment, SEGMENT_LABEL } from './querySegment';
import { tierForDomain, TIER_LABEL } from './authorityTiers';
import type { AuthorityGapReport } from './authorityGap';
import type { FidelitySummary } from './fidelity';
import type { EntityLinkingReport } from './entityLinking';
import type { TruthRecord } from './truthRecord';
import type { FactDensityAudit } from './factDensity';
import { extractBeliefs, beliefsMarkdown, flaggedWrongValues, flaggedSiteValues } from './beliefs';
import { buildDoNowPlan, type DoNowStep } from './doNowPlan';
import { displayQuestion, sweepAgendaBlocks, renderOwnerGroups, MEASURE_AGAIN, type SweepActionInputs } from './sweepActions';
import { coverageHeadline, coverageAction, corroboration, corroborationLine, vendorBase, vendorBaseLine } from './sourceCoverage';
import type { WatchFigure, OwnerTag } from './ownerTags';
import { measuredAfter, recordSection, type RecordEntry, type SweepFigures } from './theRecord';
import { doNowChecklist } from './doNowChecklist';
import { buildCover, sweepMeaning, DIRECTIVE, type CoverInput, recommendedLine } from './reportCover';
import { pawcSplit, mentionsClient, PROMINENT_FOOTNOTE } from './pawcSplit';
import { describeDenominator } from './sweepDisclosure';
import { accuracyWhenNamed } from './fidelity';
import { stripCost, sanitizeCustomerExport } from './customerSafe';
import type { SourceCoverage } from './sourceCoverage';
import { panelOf, panelDisclosure, testConditionsLines } from './panel';
import { classifyIntent, intentMixLine, INTENT_LABEL } from './queryIntent';

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
  /** WO-006: the category noun, so intent tags ignore requirements that are part of the category itself. */
  category?: string | null;
  /** WO-012 A: the domain's latest AEO Score, for page one ("Ready to be cited"). */
  readiness?: { score: number } | null;
  /** WO-012 B: Source coverage, dated by its fetch. */
  sourceCoverage?: SourceCoverage | null;
  /** WO-012 G: the Record (Pro/Business) and the figures of this sweep and the previous one. */
  record?: { entries: RecordEntry[]; previous: SweepFigures | null; now: SweepFigures | null } | null;
  /** Injected so a rebuilt report is reproducible in a test. */
  now?: Date;
}

export const ENGINE_LABEL: Record<string, string> = { claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini', grok: 'Grok' };

/** Lane F aliases — plain label first, precise label second. "Pick Rate" is never used. */
export const ALIAS = {
  retrievability: { plain: 'Found when asked by name', precise: 'Branded retrievability' },
  categoryWin: { plain: 'Recommended to new buyers', precise: 'Category citation win' },
  owned: { plain: 'Your own site cited as the source', precise: 'Owned citation rate' },
  share: { plain: 'Your share of the recommendations', precise: 'Share of category' },
  modelPrior: { plain: 'Answered from memory (no search)', precise: 'Model-prior' },
  // WO-AEO-BRANDED-ACCURACY-004: shown beneath retrievability, which stays the headline and the gate.
  accuracy: { plain: 'Described accurately when named', precise: 'Accuracy when named' },
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

function agendaInputs(inp: SweepReportInputs): SweepActionInputs {
  const { result: r, fidelity, entityLinking, authority, truth, ownedDomains } = inp;
  const sc = sweepScorecard(r.runs, { domain: r.domain, brand: r.brand || undefined }, inp.competitors);
  return {
    brandedRetrievabilityPct: sc.brandedRetrievabilityPct,
    categoryWinPct: sc.categoryRecommendationWinPct,
    hasFidelityOrCollision: (fidelity?.citedDrifted ?? 0) > 0 || (entityLinking?.collisions.length ?? 0) > 0,
    collisions: entityLinking?.collisions ?? [],
    losingCategoryQuestions: losingQuestions(r),
    location: ((r.summary as any)?.panel?.location ?? null) as string | null,
    doNowAuthorities: authority ? doNowChecklist(authority.authorityDomains) : [],
    brand: r.brand || undefined,
    domain: r.domain,
    served: truth ? { hasOrg: truth.hasOrganization, hasOrgId: truth.hasOrgId, hasDisambiguation: truth.hasDisambiguation, sameAs: truth.sameAs, ownedDomains } : undefined,
  };
}

/** WO-012 G: every action this sweep's report lists, keyed, for "Mark done". */
export function recordActions(inp: SweepReportInputs): { key: string; title: string; owner: OwnerTag }[] {
  const cov = inp.sourceCoverage ? coverageAction(inp.sourceCoverage) : null;
  return [
    ...plan(inp).steps.map((st) => ({ key: `plan:${st.what.slice(0, 80)}`, title: st.what, owner: st.owner })),
    ...sweepAgendaBlocks(agendaInputs(inp)).map((b) => ({ key: `agenda:${b.key}`, title: b.title, owner: b.owner })),
    ...(cov ? [{ key: 'coverage:no-pages', title: cov.title, owner: 'Outreach' as const }] : []),
  ];
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
  const conf = (n: number) => `N=${n} · ${confidenceLabel(n)}`;
  const val = (v: number | null) => (v === null ? 'Unmeasured' : `${v}%`);
  const brand = r.brand || r.domain;
  const named = (sc.topCompetitors.length ? sc.topCompetitors : r.summary.topCompetitors).slice(0, 5)
    .map((c) => ({ name: c.name, count: c.count, seeded: (c as { seeded?: boolean }).seeded }));
  const best = winnableSegment(segs);
  const awn = accuracyWhenNamed(r.runs.filter((x) => x.queryType === 'branded'), inp.truth);
  const meaning = sweepMeaning({
    accuracy: awn && { accurate: awn.accurate, named: awn.named, checked: awn.checked },
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
    : losingQuestions(r).slice(0, 3).map((q) => ({ what: `Write the page that answers: “${displayQuestion(q, ((r.summary as any)?.panel?.location ?? null) as string | null)}”`, section: 'Action plan' }));
  return {
    split: {
      readiness: { score: inp.readiness?.score ?? null },
      recommended: { pct: sc.categoryRuns ? sc.categoryRecommendationWinPct : null, line: recommendedLine(sc.categoryCited, sc.categoryRuns, r.engines.length, r.generatedAt) },
    },
    title: `Citation Sweep Report — ${r.domain}`,
    brand: r.brand,
    domain: r.domain,
    date: fmtDate(r.generatedAt),
    preparedBy: inp.preparedBy || 'AEO Analyzers',
    headlines: [
      { plain: ALIAS.retrievability.plain, precise: ALIAS.retrievability.precise, value: val(sc.brandedRetrievabilityPct), note: sc.brandedRuns ? `${conf(sc.brandedRuns)}${awn && awn.named ? ` · ${ALIAS.accuracy.plain.toLowerCase()} in ${awn.accurate} of ${awn.named}` : ''}` : undefined },
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

export function buildSweepReport(input: SweepReportInputs): string {
  // WO-004 Part B: the builder never receives a cost figure, and its output passes the one sanitizer.
  const inp: SweepReportInputs = { ...input, result: stripCost(input.result) };
  return sanitizeCustomerExport(buildSweepReportRaw(inp)).text;
}

function buildSweepReportRaw(inp: SweepReportInputs): string {
  const { result: r, fidelity, entityLinking, authority, bots, truth, pageFactDensity, ownedDomains, isAdmin, savedView } = inp;
  const L = (eng: string) => ENGINE_LABEL[eng] || eng;
  const out: string[] = [];
  const client = { domain: r.domain, brand: r.brand || undefined };
  const sc = sweepScorecard(r.runs, client, inp.competitors);
  const now = inp.now || new Date();

  // ── Page 1: the cover ──
  out.push(...buildCover(buildSweepCover(inp)));
  if (inp.record?.previous && inp.record.now) {
    const ma = measuredAfter(inp.record.entries, inp.record.previous, inp.record.now);
    if (ma.length) { out.push(...ma); out.push(''); }
  }
  // The self-describing header lines (kept from the original report, so a saved-view download
  // still states what it is and when it was rebuilt).
  out.push(`Generated: ${new Date(r.generatedAt || now).toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  if (savedView) out.push(`Rebuilt: ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC from stored transcripts`);
  out.push(`Runs per query: ${r.runsPerQuery} · Engines: ${r.configured.join(', ') || 'none'}${r.skippedEngines?.length ? ` · Skipped (no API key): ${r.skippedEngines.join(', ')}` : ''}`);
  // WO-006: which engines, and a different panel gives a different number — on page 1.
  out.push(`_${panelDisclosure(panelOf(r.summary as any), r.configured)}_`);
  // Founder ruling, Oct 8 2026: no export carries a sweep cost for ANYONE — an admin's download
  // is a file that can be forwarded. Cost stays on the admin screen only (History, results page).
  out.push('');

  // ── What AI believes about you ──
  out.push(DIRECTIVE.pagebreak);
  out.push('## What AI believes about you');
  out.push(sc.plainSummary);
  out.push('');
  {
    const brandedRuns = r.runs.filter((x) => x.queryType === 'branded');
    const rows = extractBeliefs(brandedRuns, r.brand || truth?.brandName || undefined, flaggedWrongValues(fidelity), flaggedSiteValues(fidelity));
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
    for (const iss of fidelity.issues) out.push(`- ${iss.type === 'price_mismatch' ? 'Price claim ' : ''}${iss.wrong ? `"${iss.wrong}": ` : ''}${iss.detail}`);
    out.push('');
  }
  if (entityLinking && entityLinking.collisions.length > 0) {
    out.push('### Entity-linking — who engines confuse you with');
    out.push(`Engines are confusing you with: ${entityLinking.collisions.join(', ')}.`);
    for (const f of entityLinking.flags) out.push(`- [${f.kind}] ${f.detail} (${f.source})`);
    out.push('Fix: an explicit "not affiliated with…" disambiguation line + a connected @id entity graph.');
    out.push('');
  }
  if (entityLinking?.retrievedAlongside?.length) {
    out.push('### Retrieved alongside you');
    out.push(entityLinking.alongsideAnswersAccurate ? 'Engines pulled these up for your name; your answer was still correct.' : 'Engines pulled these up for your name; no answer described you as them.');
    for (const a of entityLinking.retrievedAlongside) out.push(`- ${a.entity} (${a.source})`);
    out.push('');
  }

  // ── Where you win and lose ──
  out.push('## Where you win and lose');
  const scoreCell = (v: number | null, n: number) => (v === null ? '—' : `**${v}%** (N=${n}, ${confidenceLabel(n)})`);
  out.push('| What it measures | Result |');
  out.push('| --- | --- |');
  out.push(`| **${ALIAS.retrievability.plain}** — ${ALIAS.retrievability.precise.toLowerCase()} | ${scoreCell(sc.brandedRetrievabilityPct, sc.brandedRuns)} |`);
  out.push(`| **${ALIAS.categoryWin.plain}** — ${ALIAS.categoryWin.precise.toLowerCase()} | ${scoreCell(sc.categoryRecommendationWinPct, sc.categoryRuns)} |`);
  {
    const awn = accuracyWhenNamed(r.runs.filter((x) => x.queryType === 'branded'), truth);
    if (awn) out.push(`| **${ALIAS.accuracy.plain}** — ${ALIAS.accuracy.precise.toLowerCase()} | ${awn.pct === null ? '—' : `**${awn.pct}%** (${awn.accurate} of ${awn.named})`} |`);
  }
  out.push(`| **${ALIAS.owned.plain}** — ${ALIAS.owned.precise.toLowerCase()} | ${scoreCell(sc.ownedCitationRatePct, sc.ownedCitationN)} |`);
  // Share counts recommendations (yours + competitors' across category answers), not answers,
  // so it carries its own count instead of an N that reads as answers scored.
  out.push(`| **${ALIAS.share.plain}** — ${ALIAS.share.precise.toLowerCase()} | ${sc.competitiveSharePct === null ? '—' : `**${sc.competitiveSharePct}%** (${sc.competitiveShareN} recommendations counted)`} |`);
  out.push('');
  out.push('_Category win is pooled across engines over **search-grounded runs only**. An answer given from the model\'s memory is reported as unmeasured, never as a zero._');
  out.push('');
  // WO-AEO-PRODUCT-FIXES-003 §4.3: what each N is counted out of.
  {
    const d = describeDenominator(r.runs, r.configured.length || r.engines.length, r.runsPerQuery, sc);
    out.push(`_Recommended to new buyers: ${d.category}_`);
    out.push(`_Found when asked by name: ${d.branded}_`);
    const awn = accuracyWhenNamed(r.runs.filter((x) => x.queryType === 'branded'), truth);
    out.push(awn ? `_${ALIAS.accuracy.plain}: ${awn.definition}_` : `_${ALIAS.accuracy.plain}: unmeasured — no snapshot of your site's own facts was stored with this sweep._`);
    out.push('');
  }
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

  // ── Source coverage (WO-012 B) ──
  {
    const cov = inp.sourceCoverage;
    out.push('## Source coverage');
    if (cov) {
      const hl = coverageHeadline(cov);
      out.push(hl.headline);
      out.push('');
      out.push(hl.sites);
      out.push('');
      if (cov.rows.length) {
        const label = { yes: 'Yes', no: 'No', unreadable: 'Could not read' } as const;
        out.push('| Site | Times cited | Engines citing | Page read | Names you | Fetched |');
        out.push('|---|---|---|---|---|---|');
        for (const row of cov.rows) out.push(`| ${row.host} | ${row.timesCited} | ${row.engines.map((e) => ENGINE_LABEL[e] || e).join(', ')} | ${row.url} | ${label[row.verdict]}${row.reason ? ` (${row.reason})` : ''} | ${cov.fetchedAt.slice(0, 10)} |`);
        out.push('');
      }
    } else {
      out.push('_Not checked for this sweep yet. Use "Check source coverage" on the saved sweep; the result is dated by the day the pages are read._');
      out.push('');
    }
    const cor = corroboration(r.runs, r.domain, ownedDomains);
    out.push(corroborationLine(cor) + (cor.hosts.length ? ` ${cor.hosts.join(', ')}.` : ''));
    out.push('');
    const base = vendorBase(r.runs, { domain: r.domain, brand: r.brand || undefined }, inp.competitors);
    if (base.perQuestion.length) {
      out.push('### How many answers named any vendor');
      out.push('_A question answered with steps and no vendor is not a lost shortlist. The headline rate keeps its own denominator._');
      for (const row of base.perSegment) out.push(`- **${row.label}:** ${vendorBaseLine(row)}`);
      out.push('');
      for (const row of base.perQuestion) out.push(`- “${row.label}”: ${vendorBaseLine(row)}`);
      out.push('');
    }
  }

  // ── Action plan (WO-012 C: grouped by owner) ──
  out.push(DIRECTIVE.pagebreak);
  out.push('## Action plan');
  out.push('');
  {
    const p = plan(inp);
    for (const line of p.situation) { out.push(line); out.push(''); }
    if (p.gatedNote) { out.push(p.gatedNote); out.push(''); }
    const MOVES = { citation: 'citation win — being the answer', discovery: 'discovery — being retrievable at all', accuracy: 'accuracy — what engines say once they find you' } as const;
    const actions = [
      ...p.steps.map((step) => ({
        owner: step.owner, watch: step.moves as WatchFigure, title: step.what,
        lines: [step.explainer, '', `- Moves: ${MOVES[step.moves]}`, `- Why it matters for AI answers: ${step.why}`, ...(step.link ? [`- Link: ${step.link}`] : []), `- Time: ${step.time}`, `- What changes: ${step.changes}`, `- What does NOT change: ${step.doesNotChange}`],
      })),
      ...sweepAgendaBlocks(agendaInputs(inp)),
      ...(() => { const a = inp.sourceCoverage ? coverageAction(inp.sourceCoverage) : null; return a ? [{ owner: 'Outreach' as const, watch: 'coverage' as const, title: a.title, lines: a.items.map((i) => `- ${i}`) }] : []; })(),
    ];
    out.push(...renderOwnerGroups(actions));
    if (p.noChannelNote) { out.push(p.noChannelNote); out.push(''); }
    out.push(MEASURE_AGAIN);
    out.push('');
  }

  // ── The Record (WO-012 G), oldest first ──
  if (inp.record?.entries.length) out.push(...recordSection(inp.record.entries));

  // ── Methodology ──
  out.push(DIRECTIVE.pagebreak);
  out.push('## Methodology — how this was measured');
  out.push('**Test conditions.**');
  for (const l of testConditionsLines({ location: ((r.summary as any)?.panel?.location ?? null) as string | null })) out.push(`- ${l}`);
  {
    const catQs = [...new Set(r.runs.filter((x) => x.queryType === 'category').map((x) => x.query))];
    if (catQs.length) out.push(`- ${intentMixLine(catQs, inp.category ?? null)}`);
  }
  out.push('');
  out.push(`We asked ${r.configured.length} answer engine${r.configured.length === 1 ? '' : 's'} (${r.configured.map(L).join(', ')}) your questions with web search on, ${r.runsPerQuery} time${r.runsPerQuery === 1 ? '' : 's'} each, and stored every answer verbatim. Three things are measured separately: whether you are found when asked by name, whether you are recommended when buyers ask the category question, and who gets cited instead.`);
  out.push('');
  out.push('- **Search-grounded only.** An answer given from the model\'s memory with no live search is reported as "answered from memory" and never counted as a zero.');
  out.push('- **Strict branded rule.** A branded answer counts as found only when your domain appears in its sources or text; "search ran, site not found" is a miss.');
  out.push('- **Errors excluded.** A run that hit a rate limit or timed out is excluded, not scored zero. Answers cut off by the token cap are not scored.');
  out.push(`- **N and confidence.** Every score carries its N; ${CONFIDENCE_RULE}.`);
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
      { const a = accuracyWhenNamed(r.runs.filter((x) => x.queryType === 'branded' && x.engine === e.engine), truth); if (a && a.named) out.push(`- ${ALIAS.accuracy.plain}: **${a.accurate}/${a.named}** (${a.pct}%)`); }
      out.push(e.categoryRuns === 0
        ? `- ${ALIAS.categoryWin.plain} (${ALIAS.categoryWin.precise.toLowerCase()}): Unmeasured — no search invoked${e.modelPriorRuns > 0 ? ` (${e.modelPriorRuns} answered from memory)` : ''}`
        : `- ${ALIAS.categoryWin.plain} (${ALIAS.categoryWin.precise.toLowerCase()}, search-grounded): **${e.citationWinPct}%** · N=${e.categoryRuns}`);
      if ((e as { erroredRuns?: number }).erroredRuns) out.push(`- (${(e as { erroredRuns?: number }).erroredRuns} run(s) errored${e.erroredAfterRetry && e.erroredAfterRetry === e.erroredRuns ? ' after retry' : ''} — excluded from the scores above)`);
      if (e.modelPriorRuns > 0) out.push(`- (${e.modelPriorRuns} ${ALIAS.modelPrior.plain.toLowerCase()} — reported separately, not scored)`);
      if (e.truncatedRuns > 0) out.push(`- (${e.truncatedRuns} truncated answer${e.truncatedRuns > 1 ? 's' : ''} excluded from the scores above)`);
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
    out.push(`### [${tag}${prior}] ${L(run.engine)} · ${run.queryType === 'category' ? INTENT_LABEL[classifyIntent(run.query, inp.category ?? null).intent].toLowerCase() : 'about you'}: ${run.query}`);
    out.push(run.transcript || '(no answer)');
    if (run.sources?.length) out.push(`Sources: ${run.sources.join(' · ')}`);
    out.push('');
    out.push('---');
    out.push('');
  }
  return out.join('\n');
}

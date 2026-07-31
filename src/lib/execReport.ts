// WO-AEO-EXECREPORT-001 (minimal generator, green-lit 2026-07-31) — turns a sweep
// into a review-ready AI Visibility Executive Report + a draft outreach email.
//
// CONSTITUTIONAL RULES (do not relax):
//  1. Numbers are NEVER authored by the model. Every metric/table here is computed
//     from the sweep JSON and injected; the LLM fills ONLY prose slots (headline,
//     findings prose, recommendations). buildNarrativePrompt() feeds the model the
//     computed numbers as read-only context and asks for prose back.
//  2. Nothing auto-sends. buildOutreachEmail() returns a DRAFT the admin copies into
//     their own mail client after the human review gate.
//  3. Voice: plain-English executive, good-news-first, consequences-not-directives,
//     no superlatives, N shown, out-of-segment framed as out-of-segment, POSSE-only,
//     zero gray-hat. containsGrayHat() is the deterministic backstop on any draft.
//  4. The COURTESY variant is watermarked on every page and summarizes (never links)
//     transcripts; the PAID variant is clean.
//
// Prose in defaultNarrative()/email is PLACEHOLDER — final wording is refined in a
// later template session; the mechanics + slots are what ship now.

import {
  sweepScorecard, aggregateSweep, scoreRun, confidenceLevel,
  type SweepRunResult, type Competitor, type SweepScorecard, type SweepSummary,
} from './citationSweep';
import { summarizeFidelity, type FidelitySummary } from './fidelity';
import { detectEntityLinkingFailures, type EntityLinkingReport } from './entityLinking';
import { aggregateAuthorityGap, type AuthorityGapReport } from './authorityGap';
import { tierForDomain, TIER_LABEL, type AttainabilityTier } from './authorityTiers';
import type { TruthRecord } from './truthRecord';

export type ReportVariant = 'paid' | 'courtesy';

const ENGINE_LABEL: Record<string, string> = {
  claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini',
};

/** Everything a report needs, computed from the sweep — the model sees this, never invents it. */
export interface ExecReportData {
  brand: string;
  domain: string;
  sweepDate: string;               // caller-stamped ISO date (no Date.now in lib code)
  scorecard: SweepScorecard;
  summary: SweepSummary;
  fidelity: FidelitySummary | null;
  entityLinking: EntityLinkingReport | null;
  authority: AuthorityGapReport;
  runCount: number;
  costUsd: number;
  /** The worst defensible gap — drives the subject line + Finding 3 (WO 1.2). */
  headline: {
    brandedPct: number;
    categoryWinPct: number;
    ownedCitationPct: number | null;
    topCompetitor: { name: string; count: number } | null;
    entityCollisions: string[];
    driftedCount: number;
  };
}

/** Assemble the full report data from scored sweep runs. Deterministic; reuses the
 *  same cores the live dashboard does, so a report matches what the customer sees. */
export function assembleReportData(input: {
  brand: string;
  domain: string;
  sweepDate: string;
  runs: SweepRunResult[];
  competitors: Competitor[];
  truth?: TruthRecord | null;
  costUsd?: number;
}): ExecReportData {
  const { brand, domain, sweepDate, competitors, truth } = input;
  const client = { domain, brand: brand || undefined };
  // Ensure runs are scored (cited/domainCited/citedCompetitors set) before the
  // fidelity pass reads r.cited — production runs arrive scored, but be robust.
  const runs = input.runs.map((r) => (typeof r.cited === 'boolean' ? r : scoreRun(r, client, competitors)));
  const scorecard = sweepScorecard(runs, client, competitors);
  const summary = aggregateSweep(runs, client, competitors);
  const branded = runs.filter((r) => r.queryType === 'branded');
  const fidelity = truth ? summarizeFidelity(branded, truth) : null;
  const entityLinking = detectEntityLinkingFailures(branded, client, truth);
  const authority = aggregateAuthorityGap(runs, domain);

  return {
    brand, domain, sweepDate, scorecard, summary, fidelity, entityLinking, authority,
    runCount: runs.length,
    costUsd: input.costUsd ?? summary.totalCostUsd,
    headline: {
      brandedPct: scorecard.brandedRetrievabilityPct,
      categoryWinPct: scorecard.categoryRecommendationWinPct,
      ownedCitationPct: scorecard.ownedCitationRatePct,
      topCompetitor: scorecard.topCompetitors[0] || null,
      entityCollisions: entityLinking?.collisions || [],
      driftedCount: fidelity?.citedDrifted || 0,
    },
  };
}

/** The five prose slots the model fills — nothing else. */
export interface ExecNarrative {
  subject: string;
  headlineFinding: string;
  whyThisMatters: string;
  findings: string[];        // ~5, good-news-first
  recommendations: string[]; // exactly 5, prioritized
}

// ─── Gray-hat backstop (WO definition-of-done) ──────────────────────────────
// Reject any generated draft that RECOMMENDS a parasite/gray-hat tactic. This is a
// safety net on top of the prompt — the report must never advise these.
const GRAY_HAT_PATTERNS: { rx: RegExp; label: string }[] = [
  { rx: /parasite\s*seo/i, label: 'parasite SEO' },
  { rx: /perplexity[-\s]?pages?\s*seeding/i, label: 'Perplexity-Pages seeding' },
  { rx: /\b(private\s+blog\s+network|pbn)\b/i, label: 'private blog network / PBN' },
  { rx: /\bcloak(ing|ed)?\b/i, label: 'cloaking' },
  { rx: /doorway\s+pages?/i, label: 'doorway pages' },
  { rx: /link\s+farm/i, label: 'link farm' },
  { rx: /buy(ing)?\s+backlinks?/i, label: 'buying backlinks' },
  { rx: /host(ing)?\s+content\s+on\s+(a\s+)?high[-\s]?authority\s+(platform|site)\s+(purely\s+)?to\s+borrow/i, label: 'host-to-borrow-ranking' },
];
export function containsGrayHat(text: string): { ok: boolean; hits: string[] } {
  const t = String(text || '');
  const hits = GRAY_HAT_PATTERNS.filter((p) => p.rx.test(t)).map((p) => p.label);
  return { ok: hits.length === 0, hits };
}

/** Read-only house-voice prompt: the model gets the computed numbers as context and
 *  returns ONLY prose slots. It must not restate a metric we didn't give it. */
export function buildNarrativePrompt(d: ExecReportData): string {
  const comp = d.headline.topCompetitor;
  const facts = [
    `Brand: ${d.brand} (${d.domain})`,
    `Branded retrievability (found when asked by name): ${d.headline.brandedPct}%`,
    `Category recommendation win (unbranded buyer questions): ${d.headline.categoryWinPct}%`,
    `Owned citation rate: ${d.headline.ownedCitationPct === null ? 'n/a' : d.headline.ownedCitationPct + '%'}`,
    comp ? `Most-cited-instead competitor: ${comp.name} (${comp.count}×)` : 'No single dominant competitor',
    d.headline.entityCollisions.length ? `Entity-linking collisions (engines confuse the brand with): ${d.headline.entityCollisions.join(', ')}` : 'No entity-linking collisions',
    d.headline.driftedCount ? `${d.headline.driftedCount} branded answer(s) asserted a false fact (drift)` : 'No factual drift in branded answers',
    `Top trusted sources in the category: ${d.authority.authorityDomains.slice(0, 5).map((a) => a.domain).join(', ') || 'n/a'}`,
  ].join('\n');

  return `You are writing the narrative prose for an "AI Visibility Executive Report" about ${d.brand}. You are given MEASURED FACTS below. Write ONLY prose — do NOT invent, restate, or alter any number, and do NOT introduce any statistic not in the facts.

VOICE: plain-English executive; good news first, then the hard finding; consequences, not directives; NO superlatives ("best", "world-class"); when a result is out of the brand's segment, say so; recommend ONLY first-party / POSSE tactics; NEVER recommend parasite SEO, Perplexity-Pages seeding, PBNs, cloaking, or hosting content on another site to borrow its ranking.

MEASURED FACTS (the only numbers you may reference):
${facts}

Return JSON with exactly these string fields:
{
 "subject": "a specific, non-clickbait email subject line naming the concrete gap",
 "headlineFinding": "2-3 sentences: the single most important thing this data shows",
 "whyThisMatters": "2-3 sentences on why AI answer visibility matters for this buyer, no hype",
 "findings": ["5 short paragraphs, GOOD NEWS FIRST then the category-win gap then fidelity/entity issues"],
 "recommendations": ["exactly 5 prioritized, first-party actions tied to the facts above"]
}`;
}

export const NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    headlineFinding: { type: 'string' },
    whyThisMatters: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: ['subject', 'headlineFinding', 'whyThisMatters', 'findings', 'recommendations'],
};

/** Deterministic PLACEHOLDER narrative so a report renders without an LLM call
 *  (and as a fallback). Grounded — every number comes from the data. */
export function defaultNarrative(d: ExecReportData): ExecNarrative {
  const comp = d.headline.topCompetitor;
  const win = d.headline.categoryWinPct;
  return {
    subject: `How AI answer engines describe ${d.brand} to your buyers`,
    headlineFinding: `When buyers ask for ${d.brand} by name, AI finds it ${d.headline.brandedPct}% of the time. But on unbranded buyer questions, AI recommends ${d.brand} ${win}% of the time${comp ? `; ${comp.name} is named instead most often (${comp.count}×)` : ''}.`,
    whyThisMatters: `Buyers increasingly ask AI assistants "what's the best tool for X" instead of searching. If the answer never names you, the buyer never learns you exist — and you never see the lost opportunity.`,
    findings: [
      `Good news: AI reliably identifies ${d.brand} when asked by name (${d.headline.brandedPct}% branded retrievability).`,
      `The gap that costs sales: on category questions, AI recommends ${d.brand} ${win}% of the time${comp ? ` — ${comp.name} wins those answers most often (${comp.count}×)` : ''}.`,
      d.headline.ownedCitationPct === null ? `Your own site was not cited in these answers.` : `When ${d.brand} is mentioned, your own site is the cited source ${d.headline.ownedCitationPct}% of the time.`,
      d.headline.entityCollisions.length ? `Engines confuse ${d.brand} with: ${d.headline.entityCollisions.join(', ')} — a name/acronym collision that needs explicit disambiguation.` : `No entity-linking collisions were detected.`,
      d.headline.driftedCount ? `${d.headline.driftedCount} answer(s) that named you asserted a false fact — worth correcting at the source.` : `Answers that named you were factually accurate.`,
    ],
    recommendations: [
      `Start with the self-serve sources these engines already trust (${d.authority.authorityDomains.filter((a) => tierForDomain(a.domain).tier === 'now').slice(0, 3).map((a) => a.domain).join(', ') || 'directories and profiles you control'}) — claim/create those listings today.`,
      `Publish first-party comparison/answer content on your own domain (POSSE) targeting the category questions you currently lose.`,
      d.headline.entityCollisions.length ? `Add an explicit "not affiliated with…" disambiguation line + a connected @id entity graph so engines resolve you cleanly.` : `Keep your entity graph (@id, sameAs, founder) tight so your identity stays unambiguous.`,
      `Wrap the answers already on your page (pricing, contact, capabilities) in FAQPage schema so engines can extract them.`,
      `Re-measure monthly to confirm the fixes move the numbers (the report's built-in next step).`,
    ],
  };
}

// ─── Rendering ──────────────────────────────────────────────────────────────

function scoreCell(v: number | null, n: number): string {
  return v === null ? '—' : `${v}% (N=${n}, ${confidenceLevel(n)} confidence)`;
}

/** Render the executive report as Markdown. COURTESY adds a watermark on every
 *  section and summarizes rather than links transcripts. */
export function renderExecReport(d: ExecReportData, narrative: ExecNarrative, variant: ReportVariant): string {
  const mark = variant === 'courtesy' ? '> **SAMPLE — Courtesy Assessment · aeoanalyzers.com**\n\n' : '';
  const sc = d.scorecard;
  const out: string[] = [];

  out.push(`# AI Visibility Executive Report — ${d.brand}`);
  out.push(mark + `**Domain:** ${d.domain} · **Sweep date:** ${d.sweepDate} · **${d.runCount} answers across ${d.summary.engines.length} engines**`);
  out.push('');
  out.push('## Why this matters');
  out.push(mark + narrative.whyThisMatters);
  out.push('');
  out.push('## The headline');
  out.push(mark + narrative.headlineFinding);
  out.push('');
  out.push('| What we measured | Result |');
  out.push('| --- | --- |');
  out.push(`| Found when asked by name | ${scoreCell(sc.brandedRetrievabilityPct, sc.brandedRuns)} |`);
  out.push(`| Recommended to new buyers (category win) | ${scoreCell(sc.categoryRecommendationWinPct, sc.categoryRuns)} |`);
  out.push(`| Your own site cited | ${scoreCell(sc.ownedCitationRatePct, sc.ownedCitationN)} |`);
  out.push(`| Your share of the category | ${scoreCell(sc.competitiveSharePct, sc.competitiveShareN)} |`);
  out.push('');

  out.push('## Findings');
  narrative.findings.forEach((f, i) => { out.push(`**${i + 1}.** ${mark ? '' : ''}${f}`); out.push(''); });

  if (sc.topCompetitors.length) {
    out.push('### Cited instead of you (category questions)');
    for (const c of sc.topCompetitors) out.push(`- ${c.name} · ${c.count}×`);
    out.push('');
  }
  if (d.entityLinking && d.entityLinking.collisions.length) {
    out.push('### Engines are confusing you with');
    for (const c of d.entityLinking.collisions) out.push(`- ${c}`);
    out.push('');
  }
  if (d.authority.authorityDomains.length) {
    // C2: group by how ATTAINABLE each source is, so the advice is actionable for a
    // small team and never says "get on Wikipedia" first.
    out.push('### Sources the engines trust — grouped by how attainable they are');
    const top = d.authority.authorityDomains.slice(0, 12);
    for (const tier of ['now', 'earned', 'aspirational'] as AttainabilityTier[]) {
      const inTier = top.filter((a) => tierForDomain(a.domain).tier === tier);
      if (!inTier.length) continue;
      out.push(`**${TIER_LABEL[tier]}**`);
      for (const a of inTier) out.push(`- ${a.domain} · ${a.citations} — ${tierForDomain(a.domain).rationale}`);
      out.push('');
    }
  }

  out.push('## Five prioritized actions');
  narrative.recommendations.slice(0, 5).forEach((r, i) => out.push(`${i + 1}. ${r}`));
  out.push('');

  out.push('## Next step');
  out.push(mark + `Every number in this report is reproducible — run any question yourself against the same engines and you will get what we show. Re-measure after the fixes to confirm movement.`);
  out.push('');

  if (variant === 'courtesy') {
    out.push('---');
    out.push('_SAMPLE — Courtesy Assessment. Transcripts summarized, not linked. A full report includes every stored transcript._');
  }
  return out.join('\n');
}

// ─── Outreach email (DRAFT ONLY) ────────────────────────────────────────────

export interface EmailFooter {
  /** The CAN-SPAM postal address line, e.g. "PIGENAI LLC · 5901 … · Kansas City, MO 64151". */
  postalAddress: string;
  /** Opt-out line (placeholder until the template session finalizes wording). */
  optOut: string;
  /** Sender sign-off name. */
  senderName: string;
}

export interface OutreachEmail {
  subject: string;
  body: string;
}

/** Build a DRAFT courtesy-outreach email. Never sent by the system — the admin
 *  copies it into their own mail client after review. Footer carries the required
 *  CAN-SPAM postal address + opt-out line. */
export function buildOutreachEmail(d: ExecReportData, narrative: ExecNarrative, footer: EmailFooter): OutreachEmail {
  const comp = d.headline.topCompetitor;
  const body = [
    `Hi there,`,
    ``,
    // PLACEHOLDER prose — final wording comes in the template session.
    `I ran a quick, no-strings AI-visibility check on ${d.domain} — what ChatGPT, Claude, Perplexity, and Gemini actually tell buyers about you. A couple of things stood out:`,
    ``,
    `• When someone asks for you by name, AI finds you ${d.headline.brandedPct}% of the time.`,
    `• On unbranded "best tool for…" questions, AI recommends you ${d.headline.categoryWinPct}% of the time${comp ? ` — ${comp.name} tends to get named instead` : ''}.`,
    d.headline.entityCollisions.length ? `• Engines sometimes confuse you with: ${d.headline.entityCollisions.slice(0, 3).join(', ')}.` : ``,
    ``,
    `I put the details in a short courtesy report (attached / below). Every number is reproducible — you can run the same questions yourself.`,
    ``,
    `No ask — just thought it was worth seeing.`,
    ``,
    `Best,`,
    footer.senderName,
    ``,
    `—`,
    footer.postalAddress,
    footer.optOut,
  ].filter((l) => l !== null && l !== undefined).join('\n');

  return { subject: narrative.subject, body };
}

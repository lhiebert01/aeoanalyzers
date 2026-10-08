// WO-AEO-REPORT-POLISH-001 Lane C — the executive-summary cover, shared by BOTH reports.
//
// Founder direction (Sep 30): the docx reports must read like a document a CMO would hand to a
// CEO. Page 1 is the whole argument: who this is about, two or three headline numbers with the
// plain label first and the precise label beneath (Lane F), one bar block, who got named
// instead (sweep), a "what this means" paragraph built from a template and the stored numbers
// — never model-authored — and the first three actions with the section each expands in.
//
// One module renders the cover as markdown for the .md, the .docx (via the directives the
// renderer in services/mdToDocx.ts understands) and the screen (CoverCard reads the same
// CoverInput), so the Score report and the Sweep report look like siblings and cannot
// disagree with each other.

export interface CoverHeadline {
  /** Plain-English label, shown first. */
  plain: string;
  /** The precise metric name, shown beneath. */
  precise: string;
  value: string;
  /** e.g. "N=8 · high confidence" or "technical estimate". */
  note?: string;
}
export interface CoverBar { label: string; pct: number | null; detail: string }
export interface CoverNamed { name: string; count: number; seeded?: boolean }
export interface CoverAction { what: string; section: string }

export interface CoverInput {
  title: string;
  brand?: string | null;
  domain: string;
  date: string;
  preparedBy?: string | null;
  headlines: CoverHeadline[];
  barsTitle: string;
  bars: CoverBar[];
  /** Sweep only — top five from Lane A. */
  namedInstead?: CoverNamed[];
  /** Three to five sentences, template-driven and data-injected. */
  meaning: string;
  firstThree: CoverAction[];
  /** One line pointing at the appendix. */
  pointer?: string;
}

/** HTML comments: invisible in any markdown viewer, switches for the docx renderer. */
export const DIRECTIVE = {
  title: '<!-- cover:title -->',
  headlines: '<!-- cover:headlines -->',
  bars: '<!-- cover:bars -->',
  pagebreak: '<!-- pagebreak -->',
} as const;

const cell = (s: string) => s.replace(/\|/g, '/');

export function buildCover(c: CoverInput): string[] {
  const out: string[] = [];
  out.push(DIRECTIVE.title);
  out.push(`# ${c.title}`);
  const meta = [c.brand ? `**${c.brand}**` : null, c.domain, c.date, c.preparedBy ? `Prepared by ${c.preparedBy}` : null].filter(Boolean).join(' · ');
  out.push(meta);
  out.push('');

  const hs = c.headlines.slice(0, 3);
  if (hs.length) {
    out.push(DIRECTIVE.headlines);
    out.push(`| ${hs.map((h) => cell(h.plain)).join(' | ')} |`);
    out.push(`|${hs.map(() => '---').join('|')}|`);
    out.push(`| ${hs.map((h) => `**${cell(h.value)}**`).join(' | ')} |`);
    out.push(`| ${hs.map((h) => cell(h.precise)).join(' | ')} |`);
    if (hs.some((h) => h.note)) out.push(`| ${hs.map((h) => cell(h.note || '')).join(' | ')} |`);
    out.push('');
  }

  if (c.bars.length) {
    out.push(`### ${c.barsTitle}`);
    out.push(DIRECTIVE.bars);
    out.push('| | | |');
    out.push('|---|---|---|');
    for (const b of c.bars) out.push(`| ${cell(b.label)} | ${b.pct === null ? 'Unmeasured' : `${b.pct}%`} | ${cell(b.detail)} |`);
    out.push('');
  }

  if (c.namedInstead && c.namedInstead.length) {
    out.push('### Who got named instead');
    out.push('| Vendor | Answers |');
    out.push('|---|---|');
    for (const n of c.namedInstead.slice(0, 5)) out.push(`| ${cell(n.name)}${n.seeded ? ' (entered by you)' : ''} | ${n.count} |`);
    out.push('');
  }

  out.push('### What this means');
  out.push(c.meaning);
  out.push('');

  if (c.firstThree.length) {
    out.push('### Do these three things first');
    c.firstThree.slice(0, 3).forEach((a, i) => out.push(`${i + 1}. **${a.what}** — see “${a.section}”.`));
    out.push('');
  }
  if (c.pointer) { out.push(`_${c.pointer}_`); out.push(''); }
  return out;
}

/* ───────────────────────── "What this means" — templates, never a model ───────────────────────── */

export interface SweepMeaningInput {
  brand: string;
  brandedPct: number | null; brandedN: number;
  categoryPct: number | null; categoryN: number;
  ownedPct: number | null;
  topNamed?: { name: string; count: number } | null;
  modelPriorRuns: number;
  /** undefined = fidelity not measured in this sweep. */
  drifted?: number;
  /** WO-004: accuracy-when-named, with the facts it was checked against. */
  accuracy?: { accurate: number; named: number; checked: string[] } | null;
  collisions: string[];
  bestSegment?: { label: string; winPct: number; n: number } | null;
}

const pct = (v: number) => `${v}%`;

/** Three to five sentences keyed to the diagnosis pattern. Every number comes from the input. */
export function sweepMeaning(m: SweepMeaningInput): string {
  const s: string[] = [];
  const b = m.brand;
  if (m.brandedPct === null && m.categoryPct === null) {
    s.push(`This sweep could not measure retrieval or recommendation for ${b}, so it makes no diagnosis.`);
    s.push('Every engine either failed to run or answered without a live search, and an unmeasured cell is reported as unmeasured, never as a zero.');
    s.push('Re-run the same questions the same way before reading anything into this.');
    return s.join(' ');
  }
  const named = m.topNamed ? `${m.topNamed.name} was named most often (${m.topNamed.count} answers).` : '';
  const pushNamed = () => { if (named) s.push(named); };
  if (m.brandedPct !== null && m.brandedPct >= 80) {
    s.push(`Engines know ${b}: asked for it by name, ${pct(m.brandedPct)} of ${m.brandedN} answers found it.`);
    if (m.categoryPct === null) {
      s.push('When buyers asked the category question without naming you, no engine ran a live search, so recommendation is unmeasured this month.');
    } else if (m.categoryPct === 0) {
      s.push(`When buyers asked the category question without naming you, ${b} was recommended in none of the ${m.categoryN} search-grounded answers.`);
      pushNamed();
      s.push('This is a recommendation gap, not a discovery gap: being found and described correctly does not put you on a buyer\'s shortlist.');
    } else {
      s.push(`When buyers asked the category question without naming you, ${b} was recommended in ${pct(m.categoryPct)} of ${m.categoryN} search-grounded answers.`);
      pushNamed();
      if (m.bestSegment) s.push(`It converts best on ${m.bestSegment.label} questions (${pct(m.bestSegment.winPct)} of ${m.bestSegment.n}); grow share where you already win.`);
    }
  } else if (m.brandedPct !== null && m.brandedPct < 50) {
    s.push(`Engines struggle to find ${b} even by name: ${pct(m.brandedPct)} of ${m.brandedN} answers found it.`);
    s.push('Until that is fixed, the category results are not a fair read, because an engine cannot recommend a site it cannot retrieve.');
    s.push('Discovery comes first: crawler access, index coverage and one unambiguous identity, in that order.');
  } else if (m.brandedPct !== null) {
    s.push(`Engines find ${b} by name most of the time, ${pct(m.brandedPct)} of ${m.brandedN} answers, but not reliably.`);
    if (m.categoryPct !== null) { s.push(`On the category questions it was recommended in ${pct(m.categoryPct)} of ${m.categoryN} search-grounded answers.`); pushNamed(); }
    s.push('Fix retrieval first, then the category work has a fair test.');
  } else {
    s.push(`Retrieval by name could not be measured for ${b} this month.`);
    if (m.categoryPct !== null) { s.push(`On the category questions it was recommended in ${pct(m.categoryPct)} of ${m.categoryN} search-grounded answers.`); pushNamed(); }
  }
  // Fidelity clause — one sentence, only from measured facts.
  if (m.collisions.length) s.push(`Engines also confused you with ${m.collisions.slice(0, 2).join(' and ')}, which the action plan addresses.`);
  else if ((m.drifted ?? 0) > 0) s.push(`${m.drifted} of the answers that named you got a fact wrong; see “What AI believes about you”.`);
  // WO-004: say exactly what was checked. "None got a fact wrong" overclaimed — only the brand name
  // and declared founders are compared with the site.
  else if (m.accuracy && m.accuracy.named) s.push(`${m.accuracy.accurate} of the ${m.accuracy.named} answers that named you stated nothing your site contradicts on ${m.accuracy.checked.length ? m.accuracy.checked.join(' or ') : 'the facts we could read'}.`);
  if (s.length < 5 && m.modelPriorRuns > 0) s.push(`${m.modelPriorRuns} category answer${m.modelPriorRuns > 1 ? 's were' : ' was'} given from memory without a search and ${m.modelPriorRuns > 1 ? 'are' : 'is'} not counted.`);
  return s.slice(0, 5).join(' ');
}

export interface ScoreMeaningInput {
  score: number;
  citationProbability: number;
  breakdown?: { entity: number; density: number; clarity: number; structure: number } | null;
  crawlerCriticalBlock?: boolean;
  weakestCriterion?: { name: string; score: number } | null;
}

export const DIMENSION_LABEL: Record<'entity' | 'density' | 'clarity' | 'structure', string> = {
  entity: 'Entity identity and schema', density: 'Factual density', clarity: 'Direct answerability', structure: 'Semantic structure',
};
const DIMENSION_FIX: Record<'entity' | 'density' | 'clarity' | 'structure', string> = {
  entity: 'structured data and identity work: an Organization node with a stable @id, sameAs links and one canonical name',
  density: 'verifiable facts on the page: numbers, dates, named specifics an engine can quote',
  clarity: 'answer-shaped copy: self-contained sentences that name you, under question-shaped headings',
  structure: 'semantic HTML: a clean heading hierarchy and lists an engine can chunk',
};

export function scoreTier(score: number): string {
  return score <= 30 ? 'Poor' : score <= 50 ? 'Below Average' : score <= 70 ? 'Okay / Fair' : score <= 85 ? 'Good' : 'Excellent';
}

export function weakestDimension(b: ScoreMeaningInput['breakdown']): { key: 'entity' | 'density' | 'clarity' | 'structure'; value: number } | null {
  if (!b) return null;
  const keys = ['entity', 'density', 'clarity', 'structure'] as const;
  let best: typeof keys[number] = keys[0];
  for (const k of keys) if (b[k] < b[best]) best = k;
  return { key: best, value: b[best] };
}

export function scoreMeaning(m: ScoreMeaningInput): string {
  const s: string[] = [];
  const tier = scoreTier(m.score);
  if (m.crawlerCriticalBlock) {
    s.push(`A citation-critical AI crawler is blocked at the site root, so the score is capped at 40 and nothing else on this report moves until that block is lifted.`);
  }
  s.push(`The AEO score is ${m.score}/100, in the ${tier} range.`);
  const weak = weakestDimension(m.breakdown);
  if (weak) {
    s.push(`The dimension dragging it is ${DIMENSION_LABEL[weak.key].toLowerCase()} at ${weak.value}/100, which calls for ${DIMENSION_FIX[weak.key]}.`);
    const b = m.breakdown!;
    const keys = ['entity', 'density', 'clarity', 'structure'] as const;
    let strong: typeof keys[number] = keys[0];
    for (const k of keys) if (b[k] > b[strong]) strong = k;
    if (strong !== weak.key) s.push(`${DIMENSION_LABEL[strong]} is the strongest at ${b[strong]}/100 and needs no rework.`);
  } else if (m.weakestCriterion) {
    s.push(`The weakest criterion is ${m.weakestCriterion.name} at ${m.weakestCriterion.score}/10.`);
  }
  s.push(`Citation readiness of ${m.citationProbability}% is a technical estimate of how citable the page is, not a measured citation rate; a Citation Sweep measures that.`);
  return s.slice(0, 5).join(' ');
}

/** Sentence count, for the 3–5 rule (abbreviations like "e.g." are not used in the templates). */
export function sentenceCount(text: string): number {
  return (text.match(/[.!?](\s|$)/g) || []).length;
}

// WO-2 — Answer-Fidelity scoring. Diffs an engine's answer against the client's
// truth record (truthRecord.ts) and produces the "facts AI gets wrong about you"
// list. Retired Sep 19 2026: this line read "No competitor measures this." It was the
// same claim as the retired "no other AEO tool measures whether AI is telling the truth
// about you" — Lilypath publicly measures drift against a controlled source of truth.
// A claim we removed from copy but left in the reasoning of the module that computes the
// thing is how it finds its way back into copy in six months.
//
// The highest-value, fully-deterministic check is FOUNDER MISATTRIBUTION: an
// engine naming a founder/creator who isn't in the client's canonical set (the
// real Jesper-Nissen-vs-AEO-Analyzers failure). We also flag whether the brand
// was identified and which canonical founders were omitted. Grounded string
// analysis — the LLM produced the answer; this module judges it against facts.

import type { TruthRecord } from './truthRecord';
import { extractPriceClaims, extractFreeAllowance, sentencesAboutBrand } from './siteFacts.js';

export interface FidelityIssue {
  type: 'hallucinated_founder' | 'omitted_founder' | 'brand_not_identified' | 'price_mismatch' | 'retired_name' | 'allowance_mismatch' | 'misidentified';
  field: string;
  /** The wrong/asserted value, when applicable. */
  wrong?: string;
  /** The correct value(s) from the truth record. */
  correct?: string[];
  detail: string;
  source: string;
  severity: 'high' | 'medium' | 'low';
}

export interface FidelityScore {
  fidelityPct: number;
  brandIdentified: boolean;
  correctFounders: string[];
  omittedFounders: string[];
  /** Names the engine asserted as founder/creator that are NOT canonical. */
  hallucinatedFounders: string[];
  issues: FidelityIssue[];
}

const NAME = `[A-Z][a-zA-Z.'\\-]+(?:\\s+[A-Z][a-zA-Z.'\\-]+){1,2}`;

/** Pull candidate person names asserted in a founder/creator role from an answer. */
export function extractFounderMentions(text: string): string[] {
  const t = String(text || '');
  const found = new Set<string>();
  // "founded by X", "co-founder X", "created by X", "co-built by X"
  const after = new RegExp(
    `(?:founded (?:and (?:launched|created|built) )?by|co-?founded by|co-?built by|co-?created by|created by|built by|(?:co-?)?founder[s]?(?:\\s+(?:is|are|was|were))?|creator[s]?(?:\\s+(?:is|are))?)\\s+(?:is\\s+|are\\s+)?(${NAME})`,
    'g'
  );
  // "X, the co-founder", "X co-built"
  const before = new RegExp(
    `(${NAME}),?\\s+(?:the\\s+|a\\s+)?(?:co-?)?(?:founder|creator|co-?builder|co-?built|co-?founded)`,
    'g'
  );
  for (const rx of [after, before]) {
    let m: RegExpExecArray | null;
    // A name never carries a sentence end: "Vincenzo Barbagallo. It" is "Vincenzo Barbagallo"
    // (aeoanalyzers.com, Sep 2026 sweep — the wrong value printed with the next word attached).
    while ((m = rx.exec(t))) found.add(m[1].replace(/(?<!\b[A-Z])[.!?;:](?:\s.*)?$/s, '').trim()); // a middle initial ("Jon V. Ferrara") survives
  }
  return [...found];
}

/** Is `mention` the same person as any canonical founder? Matches on full name
 *  (case-insensitive) or a shared surname, so "Hiebert" ≈ "Lindsay Hiebert". */
function matchesCanonical(mention: string, canonical: string[]): boolean {
  const m = mention.toLowerCase().trim();
  const mLast = m.split(/\s+/).pop() || m;
  return canonical.some((c) => {
    const cl = c.toLowerCase().trim();
    if (cl === m || cl.includes(m) || m.includes(cl)) return true;
    const cLast = cl.split(/\s+/).pop() || cl;
    return cLast.length > 2 && cLast === mLast;
  });
}

// A company suffix marks an ORGANIZATION, not a person. An engine naming the
// client's own parent company as the creator ("a product by PI GenAI LLC") is
// accurate, NOT a fabricated founder — flagging it is a false accusation against
// the client's own company. Only PERSON names that aren't canonical are drift.
const ORG_SUFFIX = /(?:^|\s)(?:llc|l\.l\.c\.?|inc\.?|incorporated|ltd\.?|limited|corp\.?|corporation|co\.|company|gmbh|plc|s\.?a\.?|b\.?v\.?|ag|oy|pbc|lp|llp|group|holdings)\.?$/i;
/** True if a name looks like an organization (has a company suffix). */
function isOrganizationName(name: string): boolean {
  return ORG_SUFFIX.test(String(name || '').trim());
}

/** Whole-word presence of a name in the answer. */
function mentioned(text: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(text);
}

export function scoreFidelity(transcript: string, truth: TruthRecord, sources: string[] = [], question = ''): FidelityScore {
  const text = String(transcript || '');
  const issues: FidelityIssue[] = [];
  const canonical = truth.founders || [];

  // Founder mentions asserted by the engine.
  const mentions = extractFounderMentions(text);
  const hallucinatedFounders = mentions.filter(
    (m) => canonical.length > 0 && !matchesCanonical(m, canonical) && !isOrganizationName(m)
  );
  const correctFounders = canonical.filter((c) => mentioned(text, c));
  const omittedFounders = canonical.filter((c) => !mentioned(text, c));

  const brandIdentified = !!truth.brandName && mentioned(text, truth.brandName);

  let score = 100;

  for (const wrong of hallucinatedFounders) {
    score -= 35;
    issues.push({
      type: 'hallucinated_founder',
      field: 'founder',
      wrong,
      correct: canonical,
      detail: `The engine names "${wrong}" as a founder/creator, but the canonical founder${canonical.length > 1 ? 's are' : ' is'} ${canonical.join(', ') || '(unknown)'}. This is a fabricated attribution.`,
      source: 'Organization/Person schema (founder, creator) + llms.txt',
      severity: 'high',
    });
  }

  if (canonical.length > 0 && correctFounders.length === 0) {
    score -= 15;
    for (const c of omittedFounders) {
      issues.push({
        type: 'omitted_founder',
        field: 'founder',
        correct: [c],
        detail: `The engine's answer does not mention the canonical founder "${c}".`,
        source: 'Organization/Person schema + llms.txt',
        severity: 'medium',
      });
    }
  }

  if (truth.brandName && !brandIdentified) {
    score -= 10;
    issues.push({
      type: 'brand_not_identified',
      field: 'name',
      correct: [truth.brandName],
      detail: `The answer does not clearly identify the brand "${truth.brandName}".`,
      source: 'og:site_name / Organization schema',
      severity: 'medium',
    });
  }

  // WO-010 A: prices, retired names and the free allowance, against what the site publishes.
  for (const i of sitePublishedIssues(text, truth)) { score -= 35; issues.push(i); }

  // Nov 22 2026: a different company with the same name is not an accurate description of you.
  const mis = misidentification(text, truth, sources, question);
  if (mis) { score -= 50; issues.push(mis); }

  return {
    fidelityPct: Math.max(0, Math.min(100, score)),
    brandIdentified,
    correctFounders,
    omittedFounders,
    hallucinatedFounders,
    issues,
  };
}

/** WO-010 A: claims the site's own published record contradicts. Each issue carries the quoted
 *  claim (`wrong`) and the site's value (`correct`) for side-by-side display. Checked only for
 *  what the site publishes: no published prices, no price check. */
export function sitePublishedIssues(transcript: string, truth: TruthRecord): FidelityIssue[] {
  const text = String(transcript || '');
  const out: FidelityIssue[] = [];
  const about = sentencesAboutBrand(text, truth.brandName);
  const prices = truth.prices || [];
  if (prices.length) {
    const known = new Set(prices.map((p) => p.amount));
    const correct = prices.filter((p) => p.amount > 0).map((p) => p.label);
    const seen = new Set<string>();
    for (const sentence of about) {
      for (const c of extractPriceClaims(sentence)) {
        if (known.has(c.amount) || seen.has(c.claim)) continue;
        seen.add(c.claim);
        out.push({ type: 'price_mismatch', field: 'price', wrong: c.claim, correct,
          detail: `The engine quotes "${c.claim}"; ${truth.pricesSource || 'your site'} publishes ${correct.join(', ')}.`,
          source: truth.pricesSource || 'your site', severity: 'high' });
      }
    }
  }
  for (const name of truth.retiredNames || []) {
    // Case-insensitive (scoring rules 2026-11-01): "an AI simulation engine" is the retired name too.
    if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
      out.push({ type: 'retired_name', field: 'product name', wrong: name, correct: truth.brandName ? [truth.brandName] : [],
        detail: `The engine calls the product "${name}", a name the site no longer uses.`, source: 'the site\'s own record of retired names', severity: 'high' });
    }
  }
  if (truth.freeAllowance) {
    const a = extractFreeAllowance(about.join(' '));
    if (a && a.count !== truth.freeAllowance) {
      out.push({ type: 'allowance_mismatch', field: 'free allowance', wrong: a.claim, correct: [`${truth.freeAllowance} free checks`],
        detail: `The engine says "${a.claim}"; your pricing page says ${truth.freeAllowance} free checks.`, source: truth.pricesSource || 'your pricing page', severity: 'high' });
    }
  }
  return out;
}

// ─── Misidentification (Nov 22 2026) ───────────────────────────────────────────
// The usesignalatlas.com sweep showed "described accurately when named: 7 of 7" while most branded
// answers described other products called Signal Atlas (a waypoint store, a stock-signals firm, a
// travel eSIM guide, a radio-spectrum project). The checks above compare only facts the site
// publishes (name, founders, prices), so an answer about a namesake passed. Two deterministic
// signals now mark it misidentified:
//   1. domain: the answer (or a source it cites) puts the brand on a domain that is not the site's
//      own — a host carrying the brand's letters (signalatlas.store, getsignalatlas.com), or a code
//      repository named after it — and the answer cites nothing of the site's own;
//   2. category: the sentence that defines the brand shares no category word with the site's own
//      description and category line.
// Hosts the site declares as its own (sameAs) are never foreign.

const STOP = new Set(('about also after another appears around based because been before being best between both brand built called company could does each find focused from have helps into just like more most offers offering online other over platform product products provide provides providing service services site some such than that their them there these they this those through tool tools used user users uses using very website what when where which while with within would your').split(' '));
// Light stemming, kept consistent across forms: plurals ("engines" = "engine", "stories" = "story").
const stem = (w: string) => (w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.endsWith('ss') ? w : w.replace(/s$/, ''));
function contentStems(text: string, exclude: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const w of String(text || '').toLowerCase().match(/[a-z][a-z-]{3,}/g) || []) {
    for (const part of w.split('-')) {
      if (part.length < 4 || STOP.has(part) || exclude.has(part)) continue;
      out.add(stem(part));
    }
  }
  return out;
}
const hostOf = (u: string) => { try { return new URL(/^https?:/i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const REDIRECT_HOSTS = /(^|\.)(vertexaisearch\.cloud\.google\.com|google\.com)$/;

/** The site's own words for what it is: its descriptions and the sweep's category line. */
function siteVocabulary(truth: TruthRecord, brandParts: Set<string>): Set<string> {
  const desc = [truth.category, truth.site?.ldDescription, truth.site?.metaDescription, ...(truth.facts || []).filter((f) => /description|category|summary/i.test(f.key)).map((f) => f.value)].filter(Boolean).join(' ');
  return contentStems(desc, brandParts);
}

export function misidentification(transcript: string, truth: TruthRecord, sources: string[] = [], question = ''): FidelityIssue | null {
  const brand = String(truth.brandName || '').trim();
  if (!brand) return null;
  const text = String(transcript || '');
  const slug = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (slug.length < 4) return null;
  // A brand that is a person's own name (a personal site) has many domains and descriptions; a
  // fabricated founder is caught by the founder check instead.
  const lc = brand.toLowerCase();
  const people = [...(truth.founders || []), ...(truth.facts || []).filter((f) => /founder|creator|person/i.test(f.key)).map((f) => f.value)];
  if (people.some((p) => String(p).toLowerCase() === lc)
    || (truth.facts || []).some((f) => /description/i.test(f.key) && new RegExp(`^${lc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(builds|is an?|writes|works|helps)\\b`).test(String(f.value).toLowerCase()))) return null;
  const own = truth.domain ? hostOf(truth.domain) : '';
  const declared = new Set((truth.sameAs || []).map(hostOf).filter(Boolean));
  const isOwn = (h: string) => !!own && (h === own || h.endsWith(`.${own}`));
  const brandParts = new Set(brand.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).concat(slug, own.split('.')[0] || ''));

  // 1. Domain: another host carrying the brand, in the answer or its sources.
  // Every answer repeats your domain from the question, so only a SOURCE on your own domain shows
  // the engine actually read you.
  const citesOwn = sources.some((u) => isOwn(hostOf(u)));
  const urls = [...(text.match(/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)\]]*)?/gi) || []), ...sources];
  const foreign: string[] = [];
  const seenHosts = new Set<string>();
  for (const u of urls) {
    const h = hostOf(u);
    if (!h || REDIRECT_HOSTS.test(h)) continue;
    if (isOwn(h) || declared.has(h)) continue;
    // A host carrying the brand's letters. (A code repository named after the brand is not used:
    // it is as often the brand's own repository as a namesake's.)
    if (h.replace(/[^a-z0-9]/g, '').includes(slug) && !seenHosts.has(h)) { seenHosts.add(h); foreign.push(h); }
  }
  const correct = [truth.site?.ldDescription || truth.site?.metaDescription || truth.category || '', own].filter(Boolean) as string[];
  if (own && foreign.length && !citesOwn) {
    return { type: 'misidentified', field: 'identity', wrong: foreign.join(', '), correct,
      detail: `The answer describes "${brand}" from ${foreign.join(', ')}, not ${own}: another product with the same name.`,
      source: 'your domain and your site\'s own description', severity: 'high' };
  }

  // 2. Category: the answer defines the brand ("X is a …", "X appears to be …") as something that
  // shares almost nothing with the site's own words. Judged on the whole answer, not one sentence:
  // a correct answer can define you in words your site does not use ("an AEO platform") and still
  // talk about what you do. An ownership sentence ("X is operated by …") defines nothing.
  // Only judged against the sweep's category line (the customer's own statement of what the product
  // is): a homepage description alone is too thin to say an answer describes something else.
  if (!String(truth.category || '').trim()) return null;
  const vocab = siteVocabulary(truth, brandParts);
  if (vocab.size < 3) return null;
  // The engine read you (a source on your domain) or named your founder or company: it is about you.
  if (citesOwn || [...people, truth.site?.orgName].some((p) => p && mentioned(text, String(p)))) return null;
  const nameRx = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'), 'gi');
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z*"(`])/);
  const mentionsBrand = (x: string) => { nameRx.lastIndex = 0; return nameRx.test(x) || (!!own && x.toLowerCase().includes(own)); };
  const definesIt = (x: string) => /\b(?:is|are|was)\s+(?:an?|the)\s|\bappears to (?:be|belong)\b|\brefers? to (?:an?|the)\s/i.test(x) && !/\bis\s+(?:owned|operated|run|managed|founded|created|built|developed|made|published)\s+by\b/i.test(x);
  const defining = sentences.find((x) => mentionsBrand(x) && definesIt(x));
  if (!defining || /\b(couldn'?t|could not|unable to|no (?:specific )?information|not (?:able|sure)|under construction|does(?:n'?t| not) (?:provide|contain|have|say)|no (?:details|description))\b/i.test(defining)) return null;
  const stripName = (x: string) => x.replace(nameRx, ' ').replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, ' ');
  // An acronym in the brand used as a category ("an AEO platform" for AEO Analyzers) is the site's
  // own word. (Ordinary brand words are not: "signal" in "a mobile signal meter" says nothing.)
  const acronyms = (brand.match(/\b[A-Z]{2,5}\b/g) || []).map((w) => w.toLowerCase());
  const answerText = stripName(text);
  if (acronyms.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(answerText))) return null;
  const words = contentStems(stripName(defining), brandParts);
  if (words.size < 3) return null;
  // Words the answer only echoes from the question ("Who makes the research desk?") prove nothing.
  const asked = contentStems(question, brandParts);
  let shared = 0;
  for (const w of contentStems(answerText, brandParts)) if (vocab.has(w) && !asked.has(w)) shared++;
  // Measured on the Nov 22 usesignalatlas.com sweeps: answers about the right product share 5 to 9
  // of the site's own words; answers about namesakes share at most 2.
  if (shared >= 3) return null;
  const said = defining.replace(/\*\*/g, '').trim();
  return { type: 'misidentified', field: 'identity', wrong: said.length > 160 ? `${said.slice(0, 157)}…` : said, correct,
    detail: `The answer describes "${brand}" as something your site does not say you are: likely another product with the same name.`,
    source: 'your site\'s own description and category', severity: 'high' };
}

// ─── Sweep integration (WO-QA-003 B1) ───────────────────────────────────────
// A branded sweep answer isn't just "cited / not cited" — a CITED answer can still
// be WRONG about you (the Claude exec-package conflation, the Jesper-Nissen
// fabrication). Run every branded "cited" transcript through scoreFidelity and
// split "cited" into cited-accurate vs cited-drifted, so Owned Citation Rate isn't
// silently counting drifted answers as clean wins.

export type FidelityState = 'cited-accurate' | 'cited-drifted' | 'not-cited';

export interface RunFidelity {
  state: FidelityState;
  fidelityPct: number;
  issues: FidelityIssue[];
}

/** Classify ONE branded run against the truth record. A cited answer is
 *  `cited-drifted` when it makes a high-severity error (a fabricated founder, etc.),
 *  otherwise `cited-accurate`. Not-cited runs pass straight through. */
export function classifyRunFidelity(cited: boolean, transcript: string, truth: TruthRecord, sources: string[] = [], question = ''): RunFidelity {
  if (!cited) return { state: 'not-cited', fidelityPct: 0, issues: [] };
  const f = scoreFidelity(transcript, truth, sources, question);
  const drifted = f.hallucinatedFounders.length > 0 || f.issues.some((i) => i.severity === 'high');
  return { state: drifted ? 'cited-drifted' : 'cited-accurate', fidelityPct: f.fidelityPct, issues: f.issues };
}

export interface FidelitySummary {
  citedAccurate: number;
  citedDrifted: number;
  /** Distinct high-severity issues across all branded cited answers (deduped by
   *  type+wrong value) — the "what AI gets wrong about you" list. */
  issues: FidelityIssue[];
  /** Fabricated founder/creator names any engine asserted. */
  hallucinatedFounders: string[];
}

/** Roll fidelity up across a sweep's branded runs. */
export function summarizeFidelity(
  brandedRuns: { cited?: boolean; transcript: string; sources?: string[]; query?: string }[],
  truth: TruthRecord
): FidelitySummary {
  let citedAccurate = 0, citedDrifted = 0;
  const seen = new Set<string>();
  const issues: FidelityIssue[] = [];
  const hallucinated = new Set<string>();
  for (const r of brandedRuns) {
    const f = classifyRunFidelity(!!r.cited, r.transcript || '', truth, r.sources || [], r.query || '');
    if (f.state === 'cited-accurate') citedAccurate++;
    else if (f.state === 'cited-drifted') {
      citedDrifted++;
      for (const i of f.issues) {
        if (i.severity !== 'high') continue;
        if (i.wrong) hallucinated.add(i.wrong);
        const key = `${i.type}|${i.wrong || ''}`;
        if (!seen.has(key)) { seen.add(key); issues.push(i); }
      }
    }
  }
  return { citedAccurate, citedDrifted, issues, hallucinatedFounders: [...hallucinated] };
}

/** WO-AEO-BRANDED-ACCURACY-004 Part A — "described accurately when asked by name".
 *  Accurate answers ÷ answers that named the company, from the existing classifier — no new scoring
 *  path. `checked` lists exactly which facts were checkable, because the classifier compares only what
 *  the company's own site publishes: its brand name, and its founder names when the site declares them.
 *  A site that declares no founder can only fail an answer on the brand name, and the definition line
 *  must say so. null when no truth record exists (the site could not be read): unmeasured, never 100%. */
export interface AccuracyWhenNamed { accurate: number; named: number; pct: number | null; checked: string[]; definition: string }

export function accuracyWhenNamed(brandedRuns: { cited?: boolean; transcript: string; sources?: string[]; query?: string }[], truth: TruthRecord | null | undefined): AccuracyWhenNamed | null {
  if (!truth) return null;
  const f = summarizeFidelity(brandedRuns, truth);
  const named = f.citedAccurate + f.citedDrifted;
  const checked = [
    ...(truth.brandName ? [`the brand name "${truth.brandName}"`] : []),
    ...((truth.founders || []).length ? [`the founder${truth.founders.length > 1 ? 's' : ''} ${truth.founders.join(' and ')}`] : []),
    ...((truth.prices || []).length ? [`your prices (${truth.prices!.filter((p) => p.amount > 0).map((p) => p.label).join(', ')})`] : []),
    ...(truth.freeAllowance ? [`your free allowance (${truth.freeAllowance} free checks)`] : []),
    ...((truth.retiredNames || []).length ? ['retired product names'] : []),
    ...(truth.domain || truth.site?.ldDescription || truth.site?.metaDescription || truth.category ? [`that the answer describes your product${truth.domain ? ` (${truth.domain})` : ''}, not another with the same name`] : []),
  ];
  const pct = named ? Math.round((100 * f.citedAccurate) / named) : null;
  const definition = named
    ? `${f.citedAccurate} of the ${named} answers that named you stated no fact your site contradicts. Checked: ${checked.length ? checked.join(', ').replace(/, ([^,]*)$/, ' and $1') : 'nothing — your site publishes neither a brand name nor a founder in a form we can read'}, as your own site publishes them.`
    : 'No answer named you, so there was nothing to check.';
  return { accurate: f.citedAccurate, named, pct, checked, definition };
}

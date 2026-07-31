// Tested Citation Sweeps — analytical core (WO-1).
//
// This module is the DETERMINISTIC heart of the citation-sweep feature: given
// the raw answers an engine returned for a query panel, it decides — by grounded
// string/host matching, never by an LLM — whether the client was cited, which
// competitors were "cited instead", and rolls the N runs up into the three-layer
// answer model:
//
//   Retrievability  = branded/navigational query cite-rate  (should be ~100%)
//   Citation Win    = unbranded category query cite-rate    (the competitive metric)
//
// Fidelity (does the answer match the client's truth record) is WO-2 and lives
// elsewhere. Cost is computed by each engine adapter (it knows its own token
// pricing) and only summed here.
//
// Design rule (mirrors the rest of this codebase): the LLM produces the ANSWER
// TEXT; this module never asks an LLM whether a citation happened — a citation is
// the client's domain/brand appearing in a SOURCE the engine actually retrieved,
// or named in the answer text in a clause that is NOT a "couldn't find it" clause.
// That last guard matters: engines routinely echo the domain straight back from
// the question ("I couldn't find reliable information about quizshowdown.live")
// while disclaiming any knowledge of it — a literal-substring test scores that as
// 100% retrievable, which is exactly backwards. See scoreRun + NOT_FOUND_PHRASES.
// The rule keeps the headline numbers reproducible and defensible ("run the query
// yourself — you'll get what our report says").

export type Engine = 'claude' | 'openai' | 'perplexity' | 'gemini';
export type QueryType = 'branded' | 'category';

/** A competitor to watch for in "cited instead" lists. */
export interface Competitor {
  name: string;
  /** Optional registrable domain, e.g. "competitor.com". */
  domain?: string;
}

/** One engine × query × run — the atomic unit an adapter produces. */
export interface SweepRunResult {
  engine: Engine;
  query: string;
  queryType: QueryType;
  runIndex: number;
  /** The engine's full answer text (stored verbatim for the transcript drill-down). */
  transcript: string;
  /** Source/citation URLs the engine returned (Perplexity/grounded answers). */
  sources: string[];
  /** Per-run API cost in USD, computed by the adapter from token usage. */
  costUsd: number;
  /** Populated by scoreRun(); absent on the raw adapter output. */
  cited?: boolean;
  /** Whether the client's own DOMAIN (not just its brand name) was cited — the
   *  engine surfaced aeoanalyzers.com specifically. Powers Owned Citation Rate. */
  domainCited?: boolean;
  citedCompetitors?: string[];
  /** True when the engine's answer was CUT OFF by its output-token cap (the adapter
   *  saw finish_reason=length / stop_reason=max_tokens / MAX_TOKENS, or the text ends
   *  mid-sentence). A truncated answer is unmeasured, not measured-zero — it is
   *  EXCLUDED from every scored metric and badged in the UI (WO-QA-003 A1). */
  truncated?: boolean;
  /** Whether the engine actually searched the web for this answer, or answered from
   *  its weights alone. Only `search-grounded` runs count toward citation-win /
   *  owned-citation; `model-prior` runs are reported as a separate "model-prior
   *  visibility" metric (WO-QA-003 A2). Absent = treat as grounded (back-compat). */
  grounding?: 'search-grounded' | 'model-prior' | 'indeterminate';
}

export interface EngineAggregate {
  engine: Engine;
  brandedRuns: number;
  brandedCited: number;
  /** Retrievability: branded cite-rate %, 0–100. Health metric (target ~100). */
  retrievabilityPct: number;
  categoryRuns: number;
  categoryCited: number;
  /** Citation Win: category cite-rate %, 0–100. The competitive metric. */
  citationWinPct: number;
  /** "Cited instead": competitor name → number of runs it appeared in. */
  competitorCounts: Record<string, number>;
  costUsd: number;
  /** Runs excluded from this engine's scores because the answer was cut off. */
  truncatedRuns: number;
  /** True when > `TRUNCATION_BLOCK_RATIO` of this engine's attempted runs were
   *  truncated — the column is unreliable and the UI should not present its score
   *  as a real measurement (WO-QA-003 A1). */
  truncatedBlocked: boolean;
  /** Category runs where the engine answered from weights (no web search) — kept
   *  out of citationWinPct and reported separately (WO-QA-003 A2). */
  modelPriorRuns: number;
}

export interface SweepSummary {
  engines: EngineAggregate[];
  totalRuns: number;
  totalCostUsd: number;
  /** Competitors displacing the client, most-frequent first (across all engines). */
  topCompetitors: { name: string; count: number }[];
}

/** Normalize a URL or bare domain to a lowercased registrable host: strips
 *  protocol, `www.`, path, port. `"https://www.Foo.com/x"` → `"foo.com"`. */
export function normalizeDomain(input: string): string {
  let s = String(input || '').trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, ''); // protocol
  s = s.replace(/^www\./, '');
  s = s.split('/')[0]; // path
  s = s.split('?')[0].split('#')[0];
  s = s.split(':')[0]; // port
  return s;
}

/** The host of a URL, normalized like normalizeDomain (empty string if unparseable). */
function hostOf(url: string): string {
  return normalizeDomain(url);
}

/** True if `host` (registrable) equals or is a parent of any source URL's host.
 *  "blog.foo.com" in sources matches host "foo.com". */
function hostInSources(sources: string[], host: string): boolean {
  return !!host && (sources || []).some((u) => {
    const h = hostOf(u);
    return h === host || h.endsWith('.' + host);
  });
}

/** Escape a string for use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if `needle` appears in `text` as a whole word (case-insensitive). Used
 *  for brand/competitor NAME matching — substring matching would false-positive
 *  ("Ford" inside "afford"). Domains are matched separately as substrings. */
export function containsWord(text: string, needle: string): boolean {
  const n = String(needle || '').trim();
  if (!n) return false;
  // \b is unreliable around non-word chars in a brand ("Ben & Jerry's"); anchor
  // on a non-alphanumeric boundary instead so multi-word brands still match.
  const rx = new RegExp(`(^|[^a-z0-9])${escapeRegExp(n.toLowerCase())}([^a-z0-9]|$)`, 'i');
  return rx.test(String(text || '').toLowerCase());
}

/** True if `domain` (registrable host) appears in the answer text or any source
 *  host. Sub-domain sources count ("blog.foo.com" matches "foo.com"). */
export function domainCited(text: string, sources: string[], domain: string): boolean {
  const d = normalizeDomain(domain);
  if (!d) return false;
  if (String(text || '').toLowerCase().includes(d)) return true;
  return (sources || []).some((u) => {
    const h = hostOf(u);
    return h === d || h.endsWith('.' + d);
  });
}

// Phrases that mean the engine could NOT find, or is unsure about, the subject.
// A brand/domain string sitting inside a clause like this is a retrieval FAILURE,
// not a citation — the engine is typically echoing the domain back from the
// question while saying it can't find it. Kept as lowercased substrings (matched
// after apostrophe-normalization) so the list is easy to read, extend, and test.
// (Real WO-1 finding: Claude reported 8/8 branded retrievability on answers that
// explicitly said it couldn't find reliable information about the site.)
const NOT_FOUND_PHRASES = [
  "couldn't find", 'could not find', 'cannot find', "can't find", 'can not find',
  "couldn't locate", 'could not locate', 'unable to find', 'unable to locate',
  'unable to verify', 'unable to confirm', 'unable to determine', 'not able to find',
  'not able to locate', "wasn't able to find", 'was not able to find', "didn't find",
  'did not find', "couldn't verify", 'could not verify', "couldn't confirm",
  'could not confirm', 'no information about', 'no information on', 'no reliable information',
  'no details about', 'no record of', 'no results for', 'not familiar with',
  "i'm not familiar", 'unfamiliar with', "doesn't appear", 'does not appear',
  "doesn't seem", 'does not seem', "doesn't exist", 'does not exist', 'no such',
  'not sure whether', 'not sure if', 'unclear whether', 'unclear if',
  "don't have information", 'do not have information', "couldn't find any",
  'could not find any', "i don't have", 'i do not have',
  // Dogfood-surfaced patterns (AEO-on-itself sweep, 2026-07-30): engines that
  // hedge or ask for clarification while echoing the brand back.
  'cannot confirm', "can't confirm", 'can not confirm', "don't see", 'do not see',
  "didn't see", 'did not see', "don't mention", 'does not mention', "doesn't mention",
  "don't show", 'does not show', "doesn't show", 'no specific information',
  'not a specific product', "isn't a specific product", 'is not a specific product',
  'not a product name', "couldn't find a specific", 'could not find a specific',
  "don't see a specific", 'no specific tool', "isn't a specific tool",
  'clarify what tool', 'clarify which', 'could you clarify', 'which specific tool',
  "don't have specific information", 'not sure what',
];

/** Above this fraction of an engine's attempted runs being truncated, its column
 *  is flagged unreliable (score not presented as a real measurement). */
export const TRUNCATION_BLOCK_RATIO = 0.2;

/** True when a run answered from the model's weights instead of a live web search.
 *  Such runs are kept out of citation-win (grounded-only) and reported separately.
 *  Absent grounding is treated as grounded, so pre-A2 data/tests are unaffected. */
export function isModelPrior(run: SweepRunResult): boolean {
  return run.grounding === 'model-prior' || run.grounding === 'indeterminate';
}

/** True if an answer looks CUT OFF by a token cap — used together with the engine's
 *  own finish_reason (which the adapter records on `run.truncated`). Conservative:
 *  an answer ending in terminal punctuation, a closing bracket/quote, OR a bare
 *  domain/URL (concise answers often end on a named domain with no period, e.g.
 *  "…try peec.ai") is treated as COMPLETE. Anything else ends mid-word/clause. */
export function isTruncatedText(text: string): boolean {
  const t = String(text || '').trim();
  if (!t) return true;
  if (/[.!?:”"’')\]]$/.test(t)) return false;                 // ends on terminal punctuation
  if (/(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(t)) return false;   // ends on a bare domain/URL
  return true;
}

/** Normalize curly/backtick apostrophes to ' so "couldn’t" matches "couldn't". */
function normApostrophe(s: string): string {
  return String(s || '').toLowerCase().replace(/[‘’′`]/g, "'");
}

/** True if this clause expresses inability to find / uncertainty about a subject. */
function isNotFoundClause(clause: string): boolean {
  const c = normApostrophe(clause);
  return NOT_FOUND_PHRASES.some((p) => c.includes(p));
}

// Tool-use / search narration. Some engines (esp. Claude) narrate their search —
// "I'll search for information about {brand}…" — which echoes the brand positively
// even when the actual answer then says it can't find the site. A brand mention
// that sits ONLY in a narration clause must NOT score as a citation.
const SEARCH_NARRATION_PHRASES = [
  "i'll search", 'i will search', 'let me search', "i'll look", 'let me look',
  'searching for', "i'll research", 'let me research', "i'll find", 'let me find',
  "i'll check", 'let me check', 'let me look into', "i'll investigate", "i'll dig",
  'let me dig', 'i can search', 'let me pull', 'let me look up', "i'll look up",
];
/** True if this clause is just the engine narrating that it will search. */
function isSearchNarration(clause: string): boolean {
  const c = normApostrophe(clause);
  return SEARCH_NARRATION_PHRASES.some((p) => c.includes(p));
}

/** Lowercase and strip all non-alphanumerics, so "AEO Analyzers", "AEOAnalyzers",
 *  and "aeoanalyzers.com" collapse to the same token. Brand normalization: a brand
 *  whose name is its domain-without-spaces was previously missed (false negative). */
function despace(s: string): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Split answer text into rough clauses so a "couldn't find" is scoped to the
 *  clause it's in — a negation two sentences away must not suppress a genuine
 *  citation elsewhere in the same answer ("I found it at foo.com. I couldn't find
 *  its pricing." → still cited). */
function toClauses(text: string): string[] {
  // Split on ! ? ; newlines, and on a period ONLY when it terminates a sentence
  // (followed by whitespace or end-of-string). A bare `.` splitter would break
  // "aeoanalyzers.com" into "aeoanalyzers"/"com" and "$4.99" into "$4"/"99",
  // silently dropping real domain/price mentions.
  return String(text || '').split(/[!?\n;]+|\.(?=\s|$)/);
}

/** True if the subject is named in at least ONE clause that is NOT a not-found
 *  clause. `matchesSubject` tests a single clause for the brand/domain. A subject
 *  that appears ONLY inside "couldn't find …" clauses returns false — that's the
 *  fix for engines that echo the domain back while disclaiming knowledge of it. */
function positivelyMentioned(text: string, matchesSubject: (clause: string) => boolean): boolean {
  for (const clause of toClauses(text)) {
    if (matchesSubject(clause) && !isNotFoundClause(clause) && !isSearchNarration(clause)) return true;
  }
  return false;
}

/** Decide, for one run, whether the client was cited and which competitors were
 *  "cited instead". A citation = the client's domain in a SOURCE the engine
 *  actually retrieved (authoritative — stands even if the prose hedges), OR the
 *  client's domain/brand named in the answer text in a clause that is NOT a
 *  "couldn't find it" clause. Grounded — no LLM. The not-found guard is what stops
 *  an engine that merely echoes the domain back while disclaiming knowledge from
 *  scoring as a citation (the inflated-retrievability bug this module had). */
export function scoreRun(
  run: SweepRunResult,
  client: { domain: string; brand?: string },
  competitors: Competitor[]
): SweepRunResult {
  const clientDomain = normalizeDomain(client.domain);
  // A domain present in the SOURCES the engine pulled is real retrieval — the
  // engine fetched that page — so it counts regardless of how the prose hedges.
  const inSources = (host: string): boolean => hostInSources(run.sources, host);

  // Brand normalization: match the spaced name ("AEO Analyzers"), the de-spaced
  // form ("AEOAnalyzers"), and the domain root ("aeoanalyzers") as one entity.
  const clientToken = despace(client.brand || '') || despace(clientDomain.split('.')[0] || '');
  const cited =
    inSources(clientDomain) ||
    positivelyMentioned(run.transcript, (clause) =>
      (!!clientDomain && clause.toLowerCase().includes(clientDomain)) ||
      (!!client.brand && containsWord(clause, client.brand)) ||
      (clientToken.length >= 5 && despace(clause).includes(clientToken)));

  // Owned Citation Rate signal: was the DOMAIN itself surfaced (in sources or
  // named in a positive clause), as opposed to only the brand name being echoed?
  const domainCited =
    inSources(clientDomain) ||
    positivelyMentioned(run.transcript, (clause) =>
      !!clientDomain && clause.toLowerCase().includes(clientDomain));

  const citedCompetitors = competitorsCited(run, competitors);

  return { ...run, cited, domainCited, citedCompetitors };
}

/** Which of `competitors` are "cited instead" in this one run — the competitor's
 *  domain in a retrieved SOURCE, or its name/domain positively mentioned (not in a
 *  "couldn't find" clause). Extracted from scoreRun so the scorecard can re-run it
 *  against an AUTO-DETECTED competitor set without re-scoring the whole run. */
export function competitorsCited(run: SweepRunResult, competitors: Competitor[]): string[] {
  const out: string[] = [];
  for (const c of competitors || []) {
    const cDomain = c.domain ? normalizeDomain(c.domain) : '';
    const hit =
      hostInSources(run.sources, cDomain) ||
      positivelyMentioned(run.transcript, (clause) =>
        containsWord(clause, c.name) ||
        (!!cDomain && clause.toLowerCase().includes(cDomain)));
    if (hit) out.push(c.name);
  }
  return out;
}

// ─── Auto-detected competitors ──────────────────────────────────────────────
// When the user provides no competitor list, we still want Share of Model and a
// "cited instead" list. We mine them from the CATEGORY answers themselves —
// grounded (every candidate is a domain that literally appears in a transcript or
// a retrieved source) and deterministic (no LLM). A candidate is a registrable
// host that recurs across several category runs and is NOT the client's own domain
// nor a known platform / reference / source host (those recur in almost every
// answer and would swamp the list). The result is a STARTING list the user can
// refine — surfaced as "auto-detected," never presented as authoritative truth.

/** Platforms, reference/directory sites, model providers, and common answer
 *  sources that are not products competing in the client's category. */
const NON_COMPETITOR_HOSTS = new Set([
  // social / UGC / video / code
  'reddit.com', 'linkedin.com', 'youtube.com', 'youtu.be', 'facebook.com', 'twitter.com',
  'x.com', 'medium.com', 'quora.com', 'github.com', 'pinterest.com', 'instagram.com',
  'tiktok.com', 'substack.com',
  // reference / directories / reviews / news
  'wikipedia.org', 'g2.com', 'gartner.com', 'capterra.com', 'getapp.com', 'trustpilot.com',
  'crunchbase.com', 'producthunt.com', 'betalist.com', 'techradar.com', 'forbes.com',
  'businessinsider.com', 'techcrunch.com', 'zapier.com',
  // search engines / model providers (named as engines, not as category rivals)
  'google.com', 'bing.com', 'microsoft.com', 'apple.com', 'openai.com', 'chatgpt.com',
  'claude.ai', 'anthropic.com', 'perplexity.ai', 'gemini.google.com', 'meta.com',
  // Gemini grounding-redirect host (collapses to google.com anyway, belt-and-braces)
  'cloud.google.com',
]);

/** Collapse a host to its registrable-ish domain (last two labels): "blog.foo.com"
 *  → "foo.com", "en.wikipedia.org" → "wikipedia.org". Good enough without a Public
 *  Suffix List (over-merges multi-part ccTLDs like .co.uk — acceptable here). */
function registrable(host: string): string {
  const parts = String(host || '').split('.').filter(Boolean);
  return parts.length <= 2 ? parts.join('.') : parts.slice(-2).join('.');
}

// A bare-domain token in prose: "tryprofound.com", "otterly.ai", "peec.ai".
const DOMAIN_RX = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\b/gi;

/** The distinct set of registrable hosts referenced by one run — from both the
 *  retrieved sources and any bare domains written in the answer text. */
function hostsInRun(run: SweepRunResult): Set<string> {
  const hosts = new Set<string>();
  for (const u of run.sources || []) {
    const h = registrable(hostOf(u));
    if (h.includes('.')) hosts.add(h);
  }
  for (const m of String(run.transcript || '').toLowerCase().matchAll(DOMAIN_RX)) {
    const h = registrable(normalizeDomain(m[0]));
    if (h.includes('.')) hosts.add(h);
  }
  return hosts;
}

/** Mine likely competitor entities (by domain) from the CATEGORY answers, for when
 *  the user gives no competitor list. A candidate host must appear in `>= minRuns`
 *  category runs and not be the client's own domain or a known non-competitor host.
 *  Returns Competitor[] {name: domain, domain}, most-frequent first, capped at `max`. */
export function detectCompetitors(
  runs: SweepRunResult[],
  client: { domain: string; brand?: string },
  opts?: { minRuns?: number; max?: number }
): Competitor[] {
  const minRuns = opts?.minRuns ?? 2;
  const max = opts?.max ?? 8;
  const own = registrable(normalizeDomain(client.domain));
  const counts: Record<string, number> = {};
  for (const r of runs) {
    if (r.queryType !== 'category' || r.truncated) continue;
    for (const h of hostsInRun(r)) {
      if (h === own || NON_COMPETITOR_HOSTS.has(h)) continue;
      counts[h] = (counts[h] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .filter(([, n]) => n >= minRuns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([domain]) => ({ name: domain, domain }));
}

/** Roll scored runs up into per-engine aggregates + a cross-engine summary.
 *  Accepts runs already passed through scoreRun (falls back to scoring them if
 *  `cited` is absent, so callers can hand it raw runs too). */
export function aggregateSweep(
  runs: SweepRunResult[],
  client: { domain: string; brand?: string },
  competitors: Competitor[]
): SweepSummary {
  const scored = runs.map((r) =>
    typeof r.cited === 'boolean' ? r : scoreRun(r, client, competitors)
  );

  const byEngine = new Map<Engine, EngineAggregate>();
  const globalCompetitors: Record<string, number> = {};
  let totalCostUsd = 0;

  for (const r of scored) {
    totalCostUsd += r.costUsd || 0;
    let agg = byEngine.get(r.engine);
    if (!agg) {
      agg = {
        engine: r.engine,
        brandedRuns: 0, brandedCited: 0, retrievabilityPct: 0,
        categoryRuns: 0, categoryCited: 0, citationWinPct: 0,
        competitorCounts: {}, costUsd: 0,
        truncatedRuns: 0, truncatedBlocked: false, modelPriorRuns: 0,
      };
      byEngine.set(r.engine, agg);
    }
    agg.costUsd += r.costUsd || 0;
    // A truncated answer is unmeasured — count it (for the block ratio) but do NOT
    // let it move any score (WO-QA-003 A1).
    if (r.truncated) { agg.truncatedRuns++; continue; }
    if (r.queryType === 'branded') {
      agg.brandedRuns++;
      if (r.cited) agg.brandedCited++;
    } else {
      // Model-prior category answers (no live search) don't measure citation-win —
      // count them separately and keep them out of the win denominator (A2).
      if (isModelPrior(r)) { agg.modelPriorRuns++; continue; }
      agg.categoryRuns++;
      if (r.cited) agg.categoryCited++;
      // Only count competitor displacement on grounded CATEGORY queries.
      for (const name of r.citedCompetitors || []) {
        agg.competitorCounts[name] = (agg.competitorCounts[name] || 0) + 1;
        globalCompetitors[name] = (globalCompetitors[name] || 0) + 1;
      }
    }
  }

  const engines = [...byEngine.values()].map((a) => {
    const attempted = a.brandedRuns + a.categoryRuns + a.truncatedRuns;
    return {
      ...a,
      retrievabilityPct: a.brandedRuns ? Math.round((a.brandedCited / a.brandedRuns) * 100) : 0,
      citationWinPct: a.categoryRuns ? Math.round((a.categoryCited / a.categoryRuns) * 100) : 0,
      truncatedBlocked: attempted > 0 && a.truncatedRuns / attempted > TRUNCATION_BLOCK_RATIO,
    };
  });

  const topCompetitors = Object.entries(globalCompetitors)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { engines, totalRuns: scored.length, totalCostUsd, topCompetitors };
}

// ─── Commercial scorecard (UX-PRINCIPLES §4) ────────────────────────────────
// The five buyer-facing questions, computed from the SAME scored runs — no extra
// engine calls, no LLM. Brand Fidelity (score 2) is intentionally omitted here
// until the WO-2 fidelity module is wired in; everything else is derivable now.

export interface SweepScorecard {
  /** 1. Known when asked by name (branded cite-rate). */
  brandedRetrievabilityPct: number;
  /** 3. Recommended to new buyers (unbranded category cite-rate). THE metric. */
  categoryRecommendationWinPct: number;
  /** 4. Of answers that surface the brand at all, how often the OWN DOMAIN is
   *  cited as the source. null when the brand was never surfaced. */
  ownedCitationRatePct: number | null;
  /** 5. Brand's share of all category recommendations (brand vs competitors).
   *  null when no category recommendations were seen at all. */
  competitiveSharePct: number | null;
  /** Cite-rate among model-prior category runs (the model recommends you from
   *  weights alone, no web search). Reported separately from citation-win, which is
   *  grounded-only. null when there were no model-prior runs (WO-QA-003 A2). */
  modelPriorVisibilityPct: number | null;
  /** How many category runs were model-prior (kept out of citation-win). */
  modelPriorRuns: number;
  /** Who wins the category instead, most-frequent first. */
  topCompetitors: { name: string; count: number }[];
  /** True when `topCompetitors`/Competitive Share came from auto-detection (the
   *  user supplied no competitor list). The UI labels these as detected + editable. */
  competitorsAutoDetected: boolean;
  brandedRuns: number;
  categoryRuns: number;
  /** A short, plain-English read of the result — the headline, not a data dump. */
  plainSummary: string;
}

const pct = (num: number, den: number): number => (den ? Math.round((num / den) * 100) : 0);

/** Compute the buyer-facing scorecard + a grounded plain-English summary from the
 *  scored runs. Deterministic — the numbers are reproducible from the transcripts. */
export function sweepScorecard(
  runs: SweepRunResult[],
  client: { domain: string; brand?: string },
  competitors: Competitor[]
): SweepScorecard {
  const scored = runs.map((r) =>
    typeof r.cited === 'boolean' ? r : scoreRun(r, client, competitors)
  );

  // Fall back to auto-detected competitors when the user supplied none, so
  // Competitive Share + "cited instead" still work. Recompute per-run competitor
  // hits against this effective set (the stored citedCompetitors were scored
  // against the user's — possibly empty — list at sweep time).
  const provided = (competitors || []).filter((c) => c && c.name);
  const effectiveCompetitors = provided.length ? provided : detectCompetitors(scored, client);
  const competitorsAutoDetected = !provided.length && effectiveCompetitors.length > 0;

  let brandedRuns = 0, brandedCited = 0, categoryRuns = 0, categoryCited = 0;
  let surfaced = 0, domainCited = 0;          // for Owned Citation Rate (grounded only)
  let brandCatRecs = 0, competitorCatRecs = 0; // for Competitive Share
  let modelPriorRuns = 0, modelPriorCited = 0; // model-prior visibility (separate)
  const competitorCounts: Record<string, number> = {};

  for (const r of scored) {
    if (r.truncated) continue; // cut-off answer — unmeasured, never scored (A1)
    if (r.queryType === 'branded') {
      brandedRuns++; if (r.cited) brandedCited++;
      if (r.cited) { surfaced++; if (r.domainCited) domainCited++; }
    } else if (isModelPrior(r)) {
      // No live search — report as model-prior visibility, keep out of citation-win.
      modelPriorRuns++; if (r.cited) modelPriorCited++;
    } else {
      categoryRuns++; if (r.cited) { categoryCited++; brandCatRecs++; }
      for (const name of competitorsCited(r, effectiveCompetitors)) {
        competitorCatRecs++;
        competitorCounts[name] = (competitorCounts[name] || 0) + 1;
      }
      if (r.cited) { surfaced++; if (r.domainCited) domainCited++; }
    }
  }

  const topCompetitors = Object.entries(competitorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const brandedRetrievabilityPct = pct(brandedCited, brandedRuns);
  const categoryRecommendationWinPct = pct(categoryCited, categoryRuns);
  const ownedCitationRatePct = surfaced ? pct(domainCited, surfaced) : null;
  const competitiveSharePct =
    brandCatRecs + competitorCatRecs ? pct(brandCatRecs, brandCatRecs + competitorCatRecs) : null;
  const modelPriorVisibilityPct = modelPriorRuns ? pct(modelPriorCited, modelPriorRuns) : null;

  const who = client.brand || normalizeDomain(client.domain) || 'your brand';
  const plainSummary = buildPlainSummary({
    who,
    brandedRetrievabilityPct,
    categoryRecommendationWinPct,
    ownedCitationRatePct,
    topCompetitor: topCompetitors[0] || null,
    hasCategory: categoryRuns > 0,
    hasBranded: brandedRuns > 0,
  });

  return {
    brandedRetrievabilityPct,
    categoryRecommendationWinPct,
    ownedCitationRatePct,
    competitiveSharePct,
    modelPriorVisibilityPct,
    modelPriorRuns,
    topCompetitors,
    competitorsAutoDetected,
    brandedRuns,
    categoryRuns,
    plainSummary,
  };
}

/** Turn the numbers into two or three plain sentences a non-expert understands.
 *  Grounded templating only — states nothing the runs didn't measure. */
function buildPlainSummary(s: {
  who: string;
  brandedRetrievabilityPct: number;
  categoryRecommendationWinPct: number;
  ownedCitationRatePct: number | null;
  topCompetitor: { name: string; count: number } | null;
  hasCategory: boolean;
  hasBranded: boolean;
}): string {
  const parts: string[] = [];
  if (s.hasBranded) {
    const b = s.brandedRetrievabilityPct;
    const knows = b >= 80 ? 'reliably finds' : b >= 40 ? 'sometimes finds' : 'often cannot find';
    parts.push(`When buyers ask about ${s.who} by name, AI ${knows} it (${b}%).`);
  }
  if (s.hasCategory) {
    const c = s.categoryRecommendationWinPct;
    let line = `On unbranded buyer questions, AI recommends ${s.who} ${c}% of the time`;
    if (c === 0) line = `On unbranded buyer questions, AI does not yet recommend ${s.who} (0%)`;
    if (s.topCompetitor && s.topCompetitor.count > 0) {
      line += ` — when it doesn't, ${s.topCompetitor.name} wins most often (${s.topCompetitor.count}×)`;
    }
    parts.push(line + '.');
  }
  if (s.ownedCitationRatePct !== null) {
    parts.push(`When ${s.who} is mentioned, its own site is cited as the source ${s.ownedCitationRatePct}% of the time.`);
  }
  return parts.join(' ');
}

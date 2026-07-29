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
  citedCompetitors?: string[];
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
];

/** Normalize curly/backtick apostrophes to ' so "couldn’t" matches "couldn't". */
function normApostrophe(s: string): string {
  return String(s || '').toLowerCase().replace(/[‘’′`]/g, "'");
}

/** True if this clause expresses inability to find / uncertainty about a subject. */
function isNotFoundClause(clause: string): boolean {
  const c = normApostrophe(clause);
  return NOT_FOUND_PHRASES.some((p) => c.includes(p));
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
    if (matchesSubject(clause) && !isNotFoundClause(clause)) return true;
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
  const inSources = (host: string): boolean =>
    !!host && (run.sources || []).some((u) => {
      const h = hostOf(u);
      return h === host || h.endsWith('.' + host);
    });

  const cited =
    inSources(clientDomain) ||
    positivelyMentioned(run.transcript, (clause) =>
      (!!clientDomain && clause.toLowerCase().includes(clientDomain)) ||
      (!!client.brand && containsWord(clause, client.brand)));

  const citedCompetitors: string[] = [];
  for (const c of competitors || []) {
    const cDomain = c.domain ? normalizeDomain(c.domain) : '';
    const hit =
      inSources(cDomain) ||
      positivelyMentioned(run.transcript, (clause) =>
        containsWord(clause, c.name) ||
        (!!cDomain && clause.toLowerCase().includes(cDomain)));
    if (hit) citedCompetitors.push(c.name);
  }

  return { ...run, cited, citedCompetitors };
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
      };
      byEngine.set(r.engine, agg);
    }
    agg.costUsd += r.costUsd || 0;
    if (r.queryType === 'branded') {
      agg.brandedRuns++;
      if (r.cited) agg.brandedCited++;
    } else {
      agg.categoryRuns++;
      if (r.cited) agg.categoryCited++;
    }
    // Only count competitor displacement on CATEGORY queries — being "cited
    // instead" on a branded query for your own brand isn't a competitive loss.
    if (r.queryType === 'category') {
      for (const name of r.citedCompetitors || []) {
        agg.competitorCounts[name] = (agg.competitorCounts[name] || 0) + 1;
        globalCompetitors[name] = (globalCompetitors[name] || 0) + 1;
      }
    }
  }

  const engines = [...byEngine.values()].map((a) => ({
    ...a,
    retrievabilityPct: a.brandedRuns ? Math.round((a.brandedCited / a.brandedRuns) * 100) : 0,
    citationWinPct: a.categoryRuns ? Math.round((a.categoryCited / a.categoryRuns) * 100) : 0,
  }));

  const topCompetitors = Object.entries(globalCompetitors)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { engines, totalRuns: scored.length, totalCostUsd, topCompetitors };
}

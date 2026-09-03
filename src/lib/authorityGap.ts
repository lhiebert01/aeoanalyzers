// WO-7 — Source Attribution & Authority Gap. From the citation-sweep transcripts
// (search-grounded answers carry source citations — Perplexity especially),
// extract which third-party domains the engines actually SOURCE for the client's
// query space, and turn that into a presence-gap report: "answer engines trust
// these directories/wikis/pages in your category; you are absent from these — get
// listed, in this priority order."
//
// Explicitly NOT the competitor's tactic of auto-adding the referring URL as an
// outbound link on the client's site — causality runs the other way (inbound
// presence on the authority source drives discovery). This is a recommendation
// engine, not an auto-linker.
//
// Deterministic: it counts and ranks the sources the engines returned.

// Local copy (kept standalone so this module has no runtime intra-lib import —
// required for the ESM serverless functions that import it to resolve on Vercel).
function normalizeDomain(input: string): string {
  let s = String(input || '').trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, '');
  s = s.replace(/^www\./, '');
  s = s.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  return s;
}

export interface AuthoritySource {
  domain: string;
  /** How many sweep runs cited this domain. */
  citations: number;
  /** Distinct engines that cited it. */
  engines: string[];
  /** A recognized high-authority listing surface (directory/wiki/community). */
  isKnownAuthority: boolean;
}

export interface AuthorityGapReport {
  /** Third-party domains engines cite in this category, ranked by citation count. */
  authorityDomains: AuthoritySource[];
  /** Prioritized "get listed here" recommendations. */
  recommendations: string[];
  /** ADDENDUM-002 #4: a single third-party operator saturating the category's
   *  retrieval surfaces — the mechanism behind entity conflation (Nissen). Feeds
   *  the WO-2 classifier as a conflation-risk driver. Null when no domination. */
  pollutionSignal: { domain: string; citations: number; sharePct: number } | null;
}

// Domains answer engines disproportionately trust as category authorities.
const KNOWN_AUTHORITY = [
  'wikipedia.org', 'wikidata.org', 'g2.com', 'capterra.com', 'getapp.com',
  'trustpilot.com', 'crunchbase.com', 'producthunt.com', 'reddit.com',
  'github.com', 'stackoverflow.com', 'ycombinator.com', 'gartner.com',
  'forbes.com', 'techcrunch.com', 'medium.com', 'quora.com', '.gov', '.edu',
];

function isKnownAuthority(domain: string): boolean {
  return KNOWN_AUTHORITY.some((a) => (a.startsWith('.') ? domain.endsWith(a) : domain === a || domain.endsWith('.' + a)));
}

/** WO-INTEGRITY-002 B3: archive snapshots and government artifacts are not pitchable
 *  "category authorities" (e.g. obamawhitehouse.archives.gov, web.archive.org) — filter
 *  them out of the derived lists so we never tell a client to "get listed" on them. */
function isArchiveOrGovNoise(domain: string): boolean {
  return /(^|\.)(gov|mil)$/.test(domain) || /archive|wayback|\.archives\./.test(domain);
}

// Engine plumbing that shows up in `sources` but is NOT a real citable authority —
// Gemini wraps every grounded source behind a vertexaisearch redirect, which would
// otherwise dominate the authority gap (dogfood: 63 "citations"). Skip these.
const INFRA_HOSTS = new Set([
  'vertexaisearch.cloud.google.com',
  'grounding-api-redirect.vertexaisearch.cloud.google.com',
]);

interface RunLike {
  engine: string;
  sources: string[];
  queryType?: string;
}

/** Build the authority-gap report from sweep runs. `clientDomain` is excluded
 *  (its own pages aren't third-party authority). */
export function aggregateAuthorityGap(runs: RunLike[], clientDomain: string): AuthorityGapReport {
  const client = normalizeDomain(clientDomain);
  const byDomain = new Map<string, { citations: number; engines: Set<string> }>();

  for (const run of runs) {
    for (const url of run.sources || []) {
      const host = normalizeDomain(url);
      if (!host) continue;
      if (host === client || host.endsWith('.' + client)) continue; // client's own = not third-party authority
      if (INFRA_HOSTS.has(host)) continue; // engine redirect/wrapper, not a real citable source
      const e = byDomain.get(host) || { citations: 0, engines: new Set<string>() };
      e.citations++;
      e.engines.add(run.engine);
      byDomain.set(host, e);
    }
  }

  const authorityDomains: AuthoritySource[] = [...byDomain.entries()]
    .map(([domain, v]) => ({
      domain,
      citations: v.citations,
      engines: [...v.engines],
      isKnownAuthority: isKnownAuthority(domain),
    }))
    .sort((a, b) => b.citations - a.citations || Number(b.isKnownAuthority) - Number(a.isKnownAuthority));

  const recommendations: string[] = [];
  // WO-INTEGRITY-002 B3: the lists must come from THIS sweep's cited sources, ranked by
  // count — not a generic hardcoded roster. Filter archive/government artifacts and
  // single-hit noise; KNOWN_AUTHORITY is only a same-count tie-breaker (already in the sort).
  const nAnswers = runs.length;
  const ranked = authorityDomains.filter((d) => d.citations >= 2 && !isArchiveOrGovNoise(d.domain));
  const topAuthorities = ranked.slice(0, 5);
  const topOthers = ranked.slice(5, 10);

  if (topAuthorities.length) {
    recommendations.push(
      `Answer engines repeatedly source these category authorities (from ${nAnswers} stored answers): ${topAuthorities.map((d) => `${d.domain} (${d.citations}×)`).join(', ')}. Get an accurate, up-to-date listing/profile on each (in that priority order) — inbound presence on the sources engines already trust is what drives your discovery.`
    );
  }
  if (topOthers.length) {
    recommendations.push(
      `Also cited in your query space: ${topOthers.map((d) => d.domain).join(', ')}. Pursue guest content, mentions, or listings where relevant and legitimate.`
    );
  }
  if (!authorityDomains.length) {
    recommendations.push('No third-party sources were cited across these runs — either the queries were answered from training data (search-off) or coverage is thin. Run with search enabled and expand the category query panel.');
  }

  // ADDENDUM-002 #4: POSSE, not parasite. This boundary is non-negotiable.
  if (authorityDomains.length) {
    recommendations.push(
      'Follow POSSE (Publish on your Own Site, Syndicate Elsewhere): keep the canonical version on your domain, and where you syndicate, attribute + link back and set canonical/og per placement. Do NOT host content on a high-authority platform purely to borrow its ranking (parasite SEO / Perplexity-Pages seeding) — Google’s site-reputation-abuse enforcement makes that a crash risk and the equity accrues to the host, not you.'
    );
  }

  // ADDENDUM-002 #4: pollution signal — one non-client operator saturating the
  // category retrieval space is the conflation mechanism (feeds the WO-2 classifier).
  const totalCitations = authorityDomains.reduce((s, d) => s + d.citations, 0);
  const top = authorityDomains[0];
  let pollutionSignal: AuthorityGapReport['pollutionSignal'] = null;
  if (top && totalCitations >= 4) {
    const sharePct = Math.round((top.citations / totalCitations) * 100);
    if (sharePct >= 45 && top.citations >= 3) {
      pollutionSignal = { domain: top.domain, citations: top.citations, sharePct };
      recommendations.push(
        `Conflation-risk driver: ${top.domain} dominates your category’s cited sources (${sharePct}% of citations). When one third-party operator saturates the retrieval surface, engines can merge its entity with yours — pair the authority actions above with the disambiguation counter-signals (WO-8 / entity graph).`
      );
    }
  }

  return { authorityDomains, recommendations, pollutionSignal };
}

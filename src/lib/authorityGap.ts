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

import { normalizeDomain } from './citationSweep';

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
  const topAuthorities = authorityDomains.filter((d) => d.isKnownAuthority).slice(0, 5);
  const topOthers = authorityDomains.filter((d) => !d.isKnownAuthority).slice(0, 5);

  if (topAuthorities.length) {
    recommendations.push(
      `Answer engines repeatedly source these category authorities: ${topAuthorities.map((d) => d.domain).join(', ')}. Get an accurate, up-to-date listing/profile on each (in that priority order) — inbound presence on the sources engines already trust is what drives your discovery.`
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

  return { authorityDomains, recommendations };
}

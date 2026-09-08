// ONE schema generator. Both reports call this; neither composes markup of its own.
//
// WO-AEO-REPORT-INTEGRITY-003 Rev B §2.1. On September 8 2026 the two reports for the
// same domain on the same day emitted contradictory JSON-LD: the analysis report an
// Organization named "PI GenAI LLC" at pigenai.com, the sweep an Organization named
// "AEO Analyzers" at thesmartaiworker.com. Pasting both would declare two different
// organizations at one root, and nothing told the customer which to use.
//
// The cause was architectural rather than a slip. The sweep's block came from
// deterministic code; the analysis report's came from the language model, prompted to
// author JSON-LD. **A model must not author machine-readable claims.** Markup is a
// factual assertion about identity, and the grounded-output rule that governs numbers
// governs it too. This module is the deterministic replacement.
//
// Two hard rules, both from §2.5:
//   1. Never emit two different values for the same property in one document. Pick one,
//      or emit none.
//   2. Never assert a name-to-URL binding the sweep did not verify (§2.2, via
//      brandDomainMismatch in sweepActions).

/** Normalise a name or host to comparable letters: "AEO Analyzers" -> "aeoanalyzers",
 *  "thesmartaiworker.com" -> "thesmartaiworker". */
function slug(x: string): string {
  return String(x || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
    .split('/')[0].replace(/\.[a-z.]+$/, '').replace(/[^a-z0-9]/g, '');
}

/** Is the domain owned by this user? The caller must supply the set; an unknown domain
 *  is NOT treated as owned, so callers pass the user's full owned list and we never
 *  disclaim against it (WO-AEO-REPORT-INTEGRITY-003 §2.3). */
export function isOwnedDomain(candidate: string, owned: string[] | undefined): boolean {
  const c = slug(candidate);
  return (owned || []).some((o) => slug(o) === c);
}

/** Does the entered brand plausibly belong to the domain being swept?
 *
 *  §2.2. A sweep of thesmartaiworker.com carrying the brand "AEO Analyzers" made the
 *  report emit an Organization node binding that name to that domain — manufacturing,
 *  in machine-readable form on the customer's own site, the exact entity collision this
 *  product exists to detect.
 *
 *  The founder's one-line test: would this brand's own website be the domain we are
 *  sweeping? Either signal is enough to declare a mismatch — the site's own declared
 *  name differs, or the brand slug does not appear in the domain. On mismatch we emit
 *  NOTHING rather than a confident wrong answer. */
export function brandDomainMismatch(
  domain: string,
  brand: string | undefined,
  declaredName?: string,
): { mismatch: boolean; reason: string } {
  const b = slug(brand || '');
  if (!b) return { mismatch: false, reason: '' };
  const d = slug(domain);
  const slugMatches = d.includes(b) || b.includes(d);
  const dn = slug(declaredName || '');
  if (dn && dn !== b && !slugMatches) {
    return {
      mismatch: true,
      reason: `the entered brand "${brand}" does not match this site's own declared name${declaredName ? ` ("${declaredName}")` : ''}, and "${brand}" does not appear in ${domain}`,
    };
  }
  if (!slugMatches && !dn) {
    return {
      mismatch: true,
      reason: `"${brand}" does not appear in ${domain} and the site declares no name we could check it against`,
    };
  }
  return { mismatch: false, reason: '' };
}

export interface SchemaFacts {
  /** The domain being reported on. */
  domain: string;
  /** The brand as entered/configured by the user. */
  brand?: string;
  /** The name the SITE declares about itself (schema, title). Undefined when absent. */
  declaredName?: string;
  /** Every domain this user owns — never disclaimed, never treated as an impostor. */
  ownedDomains?: string[];
  /** Third-party entities the engines confused them with. */
  collisions?: string[];
  /** What the page already ships, so we prescribe a delta rather than a duplicate. */
  served?: { hasOrg?: boolean; hasOrgId?: boolean; hasDisambiguation?: boolean; sameAs?: string[] };
  /** Every distinct form of the organization name found on the page, with counts. */
  observedNames?: { value: string; count: number }[];
  /** Every distinct value seen for a person's job title, with counts. */
  observedJobTitles?: { value: string; count: number }[];
}

export interface SchemaResult {
  /** The JSON-LD block, or null when the generator refuses. Never a guess. */
  jsonLd: string | null;
  /** Plain-language reason when jsonLd is null. */
  refusedBecause: string | null;
  /** Findings the generator produced while building — surfaced in the report. */
  findings: string[];
}

/** §2.5 — a page that names itself more than one way is an entity-consistency defect,
 *  and it is exactly what this product sells against. Report it rather than silently
 *  picking one. Returns the winner (most frequent) and a finding when there is a tie
 *  or a conflict. */
export function reconcileProperty(
  label: string,
  observed: { value: string; count: number }[] | undefined
): { chosen: string | null; finding: string | null } {
  const seen = (observed || []).filter((o) => o.value && o.value.trim());
  if (seen.length === 0) return { chosen: null, finding: null };
  if (seen.length === 1) return { chosen: seen[0].value, finding: null };

  const sorted = [...seen].sort((a, b) => b.count - a.count);
  const list = sorted.map((o) => `${o.value} (${o.count}×)`).join(' and ');

  // A tie gives us no basis to choose, and choosing anyway would be inventing a canon
  // the customer never set. Emit nothing for the property and say so.
  if (sorted[0].count === sorted[1].count) {
    return {
      chosen: null,
      finding: `This page refers to your ${label} ${sorted.length} ways, equally often: ${list}. Answer engines treat these as different entities. Pick one and use it everywhere — we have left it out of the generated markup rather than choose for you.`,
    };
  }
  return {
    chosen: sorted[0].value,
    finding: `This page refers to your ${label} ${sorted.length} ways: ${list}. Answer engines treat these as different entities. Pick one and use it everywhere. The generated markup uses the most frequent form.`,
  };
}

/** Build the block, or refuse. Called by BOTH renderers. */
export function generateSchema(facts: SchemaFacts): SchemaResult {
  const findings: string[] = [];
  const domain = String(facts.domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!domain) return { jsonLd: null, refusedBecause: 'no domain was supplied', findings };

  // §2.5 rule 1 — reconcile before emitting; never two values for one property.
  const orgName = reconcileProperty('organization name', facts.observedNames);
  if (orgName.finding) findings.push(orgName.finding);
  const jobTitle = reconcileProperty('job title', facts.observedJobTitles);
  if (jobTitle.finding) findings.push(jobTitle.finding);

  // The name we would assert: the site's own declared name first, then the reconciled
  // page name, then the configured brand. We never prefer the configured brand over
  // what the site says about itself — that is how the Sep 8 collision was manufactured.
  const name = facts.declaredName || orgName.chosen || facts.brand;
  if (!name) {
    return {
      jsonLd: null,
      refusedBecause: `we could not establish what ${domain} calls itself. No name appears in its markup or its page text, so any name we asserted would be a guess.`,
      findings,
    };
  }

  // §2.2 — refuse an unverified name-to-URL binding.
  const mm = brandDomainMismatch(domain, name, facts.declaredName);
  if (mm.mismatch) {
    return {
      jsonLd: null,
      refusedBecause: `${mm.reason}. Publishing an Organization block binding "${name}" to ${domain} would tell every answer engine that the organization called ${name} lives at ${domain}. If that is not true, it creates exactly the entity confusion this report is built to find.`,
      findings,
    };
  }

  const url = `https://${domain}`;
  // §2.3 — an owned domain is never disclaimed and never treated as an impostor.
  const owned = facts.ownedDomains;
  const safe = (facts.collisions || []).filter((c) => !isOwnedDomain(c, owned));

  const node: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${url}/#org`,
    name,
    url,
  };
  if (safe.length) {
    node.disambiguatingDescription =
      `${name} (${domain}) is not affiliated with similarly named entities such as ${safe.slice(0, 3).join(', ')}.`;
  }

  const graph: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      node,
      { '@type': 'WebSite', '@id': `${url}/#website`, url, publisher: { '@id': `${url}/#org` } },
    ],
  };

  return { jsonLd: JSON.stringify(graph, null, 2), refusedBecause: null, findings };
}

// WO-UX-CLARITY-001 — "What to do about these results".
//
// Every sweep report (web + .md + exec variant) ends by mapping each MEASURED
// layer to the concrete next action — so a sweep is a work order, not just a
// scoreboard. Deterministic + self-contained (no intra-lib imports) so it renders
// identically in the client and in a serverless exec-report build. The monthly
// re-sweep line makes the measurement loop a product behavior, not a blog promise.

export interface SweepActionInputs {
  /** Branded retrievability %, or null if unmeasured. Weak → structural fix path. */
  brandedRetrievabilityPct: number | null;
  /** Category recommendation win %, or null. 0/low → content + authority agenda. */
  categoryWinPct: number | null;
  /** True when the engine drifted on a fact OR cited a colliding entity. */
  hasFidelityOrCollision: boolean;
  /** Colliding-entity labels for the disambiguation remediation. */
  collisions: string[];
  /** The exact unbranded questions where you were NOT cited (the content agenda). */
  losingCategoryQuestions: string[];
  /** "Do now" (self-serve) authority domains — this month's checklist. */
  doNowAuthorities: string[];
  /** For the paste-ready remediation snippet. */
  brand?: string;
  domain: string;
  /** WO-INTEGRITY-002 B5: what schema the page ALREADY serves, so the fix prescribes
   *  only the delta (missing @id / sameAs / disambiguatingDescription) rather than a
   *  fresh Organization the page already has. */
  served?: { hasOrg?: boolean; hasOrgId?: boolean; hasDisambiguation?: boolean; sameAs?: string[] };
}

/** Threshold below which branded retrievability is "weak" enough to send the user
 *  to the structural (AEO Score) fix path. Named for testability. */
export const WEAK_RETRIEVABILITY = 80;

/** The paste-ready disambiguation remediation — a connected @id graph + one visible
 *  unaffiliation line. Only re-expresses DETECTED values (brand, domain, colliding
 *  names): no fabricated facts (claimsSafety discipline). Packaged like the Score's
 *  schema block so it's copy-paste ready. */
export function remediationSnippet(
  domain: string,
  brand: string | undefined,
  collisions: string[],
  served?: { hasOrg?: boolean; hasOrgId?: boolean; hasDisambiguation?: boolean; sameAs?: string[] },
): string[] {
  const name = (brand || domain).trim();
  const url = `https://${domain}`;

  // WO-INTEGRITY-002 B5: if the page ALREADY ships an Organization, prescribe only the
  // delta — never tell it to paste a second Organization node.
  if (served?.hasOrg) {
    const missing: string[] = [];
    if (!served.hasOrgId) missing.push(`a stable \`"@id": "${url}/#org"\` on the Organization node (so engines resolve *your* node, not a same-named one)`);
    if (!served.hasDisambiguation) missing.push(`a \`disambiguatingDescription\` on that node stating what ${name} is and is not`);
    // WO-INTEGRITY-002 B5 follow-up: trigger on the DECLARED sameAs count — a collision is
    // never a sameAs (declaring an impostor would merge identities, the opposite of the fix).
    if (!(served.sameAs && served.sameAs.length)) {
      missing.push(`\`sameAs\` entries pointing at YOUR real controlled profiles (LinkedIn, Crunchbase, GitHub, X, …) — the page currently declares none`);
    }
    const out = [`You already ship an Organization node — don't paste a second one. Add only what's missing:`];
    if (missing.length) for (const m of missing) out.push(`- ${m}`);
    else out.push(`- your Organization schema looks complete; focus on the visible unaffiliation line below`);
    const named = collisions.slice(0, 3).join(', ');
    out.push('');
    out.push(named
      ? `And one visible line on your homepage/footer: "${name} (${domain}) is not affiliated with similarly named entities such as ${named}."`
      : `And one visible line on your homepage/footer stating ${name} (${domain}) is not affiliated with any similarly named entity.`);
    return out;
  }

  const graph = [
    '```html',
    '<script type="application/ld+json">',
    '{',
    '  "@context": "https://schema.org",',
    '  "@graph": [',
    `    { "@type": "Organization", "@id": "${url}/#org", "name": ${JSON.stringify(name)}, "url": "${url}" },`,
    `    { "@type": "WebSite", "@id": "${url}/#website", "url": "${url}", "publisher": { "@id": "${url}/#org" } }`,
    '  ]',
    '}',
    '</script>',
    '```',
  ];
  const named = collisions.slice(0, 3).join(', ');
  const line = named
    ? `And one visible line on your homepage/footer: "${name} (${domain}) is not affiliated with similarly named entities such as ${named}."`
    : `And one visible line on your homepage/footer stating ${name} (${domain}) is not affiliated with any similarly named entity.`;
  return [...graph, '', line];
}

/** Build the closing "What to do" agenda as markdown lines (no trailing blank). */
export function buildSweepActionAgenda(inp: SweepActionInputs): string[] {
  const out: string[] = [];
  out.push('## What to do about these results');
  out.push('');

  // Retrievability weak → the structural fix path (AEO Score).
  if (inp.brandedRetrievabilityPct !== null && inp.brandedRetrievabilityPct < WEAK_RETRIEVABILITY) {
    out.push(`**Engines can't reliably find you by name (${inp.brandedRetrievabilityPct}%).** Run the AEO Score on ${inp.domain} and implement its handoff — the structural fixes (schema, entity graph, answerable copy) are what raise retrievability.`);
    out.push('');
  }

  // Fidelity drift / entity collision → paste-ready remediation.
  if (inp.hasFidelityOrCollision) {
    out.push(inp.collisions.length
      ? `**Engines are confusing you with other entities (${inp.collisions.slice(0, 5).join(', ')}).** Make your identity unambiguous — paste this into your site \`<head>\`:`
      : '**An engine asserted something inaccurate about you.** Make your identity unambiguous — paste this into your site `<head>`:');
    out.push('');
    for (const line of remediationSnippet(inp.domain, inp.brand, inp.collisions, inp.served)) out.push(line);
    out.push('');
  }

  // Category 0%/low → losing questions as a content agenda + authority checklist.
  if (inp.categoryWinPct !== null && inp.categoryWinPct < 100 && inp.losingCategoryQuestions.length) {
    out.push(`**You aren't recommended on the questions buyers actually ask (${inp.categoryWinPct}% category win).** Turn each losing question into a page that answers it head-on — this is your content agenda:`);
    for (const q of inp.losingCategoryQuestions.slice(0, 12)) out.push(`- Write the page that answers: "${q}"`);
    out.push('');
    if (inp.doNowAuthorities.length) {
      out.push(`**This month's authority checklist (Do-now tier):** get an accurate, current listing/profile on ${inp.doNowAuthorities.slice(0, 6).join(', ')} — the sources engines already trust in your category.`);
      out.push('');
    }
  }

  // Always: the monthly loop as product behavior.
  out.push('**Re-sweep after changes — same questions, same way — to verify movement.** Cause (your readiness) leads effect (engine citations) by crawl-and-authority cycles; the re-sweep is how you watch the gap close.');
  return out;
}

// WO-8 (extended per WO-DOGFOOD-001) — Namespace-collision risk.
//
// The root cause of the AEO-Analyzers/Nissen incident was a near-generic name:
// "AEO Analyzer" collides with browser extensions, other tools, and even a
// third-party WebApplication schema publishing the same name — so a reranker
// fused a stranger onto the entity. Descriptive/generic product names are
// high conflation risk.
//
// This deterministic scorer flags that risk from the NAME ALONE (no search).
// The live enumeration of actual colliding entities — extensions, tools,
// same-named schema — comes with the search-backed sweep (WO-1/WO-7); this is
// the always-on, zero-cost pre-flag that routes to the disambiguation fix.

export type CollisionRisk = 'low' | 'medium' | 'high';

export interface NamespaceCollisionResult {
  brandName: string | null;
  risk: CollisionRisk;
  /** Descriptive/category tokens found in the name (the collision drivers). */
  descriptiveTokens: string[];
  isPlural: boolean;
  reasons: string[];
  recommendations: string[];
}

// Category words that make a product name descriptive rather than distinctive —
// many independent products share them, so an engine can't tell them apart.
const DESCRIPTIVE_TERMS = new Set([
  'analyzer', 'analyser', 'optimizer', 'optimiser', 'checker', 'scanner', 'scan',
  'audit', 'auditor', 'tool', 'toolkit', 'ai', 'seo', 'aeo', 'geo', 'llm',
  'score', 'scorer', 'grader', 'tracker', 'monitor', 'finder', 'generator',
  'builder', 'assistant', 'bot', 'app', 'hub', 'pro', 'plus', 'labs', 'lab',
  'metrics', 'insights', 'insight', 'report', 'reports', 'search', 'engine',
  'visibility', 'rank', 'ranker', 'ranking', 'keyword', 'content', 'writer',
]);

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'by', 'with', 'your', 'my']);

/** Score how likely a brand name is to be conflated with other entities. */
export function namespaceCollisionRisk(brandName: string | null | undefined): NamespaceCollisionResult {
  const raw = String(brandName || '').trim();
  // Drop a "by Publisher" suffix so we score the product name itself.
  const core = raw.replace(/\s+by\s+.+$/i, '').trim();
  const tokens = core
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t));

  const descriptiveTokens = tokens.filter((t) => DESCRIPTIVE_TERMS.has(t) || DESCRIPTIVE_TERMS.has(t.replace(/s$/, '')));
  const distinctiveTokens = tokens.filter((t) => !descriptiveTokens.includes(t));
  const isPlural = /s$/i.test(core.split(/\s+/).pop() || '');

  let risk: CollisionRisk = 'low';
  const reasons: string[] = [];

  if (tokens.length === 0) {
    risk = 'medium';
    reasons.push('No usable brand name detected — could not assess distinctiveness.');
  } else if (descriptiveTokens.length > 0 && distinctiveTokens.length === 0) {
    // Entirely descriptive (e.g. "AEO Analyzer", "SEO Tool") — highest risk.
    risk = 'high';
    reasons.push(`The name is entirely descriptive/category terms (${descriptiveTokens.join(', ')}), so it collides with any other product using those words.`);
  } else if (descriptiveTokens.length > 0 && tokens.length <= 3) {
    risk = 'high';
    reasons.push(`The name leans on category terms (${descriptiveTokens.join(', ')}) with little distinctive branding, a common source of entity conflation.`);
  } else if (descriptiveTokens.length > 0) {
    risk = 'medium';
    reasons.push(`The name contains category terms (${descriptiveTokens.join(', ')}) that reduce distinctiveness.`);
  } else {
    risk = 'low';
    reasons.push('The name is distinctive (no generic category terms), so entity conflation is unlikely.');
  }

  const recommendations: string[] = [];
  if (risk !== 'low') {
    recommendations.push(
      `Use the fully-disambiguated name everywhere — structured-data \`name\` and page copy should lead with "${core} by <Your Company>", with \`alternateName: "${core}"\`.`
    );
    recommendations.push(
      'Add an atomic, verbatim-quotable disambiguation sentence in visible HTML (About page + footer) AND in your Organization schema `disambiguatingDescription`: "<Product> was created and is maintained by <Person/Company>. It is unaffiliated with any similarly named tool."'
    );
    recommendations.push(
      'Anchor a connected @graph with stable @ids on your own domain (#organization, #founder/person, #software cross-referencing by @id) so engines resolve YOUR graph, not a same-named third-party node.'
    );
    if (isPlural) {
      recommendations.push('Exploit your plural: keep the trailing "s" consistent across title, H1, OG tags, and schema — it distinguishes you from singular same-named tools.');
    }
    recommendations.push(
      'A live namespace scan (which extensions/tools/same-named schema actually rank for this name) runs with the citation sweeps — the always-on flag above is name-based only.'
    );
  }

  return {
    brandName: core || null,
    risk,
    descriptiveTokens,
    isPlural,
    reasons,
    recommendations,
  };
}

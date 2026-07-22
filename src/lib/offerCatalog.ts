// Service-vs-architecture OfferCatalog filter (Change 3 from the brief).
//
// Fixes Failure 3 (OfferCatalog inflation): the tool turned every internal
// module name ("AI Synthesis Layer", "Sector Rotation Framework") into a
// user-facing Service offer. Shipping internal architecture as buyable services
// misrepresents the product to AI engines and can trigger schema-stuffing
// down-ranking.
//
// Rule: list only things a customer can actually buy / use / sign up for.
// Strip architecture-term offers and cap the catalog at MAX_SERVICES.

export const INTERNAL_ARCHITECTURE_PATTERNS: RegExp[] = [
  /\blayer\b/i, //   "AI Synthesis Layer"
  /\bengine\b/i, //  "Rotation Engine"
  /\bframework\b/i, // "Sector Rotation Framework"
  /\bmodel\b/i, //   "Six-Signal Model"
  /\bpipeline\b/i,
  /\bbackend\b/i,
  /\barchitecture\b/i,
  /\balgorithm\b/i,
  /\bmodule\b/i,
];

// "System" is architecture UNLESS it is part of a marketed product name like
// "Early Warning System". Treat a standalone "... System" as internal, but
// allow it when paired with a clearly user-facing qualifier.
const SYSTEM_PATTERN = /\bsystem\b/i;
const MARKETED_SYSTEM_ALLOWLIST = /\b(early warning|alert|notification|booking|reservation|support)\s+system\b/i;

export const MAX_SERVICES = 4;

export function isArchitectureTerm(name: string): boolean {
  if (!name) return false;
  if (SYSTEM_PATTERN.test(name)) {
    return !MARKETED_SYSTEM_ALLOWLIST.test(name);
  }
  return INTERNAL_ARCHITECTURE_PATTERNS.some((p) => p.test(name));
}

interface OfferLike {
  itemOffered?: { name?: string; [k: string]: any };
  name?: string;
  [k: string]: any;
}

function offerName(offer: OfferLike): string {
  return (offer?.itemOffered?.name || offer?.name || '').toString();
}

export interface OfferFilterResult<T = OfferLike> {
  kept: T[];
  removed: { name: string; reason: 'architecture' | 'over_cap' }[];
}

/**
 * Filter a list of Offer-like objects: drop architecture terms, then cap to
 * MAX_SERVICES, keeping the original order (assumed strongest-first).
 */
export function filterOffers<T extends OfferLike>(
  offers: T[],
  maxServices: number = MAX_SERVICES
): OfferFilterResult<T> {
  const kept: T[] = [];
  const removed: OfferFilterResult<T>['removed'] = [];

  for (const offer of offers) {
    const name = offerName(offer);
    if (isArchitectureTerm(name)) {
      removed.push({ name, reason: 'architecture' });
    } else {
      kept.push(offer);
    }
  }

  if (kept.length > maxServices) {
    for (const offer of kept.slice(maxServices)) {
      removed.push({ name: offerName(offer), reason: 'over_cap' });
    }
    kept.length = maxServices;
  }

  return { kept, removed };
}

/**
 * Apply the offer filter to a parsed JSON-LD object that may contain
 * `hasOfferCatalog.itemListElement`. Mutates a clone and returns it plus the
 * list of removed offer names so the report can disclose what was dropped.
 * If the JSON-LD has no recognizable offer catalog, it is returned unchanged.
 */
export function filterOfferCatalogObject(schema: any): {
  schema: any;
  removed: OfferFilterResult['removed'];
} {
  if (!schema || typeof schema !== 'object') return { schema, removed: [] };
  const clone = JSON.parse(JSON.stringify(schema));
  const removed: OfferFilterResult['removed'] = [];

  // Walk the whole tree so the filter works whether hasOfferCatalog sits at the
  // top level (legacy single-Organization block) or nested inside an @graph node
  // (the connected-graph schema the analyzer now emits).
  const visit = (node: any): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') return;

    const list: OfferLike[] | undefined = node.hasOfferCatalog?.itemListElement;
    if (Array.isArray(list)) {
      const { kept, removed: r } = filterOffers(list);
      node.hasOfferCatalog.itemListElement = kept;
      removed.push(...r);
    }

    for (const key of Object.keys(node)) {
      if (key === 'hasOfferCatalog') continue; // already handled
      visit(node[key]);
    }
  };

  visit(clone);
  return { schema: clone, removed };
}

/**
 * Parse a JSON-LD string, filter its offer catalog, and re-serialize. On parse
 * failure the original string is returned untouched (never throws).
 */
export function filterOfferCatalogString(schemaStr: string): {
  schema: string;
  removed: OfferFilterResult['removed'];
} {
  try {
    const parsed = JSON.parse(schemaStr);
    const { schema, removed } = filterOfferCatalogObject(parsed);
    return { schema: JSON.stringify(schema, null, 2), removed };
  } catch {
    return { schema: schemaStr, removed: [] };
  }
}

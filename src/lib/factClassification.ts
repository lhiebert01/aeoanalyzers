// WO-2 classification layer (per WO-DOGFOOD-001 Part C). When a fidelity check
// finds a false fact, classify WHY it's wrong — because the class determines the
// fix. A fabricated fact needs authority content; a conflation needs
// disambiguation counter-signals; a reranker merge-artifact needs disambiguation
// + propagation (there is no source to correct).

export type FalseFactClass = 'conflation' | 'reranker_conflation' | 'fabrication' | 'staleness';

export interface FactClassification {
  class: FalseFactClass;
  confidence: 'low' | 'high';
  fixPath: string;
  /** True when a definitive class needs the search-backed source-content check
   *  (fetch the cited URLs and confirm whether the false claim actually appears). */
  needsSourceContentCheck: boolean;
  rationale: string;
}

const FIX_PATHS: Record<FalseFactClass, string> = {
  conflation:
    'Disambiguation counter-signals: connected @graph with @id anchors on your domain, full "Product by Company" naming + alternateName, and an atomic unaffiliation sentence in schema + visible HTML.',
  reranker_conflation:
    'Disambiguation + propagation: the false claim is a merge artifact in no cited source, so there is nothing to correct at the source — ship the disambiguation counter-signals and force recrawl (Bing Webmaster → feeds Perplexity/ChatGPT), then re-measure.',
  fabrication:
    'Authority-content gap plan: the engine invented this with no source basis — publish authoritative first-party content stating the correct fact and earn 2–3 independent citations so engines have something to ground on.',
  staleness:
    'Recrawl / refresh: the fact was once true. Update the live page + structured data and request recrawl so the current value propagates.',
};

/**
 * Classify a false fact an engine stated.
 * - `sources`: the citation URLs the engine returned for that answer.
 * - `namedEntityDomain`: if the false value names a real third-party whose domain
 *    footprint is known (from an entity search), pass it to confirm conflation.
 * - `wasEverTrue`: caller-supplied (from history / truth-record diff) → staleness.
 */
export function classifyFalseFact(input: {
  wrong?: string;
  sources: string[];
  namedEntityDomain?: string;
  wasEverTrue?: boolean;
}): FactClassification {
  const sources = input.sources || [];

  if (input.wasEverTrue) {
    return {
      class: 'staleness',
      confidence: 'high',
      fixPath: FIX_PATHS.staleness,
      needsSourceContentCheck: false,
      rationale: 'The value was previously accurate — a refresh problem, not an invention.',
    };
  }

  if (sources.length === 0) {
    return {
      class: 'fabrication',
      confidence: 'high',
      fixPath: FIX_PATHS.fabrication,
      needsSourceContentCheck: false,
      rationale: 'The answer cited no sources, so the false fact has no source basis — a fabrication.',
    };
  }

  if (input.namedEntityDomain) {
    const d = input.namedEntityDomain.toLowerCase().replace(/^www\./, '');
    const inSources = sources.some((u) => String(u).toLowerCase().includes(d));
    if (inSources) {
      return {
        class: 'conflation',
        confidence: 'high',
        fixPath: FIX_PATHS.conflation,
        needsSourceContentCheck: false,
        rationale: `A cited source belongs to the named third party (${d}) — the engine merged a real, source-backed adjacency into your entity.`,
      };
    }
  }

  // Sources exist but none obviously belong to the named entity → likely a pure
  // reranker merge artifact. Definitive labeling needs fetching source content.
  return {
    class: 'reranker_conflation',
    confidence: 'low',
    fixPath: FIX_PATHS.reranker_conflation,
    needsSourceContentCheck: true,
    rationale: 'The false claim does not obviously trace to any cited source — likely a reranker merge artifact. Fetch the cited URLs to confirm it appears in none of them.',
  };
}

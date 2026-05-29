// Query-to-Content Gap logic (Changes 4 & 5 from the brief).
//
// Change 4 — SCHEMA_MISSING category. The old classifier conflated "no FAQPage
// schema match" with "no content". Macro Lens's "Free. Forever." pricing IS on
// the page, just not in FAQ-schema format — so it was wrongly flagged Missing
// with a "create new content" action, risking duplicate content.
//
// Change 5 — capability-scoped queries. The generator asked "do you have a
// mobile app / international markets?" about features the site doesn't offer,
// producing content-bloat recommendations. We drop queries that neither match a
// detected capability nor are universally useful.

export type GapCategory =
  | 'strong' //          answer present in both prose and structured/FAQ format
  | 'schema_only' //     answer present in prose, but NOT in FAQ schema
  | 'partial' //         some answer, but incomplete
  | 'missing'; //        answer nowhere on the site

/** Legacy answerQuality string ⇆ GapCategory bridge (back-compat with old records). */
export function categoryFromAnswerQuality(
  answerQuality: string,
  answerInSchema?: boolean
): GapCategory {
  switch (answerQuality) {
    case 'Strong':
      return answerInSchema === false ? 'schema_only' : 'strong';
    case 'Partial':
      return 'partial';
    case 'Missing':
      return 'missing';
    default:
      return 'missing';
  }
}

export function classifyGap(answerInProse: boolean, answerInSchema: boolean): GapCategory {
  if (answerInProse && answerInSchema) return 'strong';
  if (answerInProse && !answerInSchema) return 'schema_only';
  if (!answerInProse && !answerInSchema) return 'missing';
  return 'partial'; // in schema but not prose — incomplete coverage
}

/**
 * Recommendation copy per category. SCHEMA_MISSING must say "wrap existing
 * content in FAQPage schema" — NOT "create dedicated content".
 */
export function recommendationFor(category: GapCategory, sourceQuote?: string): string | null {
  switch (category) {
    case 'schema_only':
      return (
        'The answer already exists on your page' +
        (sourceQuote ? ` ("${truncate(sourceQuote, 140)}")` : '') +
        '. Wrap it in FAQPage schema so AI engines can extract it cleanly. Do NOT add new prose — the content is already there.'
      );
    case 'missing':
      return 'Create dedicated content answering this question with specific facts, data, and technical details. Add it as an FAQ entry or a standalone section on a relevant page.';
    case 'partial':
      return 'Expand existing content with additional metrics, specifications, and concrete examples. Replace vague language with measurable claims.';
    case 'strong':
    default:
      return null;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// --- Change 5: capability-scoped query filtering ---------------------------

export const UNIVERSAL_PATTERNS: RegExp[] = [
  /how much.*cost/i,
  /\bis it free\b/i,
  /\bpricing\b/i,
  /\bprice\b/i,
  /who.*(founder|founded|owns|runs|behind)/i,
  /how do (i|we|you).*(contact|reach|get in touch)/i,
  /how (often|frequently).*(update|publish|post)/i,
  /\bis.*(compliant|regulated|licensed|certified|secure)\b/i,
  /how do (i|we|you).*(sign up|subscribe|cancel|unsubscribe)/i,
  /\brefund\b/i,
  /\bsupport\b/i,
];

export function isUniversallyUsefulQuestion(query: string): boolean {
  return UNIVERSAL_PATTERNS.some((p) => p.test(query));
}

/**
 * Does the query reference a capability the site actually has? `capabilities`
 * is a list of detected capability/feature strings. Match is a loose token
 * overlap so "mobile app alerts" won't match a site whose capabilities are
 * ["daily brief", "should I worry tool"].
 */
export function mentionsCapability(query: string, capabilities: string[]): boolean {
  const q = query.toLowerCase();
  return capabilities.some((cap) => {
    const tokens = cap
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4);
    if (tokens.length === 0) return false;
    const hits = tokens.filter((t) => q.includes(t)).length;
    return hits / tokens.length >= 0.5;
  });
}

/**
 * Keep a candidate query only if it matches a detected capability OR is a
 * universally useful question. Drops "do you have <feature the site lacks>?"
 */
export function filterCandidateQueries(candidates: string[], capabilities: string[]): string[] {
  return candidates.filter(
    (q) => mentionsCapability(q, capabilities) || isUniversallyUsefulQuestion(q)
  );
}

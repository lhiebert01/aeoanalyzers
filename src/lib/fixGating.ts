// Server-side entitlement gate for the paid "fix" deliverables.
//
// WHY: the analysis LLM response contains BOTH the free diagnostic (score + gaps)
// AND the paid fixes (paste-ready schema, content rewrites, meta rewrite,
// implementation checklist). The UI blurs the fixes for free users, but a UI blur
// is NOT a control — a free user reads the full fixes in the network response.
// So `api/llm-generate` strips these fields server-side for any non-entitled
// caller BEFORE the JSON leaves the server. Paid callers (verified via the same
// Supabase JWT that `run-sweep` uses) get the full object untouched.
//
// WO-AEO-TIER-LEAK-008. The original list covered seven TOP-LEVEL keys. Every
// advanced card added to the product afterwards was gated in `AdvancedAnalysisCards`
// with `isPaid` and nowhere else, so its paid content — entity-graph fixes, the
// entity-anchored rewrites, each schema's reason/benefit, the on-page quotes to
// reuse, snippet formats, suggested headings — shipped in the clear to free users
// and was readable in DevTools and stored verbatim in their history. A QA run on
// 2026-09-19 read them straight out of the response. The rule is now: if a card
// hides it behind `isPaid`, this file removes it before the JSON leaves the server.

/** The paste-ready deliverables that are PAID-only. Everything else on the
 *  analysis object (score, summary, criteria, citationProbability, the diagnostic
 *  sub-scores) is the free diagnosis and is preserved. */
export const FIX_FIELDS = [
  'schemaSnippet',
  'verifiedSchema',
  'candidateSchema',
  'comprehensiveSchema',
  'contentRewrites',
  'metaDescriptionRewrite',
  'implementationChecklist',
  // The roadmap's step-by-step actions. `ImplementationRoadmap` renders the whole
  // component behind `isPaid`, so nothing free reads these.
  'recommendations',
] as const;

/** Redact the paid content nested INSIDE the diagnostic objects.
 *
 *  The free cards legitimately render scores, labels and — critically — the ARRAY
 *  LENGTHS that the upgrade prompts are built from ("Unlock 2 entity-anchored
 *  rewrites", "See all 3 citable sentences"). Deleting those arrays outright would
 *  close the leak and silently remove the upsell with it, so element COUNTS are
 *  preserved while element CONTENT is not.
 *
 *  Returns true when anything was removed. */
function redactNestedFixes(obj: Record<string, any>): boolean {
  let changed = false;

  /** Delete one key from an object, if present. */
  const drop = (o: any, k: string) => {
    if (o && typeof o === 'object' && k in o) {
      delete o[k];
      changed = true;
    }
  };

  /** Replace every element with an empty object: length survives, content does not. */
  const blankElements = (o: any, k: string) => {
    if (o && Array.isArray(o[k]) && o[k].length > 0) {
      o[k] = o[k].map(() => ({}));
      changed = true;
    }
  };

  /** Empty an array entirely — for arrays no free surface counts or renders. */
  const emptyArray = (o: any, k: string) => {
    if (o && Array.isArray(o[k]) && o[k].length > 0) {
      o[k] = [];
      changed = true;
    }
  };

  // Entity Graph & Portfolio — free keeps score, sameAs/founder flags, the NAP
  // note and the sameAs URL list; the portfolio-level FIXES are paid.
  emptyArray(obj.entityGraphAudit, 'recommendations');

  // Passage Extractability — free keeps the score and the guidance line. The
  // rewrites are the deliverable; the count drives "Unlock N entity-anchored rewrites".
  blankElements(obj.passageExtractability, 'pronounHeavyPassages');

  // Schema-Density Opportunities — free sees which schema TYPES are missing.
  // Why each one helps, and what it earns, is the paid half.
  if (Array.isArray(obj.schemaDensityRecommendations)) {
    for (const rec of obj.schemaDensityRecommendations) {
      drop(rec, 'reason');
      drop(rec, 'benefit');
    }
  }

  // Citation Hook Density — the free card shows the FIRST example sentence and
  // offers "See all N". Keep hook 0, blank the rest, keep the length.
  const hooks = obj.citationHookDensity?.exampleHooks;
  if (Array.isArray(hooks) && hooks.length > 1) {
    obj.citationHookDensity.exampleHooks = hooks.map((h: unknown, i: number) => (i === 0 ? h : ''));
    changed = true;
  }

  // Query-to-Content Gap — the question and its coverage category are the free
  // diagnosis. The on-page quote to reuse is explicitly sold ("and on-page quotes
  // to reuse"), and the client derives its Action line FROM that quote.
  if (Array.isArray(obj.queryContentGap?.generatedQuestions)) {
    for (const q of obj.queryContentGap.generatedQuestions) drop(q, 'sourceQuote');
  }

  // Schema provenance — the field-by-field audit trail for verifiedSchema /
  // candidateSchema, which are stripped above, and it carries `sourceQuote`
  // (exact page text). No surface renders it, paid or free; it exists so a
  // paying user can audit schema they are given. Withheld with that schema.
  emptyArray(obj, 'schemaProvenance');

  // Zero-Click / Snippet Predictor and Semantic Chunking — free keeps the score
  // and the count ("1 text block could be reformatted"); the blocks, the formats
  // and the suggested headings are paid.
  blankElements(obj.zeroClickPredictor, 'snippetOpportunities');
  blankElements(obj.semanticChunking, 'longBlocks');

  return changed;
}

/** Remove every paid fix field from an LLM JSON response string. Returns the
 *  redacted JSON when anything was present; returns the input unchanged when it
 *  is not a JSON object or contains no paid content. Never throws. */
export function redactFixFields(text: string): string {
  try {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return text;
    let changed = false;
    for (const f of FIX_FIELDS) {
      if (f in obj) { delete (obj as Record<string, unknown>)[f]; changed = true; }
    }
    if (redactNestedFixes(obj as Record<string, any>)) changed = true;
    if (!changed) return text;
    (obj as Record<string, unknown>).gated = true; // marker: fixes withheld (free tier)
    return JSON.stringify(obj);
  } catch {
    return text; // unparseable (rare — Gemini enforces JSON schema); leave as-is
  }
}

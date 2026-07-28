// Server-side entitlement gate for the paid "fix" deliverables.
//
// WHY: the analysis LLM response contains BOTH the free diagnostic (score + gaps)
// AND the paid fixes (paste-ready schema, content rewrites, meta rewrite,
// implementation checklist). The UI blurs the fixes for free users, but a UI blur
// is NOT a control — a free user reads the full fixes in the network response.
// So `api/llm-generate` strips these fields server-side for any non-entitled
// caller BEFORE the JSON leaves the server. Paid callers (verified via the same
// Supabase JWT that `run-sweep` uses) get the full object untouched.

/** The paste-ready deliverables that are PAID-only. Everything else on the
 *  analysis object (score, summary, criteria, recommendations, citationProbability,
 *  the diagnostic sub-scores) is the free diagnosis and is preserved. */
export const FIX_FIELDS = [
  'schemaSnippet',
  'verifiedSchema',
  'candidateSchema',
  'comprehensiveSchema',
  'contentRewrites',
  'metaDescriptionRewrite',
  'implementationChecklist',
] as const;

/** Remove every paid fix field from an LLM JSON response string. Returns the
 *  redacted JSON when any field was present; returns the input unchanged when it
 *  is not a JSON object or contains no fix fields. Never throws. */
export function redactFixFields(text: string): string {
  try {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return text;
    let changed = false;
    for (const f of FIX_FIELDS) {
      if (f in obj) { delete (obj as Record<string, unknown>)[f]; changed = true; }
    }
    if (!changed) return text;
    (obj as Record<string, unknown>).gated = true; // marker: fixes withheld (free tier)
    return JSON.stringify(obj);
  } catch {
    return text; // unparseable (rare — Gemini enforces JSON schema); leave as-is
  }
}
